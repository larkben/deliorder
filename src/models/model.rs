// models.rs

use crate::models::order::*;
use rocket::serde::json::Json;
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
