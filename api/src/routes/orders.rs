use axum::{
    extract::{Path, State},
    response::sse::{Event, KeepAlive, Sse},
    Json,
};
use bson::{doc, oid::ObjectId};
use futures::Stream;
use std::convert::Infallible;
use tokio_stream::{wrappers::BroadcastStream, StreamExt};

use crate::{
    error::ApiError,
    models::{CreateOrderBody, Order, OrderEvent, OrderItem, PatchItemsBody, PatchStatusBody},
    AppState,
};

/// Extract a price field by trying a list of field names in order.
fn extract_price(item: &serde_json::Value, fields: &[&str]) -> f64 {
    fields
        .iter()
        .find_map(|&key| item.get(key).and_then(|v| v.as_f64()))
        .unwrap_or(0.0)
}

/// Normalise a raw JSON item into a typed `OrderItem`.
fn normalize_item(item: &serde_json::Value) -> OrderItem {
    OrderItem {
        name: item.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        base_price: extract_price(item, &["basePrice", "price"]),
        final_price: extract_price(item, &["finalPrice", "price"]),
        price: extract_price(item, &["price", "finalPrice", "basePrice"]),
        selections: item
            .get("selections")
            .and_then(|v| v.as_object())
            .map(|m| m.iter().map(|(k, v)| (k.clone(), v.clone())).collect())
            .unwrap_or_default(),
        note: item.get("note").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        section: item.get("section").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        subsection: item.get("subsection").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        completed: item.get("completed").and_then(|v| v.as_bool()).unwrap_or(false),
    }
}

/// Convert a BSON document for an order into the `Order` response type.
fn doc_to_order(doc: &bson::Document) -> Order {
    let id = doc
        .get_object_id("_id")
        .map(|oid| oid.to_hex())
        .unwrap_or_default();

    let name = doc.get_str("name").unwrap_or("").to_string();

    let items: Vec<OrderItem> = doc
        .get_array("items")
        .unwrap_or(&bson::Array::new())
        .iter()
        .filter_map(|v| bson::from_bson::<OrderItem>(v.clone()).ok())
        .collect();

    let total = match doc.get("total") {
        Some(bson::Bson::Double(f)) => *f,
        Some(bson::Bson::Int32(i)) => *i as f64,
        Some(bson::Bson::Int64(i)) => *i as f64,
        _ => 0.0,
    };

    let status = doc.get_str("status").unwrap_or("new").to_string();

    let created_at = doc
        .get_datetime("createdAt")
        .map(|dt| {
            chrono::DateTime::<chrono::Utc>::from(
                std::time::SystemTime::UNIX_EPOCH
                    + std::time::Duration::from_millis(dt.timestamp_millis() as u64),
            )
            .to_rfc3339()
        })
        .unwrap_or_default();

    Order { id, name, items, total, status, created_at }
}

/// GET /api/orders
/// Returns all orders sorted newest first.
pub async fn list_orders(
    State(state): State<AppState>,
) -> Result<Json<Vec<Order>>, ApiError> {
    let db_err = |e: mongodb::error::Error| ApiError::Database(e.to_string());

    let mut cursor = state
        .db
        .collection::<bson::Document>("orders")
        .find(doc! {})
        .sort(doc! { "createdAt": -1 })
        .await
        .map_err(db_err)?;

    let mut orders = Vec::new();
    while cursor.advance().await.map_err(db_err)? {
        let doc = cursor.deserialize_current().map_err(db_err)?;
        orders.push(doc_to_order(&doc));
    }

    Ok(Json(orders))
}

