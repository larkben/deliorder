use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::json;

/// Unified API error type.
#[allow(dead_code)]
pub enum ApiError {
    InvalidId,
    InvalidBody(String),
    NotFound(String),
    Database(String),
}

impl IntoResponse for ApiError {
    fn into_response(self) -> Response {
        let (status, message) = match self {
            ApiError::InvalidId => (StatusCode::BAD_REQUEST, "Invalid order ID format".to_string()),
            ApiError::InvalidBody(msg) => (StatusCode::BAD_REQUEST, msg),
            ApiError::NotFound(msg) => (StatusCode::NOT_FOUND, msg),
            ApiError::Database(msg) => {
                tracing::error!("Database error: {}", msg);
                (StatusCode::INTERNAL_SERVER_ERROR, "Internal server error".to_string())
            }
        };
        (status, axum::Json(json!({ "error": message }))).into_response()
    }
}
