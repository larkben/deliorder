// models.rs

use crate::models::order::*;
use rocket::serde::json::Json;
use rocket::form::FromForm;
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Serialize)]
pub struct LoginResponse {
    pub token: String,
}

#[derive(Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub success: bool,
    pub data: Option<T>,
    pub error: Option<String>,
}

impl<T: Serialize> ApiResponse<T> {
    pub fn ok(data: T) -> Json<Self> {
        Json(Self {
            success: true,
            data: Some(data),
            error: None,
        })
    }
    pub fn err(msg: &str) -> Json<ApiResponse<String>> {
        Json(ApiResponse {
            success: false,
            data: None,
            error: Some(msg.to_string()),
        })
    }
}

// Menu / Order models

#[derive(Debug, Deserialize)]
pub struct CreateOrderRequest {
    pub name: String,
    pub items: Vec<CartItem>,
}

#[derive(Debug, Serialize)]
pub struct OrderResponse {
    pub success: bool,
    pub message: String,
}

#[derive(Debug, Deserialize)]
pub struct StatusUpdateRequest {
    pub status: String,
}

#[derive(Debug, Deserialize)]
pub struct CreateMenuItemRequest {
    pub name: String,
    pub description: Option<String>,
    pub price: f64,
    pub section: String,
    pub subsection: Option<String>,
    pub customizations: Option<Vec<Customization>>,
}

#[derive(Debug, FromForm)]
pub struct OrderQueryFilter {
    pub date_from: Option<String>,
    pub date_to: Option<String>,
}

// Analytics Response Models

#[derive(Debug, Serialize)]
pub struct SalesData {
    pub date: String,
    pub total_sales: f64,
    pub order_count: u32,
    pub average_order_value: f64,
}

#[derive(Debug, Serialize)]
pub struct SalesAnalytics {
    pub total_sales: f64,
    pub total_orders: u32,
    pub average_order_value: f64,
    pub daily_sales: Vec<SalesData>,
}

#[derive(Debug, Serialize)]
pub struct CustomizationPopularity {
    pub customization_id: String,
    pub customization_label: String,
    pub times_selected: u32,
    pub most_popular_option: String,
}

#[derive(Debug, Serialize)]
pub struct MenuItemPopularity {
    pub item_name: String,
    pub times_ordered: u32,
    pub total_revenue: f64,
    pub average_final_price: f64,
}

#[derive(Debug, Serialize)]
pub struct OrderDetails {
    pub id: String,
    pub name: String,
    pub items: Vec<OrderItemResponse>,
    pub total: f64,
    pub status: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}