/// POST /api/orders
/// Creates a new order and returns it.
pub async fn create_order(
    State(state): State<AppState>,
    Json(body): Json<CreateOrderBody>,
) -> Result<Json<Order>, ApiError> {
    let validated_items: Vec<OrderItem> = body.items.iter().map(normalize_item).collect();

    let total: f64 = validated_items.iter().map(|i| i.final_price).sum();

    let bson_items: Vec<bson::Bson> = validated_items
        .iter()
        .map(|item| bson::to_bson(item).unwrap_or(bson::Bson::Null))
        .collect();

    let now = bson::DateTime::now();
    let insert_doc = doc! {
        "name": &body.name,
        "items": bson_items,
        "total": total,
        "status": "new",
        "createdAt": now,
    };

    let result = state
        .db
        .collection::<bson::Document>("orders")
        .insert_one(insert_doc)
        .await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    let inserted_id = result
        .inserted_id
        .as_object_id()
        .map(|oid| oid.to_hex())
        .unwrap_or_default();

    let created_at = chrono::DateTime::<chrono::Utc>::from(
        std::time::SystemTime::UNIX_EPOCH
            + std::time::Duration::from_millis(now.timestamp_millis() as u64),
    )
    .to_rfc3339();

    Ok(Json(Order {
        id: inserted_id,
        name: body.name,
        items: validated_items,
        total,
        status: "new".to_string(),
        created_at,
    }))
}

/// PATCH /api/orders/:id/status
/// Updates the status of an order.
pub async fn patch_order_status(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(body): Json<PatchStatusBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let valid_statuses = ["new", "closed"];
    if !valid_statuses.contains(&body.status.as_str()) {
        return Err(ApiError::InvalidBody(format!(
            "Invalid status '{}'. Must be one of: {}",
            body.status,
            valid_statuses.join(", ")
        )));
    }

    let object_id = ObjectId::parse_str(&id).map_err(|_| ApiError::InvalidId)?;

    let now = bson::DateTime::now();
    let result = state
        .db
        .collection::<bson::Document>("orders")
        .update_one(
            doc! { "_id": object_id },
            doc! { "$set": { "status": &body.status, "updatedAt": now } },
        )
        .await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    if result.matched_count == 0 {
        return Err(ApiError::NotFound("Order not found".to_string()));
    }

    Ok(Json(serde_json::json!({ "success": true, "status": body.status })))
}

/// PATCH /api/orders/:id/items
/// Replaces the items array of an order and broadcasts an SSE event.
pub async fn patch_order_items(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(body): Json<PatchItemsBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    let object_id = ObjectId::parse_str(&id).map_err(|_| ApiError::InvalidId)?;

    let validated_items: Vec<OrderItem> = body.items.iter().map(normalize_item).collect();

    let bson_items: Vec<bson::Bson> = validated_items
        .iter()
        .map(|item| bson::to_bson(item).unwrap_or(bson::Bson::Null))
        .collect();

    let now = bson::DateTime::now();
    let result = state
        .db
        .collection::<bson::Document>("orders")
        .update_one(
            doc! { "_id": object_id },
            doc! { "$set": { "items": bson_items, "updatedAt": now } },
        )
        .await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    if result.matched_count == 0 {
        return Err(ApiError::NotFound("Order not found".to_string()));
    }

    // Broadcast order update event (best-effort, ignore if no subscribers)
    let event = OrderEvent {
        order_id: id.clone(),
        event_type: "items_updated".to_string(),
        items: Some(validated_items.clone()),
    };
    let _ = state.order_tx.send(event);

    Ok(Json(serde_json::json!({
        "success": true,
        "items": validated_items,
    })))
}

/// GET /api/orders/:id/events
/// Returns an SSE stream of order update events for the given order ID.
pub async fn order_events(
    Path(id): Path<String>,
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = Result<Event, Infallible>>> {
    let rx = state.order_tx.subscribe();
    let id_clone = id.clone();

    let stream = BroadcastStream::new(rx)
        .filter_map(move |result| {
            let order_id = id_clone.clone();
            match result {
                Ok(event) if event.order_id == order_id => {
                    let data = serde_json::to_string(&event).unwrap_or_default();
                    Some(Ok(Event::default().data(data)))
                }
                _ => None,
            }
        });

    Sse::new(stream).keep_alive(KeepAlive::default())
}
