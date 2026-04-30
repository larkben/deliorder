// routes.rs

use rocket::{post, get, http::Status, serde::json::Json};

use crate::models::model::*;
use crate::models::jwt::*;
use crate::models::guards::*;

use crate::ADMIN_USERNAME;
use crate::ADMIN_PASSWORD;



/// Public — no auth required.
#[get("/health")]
pub fn health() -> Json<ApiResponse<&'static str>> {
    ApiResponse::ok("ok")
}
 
/// Public — exchange credentials for a JWT.
#[post("/admin/login", data = "<body>")]
pub fn login(body: Json<LoginRequest>) -> Result<Json<ApiResponse<LoginResponse>>, (Status, Json<ApiResponse<String>>)> {
    // In production: query DB, use bcrypt::verify(&body.password, &stored_hash)
    if body.username != ADMIN_USERNAME || body.password != ADMIN_PASSWORD {
        return Err((Status::Unauthorized, ApiResponse::err("Invalid credentials")));
    }
 
    match create_token(&body.username, "admin") {
        Ok(token) => Ok(ApiResponse::ok(LoginResponse { token })),
        Err(_) => Err((Status::InternalServerError, ApiResponse::err("Token generation failed"))),
    }
}
 
/// Protected — any valid JWT.
#[get("/profile")]
pub fn profile(user: AuthenticatedUser) -> Json<ApiResponse<String>> {
    ApiResponse::ok(format!("Hello, {}! Role: {}", user.username, user.role))
}
 
/// Protected — admin role only.
#[get("/admin/users")]
pub fn list_users(_admin: AdminUser) -> Json<ApiResponse<Vec<&'static str>>> {
    // Replace with real DB query
    ApiResponse::ok(vec!["alice", "bob", "charlie"])
}
 
/// Protected — admin role only.
#[post("/admin/reset-db")]
pub fn reset_db(_admin: AdminUser) -> Json<ApiResponse<&'static str>> {
    // Dangerous op — gated behind admin guard
    ApiResponse::ok("DB reset triggered")
}