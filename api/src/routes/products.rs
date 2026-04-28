use axum::{
    extract::{Path, State},
    Json,
};
use bson::doc;

use crate::{error::ApiError, models::{CreateProductBody, Product}, AppState};

/// GET /api/products/:section
/// Returns all menu items for the given section.
pub async fn get_products(
    Path(section): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<Vec<Product>>, ApiError> {
    let collection = state.db.collection::<bson::Document>("menu_items");

    let db_err = |e: mongodb::error::Error| ApiError::Database(e.to_string());

    let mut cursor = collection
        .find(doc! { "section": &section })
        .await
        .map_err(db_err)?;

    let mut products = Vec::new();
    while cursor.advance().await.map_err(db_err)? {
        let doc = cursor.deserialize_current().map_err(db_err)?;

        let id = doc
            .get_object_id("_id")
            .map(|oid| oid.to_hex())
            .unwrap_or_default();
        let name = doc.get_str("name").unwrap_or("").to_string();
        let description = doc.get_str("description").unwrap_or("").to_string();
        let price = doc
            .get("price")
            .and_then(|v| match v {
                bson::Bson::Double(f) => Some(*f),
                bson::Bson::Int32(i) => Some(*i as f64),
                bson::Bson::Int64(i) => Some(*i as f64),
                _ => None,
            })
            .unwrap_or(0.0);
        let section_val = doc.get_str("section").unwrap_or("").to_string();
        let subsection = doc.get_str("subsection").ok().map(|s| s.to_string());
        let customizations = doc
            .get_array("customizations")
            .map(|arr| {
                arr.iter()
                    .map(|v| bson::from_bson::<serde_json::Value>(v.clone()).unwrap_or_default())
                    .collect()
            })
            .unwrap_or_default();

        products.push(Product {
            id,
            name,
            description,
            price,
            section: section_val,
            subsection,
            customizations,
        });
    }

    Ok(Json(products))
}

/// POST /api/products
/// Creates a new menu item.
pub async fn create_product(
    State(state): State<AppState>,
    Json(body): Json<CreateProductBody>,
) -> Result<Json<Product>, ApiError> {
    let bson_customizations: Vec<bson::Bson> = body
        .customizations
        .iter()
        .map(|v| bson::to_bson(v).unwrap_or(bson::Bson::Null))
        .collect();

    let mut insert_doc = doc! {
        "name": &body.name,
        "description": body.description.as_deref().unwrap_or(""),
        "price": body.price,
        "section": &body.section,
        "customizations": bson_customizations,
    };

    if let Some(subsection) = &body.subsection {
        insert_doc.insert("subsection", subsection.as_str());
    }

    let result = state
        .db
        .collection::<bson::Document>("menu_items")
        .insert_one(insert_doc)
        .await
        .map_err(|e| ApiError::Database(e.to_string()))?;

    let id = result
        .inserted_id
        .as_object_id()
        .map(|oid| oid.to_hex())
        .unwrap_or_default();

    Ok(Json(Product {
        id,
        name: body.name,
        description: body.description.unwrap_or_default(),
        price: body.price,
        section: body.section,
        subsection: body.subsection,
        customizations: body.customizations,
    }))
}
