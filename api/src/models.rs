use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A product (menu item) returned by GET /api/products/:section.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Product {
    pub id: String,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub section: String,
    pub subsection: Option<String>,
    pub customizations: Vec<serde_json::Value>,
}

/// A single item within an order.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OrderItem {
    pub name: String,
    #[serde(rename = "basePrice", default)]
    pub base_price: f64,
    #[serde(rename = "finalPrice", default)]
    pub final_price: f64,
    pub price: f64,
    #[serde(default)]
    pub selections: HashMap<String, serde_json::Value>,
    #[serde(default)]
    pub note: String,
    #[serde(default)]
    pub section: String,
    #[serde(default)]
    pub subsection: String,
    #[serde(default)]
    pub completed: bool,
}

/// Request body for POST /api/products.
#[derive(Debug, Deserialize)]
pub struct CreateProductBody {
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub section: String,
    pub subsection: Option<String>,
    #[serde(default)]
    pub customizations: Vec<serde_json::Value>,
}

/// Request body for PATCH /api/orders/:id/items.
#[derive(Debug, Deserialize)]
pub struct PatchItemsBody {
    pub items: Vec<serde_json::Value>,
}

/// Request body for PATCH /api/orders/:id/status.
#[derive(Debug, Deserialize)]
pub struct PatchStatusBody {
    pub status: String,
}

/// Request body for POST /api/orders.
#[derive(Debug, Deserialize)]
pub struct CreateOrderBody {
    pub name: String,
    pub items: Vec<serde_json::Value>,
}

/// An order returned by GET /api/orders and POST /api/orders.
#[derive(Debug, Clone, Serialize)]
pub struct Order {
    pub id: String,
    pub name: String,
    pub items: Vec<OrderItem>,
    pub total: f64,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
}

/// An event broadcast when an order is updated.
#[derive(Debug, Clone, Serialize)]
pub struct OrderEvent {
    pub order_id: String,
    pub event_type: String,
    pub items: Option<Vec<OrderItem>>,
}
