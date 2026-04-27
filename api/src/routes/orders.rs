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
    models::{OrderEvent, OrderItem, PatchItemsBody},
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

/// PATCH /api/orders/:id/items
/// Replaces the items array of an order and broadcasts an SSE event.
pub async fn patch_order_items(
    Path(id): Path<String>,
    State(state): State<AppState>,
    Json(body): Json<PatchItemsBody>,
) -> Result<Json<serde_json::Value>, ApiError> {
    // Validate ObjectId
    let object_id = ObjectId::parse_str(&id).map_err(|_| ApiError::InvalidId)?;

    // Validate & normalise items
    let validated_items: Vec<OrderItem> = body.items.iter().map(normalize_item).collect();

    // Build BSON items array
    let bson_items: Vec<bson::Bson> = validated_items
        .iter()
        .map(|item| {
            bson::to_bson(item).unwrap_or(bson::Bson::Null)
        })
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
