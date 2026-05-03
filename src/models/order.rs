use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CustomizationOption {
    pub value: String,
    pub label: String,
    pub price: f64,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum CustomizationType {
    Single,
    Multiple,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct Customization {
    pub id: String,
    pub label: String,
    #[serde(rename = "type")]
    pub kind: CustomizationType,
    pub required: bool,
    pub options: Vec<CustomizationOption>,
}

#[derive(Debug, Deserialize, Serialize, Clone)]
#[serde(untagged)]
pub enum Selection {
    Single(String),
    Multiple(Vec<String>),
}

#[derive(Debug, Deserialize, Serialize, Clone)]
pub struct CartItem {
    pub id: String,
    pub name: String,
    pub price: f64,
    pub description: Option<String>,
    pub section: String,
    pub subsection: Option<String>,
    pub customizations: Option<Vec<Customization>>,
    pub note: Option<String>,
    pub selections: Option<HashMap<String, Selection>>,
}

// What gets stored in MongoDB
#[derive(Debug, Serialize, Deserialize)]
pub struct ValidatedItem {
    pub name: String,
    pub base_price: f64,
    pub final_price: f64,
    pub selections: HashMap<String, Selection>,
    pub note: String,
    pub section: String,
    pub subsection: Option<String>,
    #[serde(default)]
    pub completed: Option<bool>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Order {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub name: String,
    pub items: Vec<ValidatedItem>,
    pub total: f64,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: bson::DateTime,
    #[serde(rename = "updatedAt", skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<bson::DateTime>,
}

// Menu item from DB
#[derive(Debug, Serialize, Deserialize)]
pub struct MenuItem {
    #[serde(rename = "_id", skip_serializing_if = "Option::is_none")]
    pub id: Option<bson::oid::ObjectId>,
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub section: String,
    pub subsection: Option<String>,
    #[serde(rename = "createdAt", skip_serializing_if = "Option::is_none")]
    pub created_at: Option<bson::DateTime>,
    pub customizations: Option<Vec<Customization>>,
}

#[derive(Debug, Serialize)]
pub struct MenuItemResponse {
    pub id: String,
    pub name: String,
    pub description: String,
    pub price: f64,
    pub section: String,
    pub subsection: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub customizations: Vec<Customization>,
}

// order query

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderItemResponse {
    pub name: String,
    pub base_price: f64,
    pub final_price: f64,
    pub selections: HashMap<String, Selection>,
    pub note: String,
    pub section: Option<String>,
    pub subsection: Option<String>,
    pub completed: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct OrderQueryResponse {
    pub id: String,
    pub name: String,
    pub items: Vec<OrderItemResponse>,
    pub total: f64,
    pub status: String,
    pub created_at: String, // ISO string
}
