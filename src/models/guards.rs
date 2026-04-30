// guards.rs

use rocket::{http::Status};
use rocket::request::{self, Request, FromRequest};
use rocket::outcome::Outcome;

use crate::models::jwt::*;

/// Attach this to any route that requires a valid JWT.
pub struct AuthenticatedUser {
    pub username: String,
    pub role: String,
}
 
/// Stricter guard — role must be "admin".
pub struct AdminUser(pub AuthenticatedUser);
 
#[rocket::async_trait]
impl<'r> FromRequest<'r> for AuthenticatedUser {
    type Error = &'static str;
 
    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let auth_header = req.headers().get_one("Authorization");
 
        match auth_header {
            Some(header) if header.starts_with("Bearer ") => {
                let token = &header[7..];
                match verify_token(token) {
                    Ok(claims) => Outcome::Success(AuthenticatedUser {
                        username: claims.sub,
                        role: claims.role,
                    }),
                    Err(_) => Outcome::Error((Status::Unauthorized, "Invalid or expired token")),
                }
            }
            _ => Outcome::Error((Status::Unauthorized, "Missing Authorization header")),
        }
    }
}
 
#[rocket::async_trait]
impl<'r> FromRequest<'r> for AdminUser {
    type Error = &'static str;
 
    async fn from_request(req: &'r Request<'_>) -> request::Outcome<Self, Self::Error> {
        let user = AuthenticatedUser::from_request(req).await;
        match user {
            Outcome::Success(u) if u.role == "admin" => Outcome::Success(AdminUser(u)),
            Outcome::Success(_) => Outcome::Error((Status::Forbidden, "Admin role required")),
            Outcome::Error(e) => Outcome::Error(e),
            Outcome::Forward(f) => Outcome::Forward(f),
        }
    }
}