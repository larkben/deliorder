// jwt.rs

use serde::{Deserialize, Serialize};

use std::time::Duration;
use crate::JWT_SECRET;

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,   // username
    role: String,  // "admin" | "user" etc.
    exp: i64,      // unix timestamp expiry
    iat: i64,      // issued at
}
 
pub fn create_token(username: &str, role: &str) -> Result<String, jsonwebtoken::errors::Error> {
    let now = Utc::now();
    let claims = Claims {
        sub: username.to_string(),
        role: role.to_string(),
        iat: now.timestamp(),
        exp: (now + Duration::hours(8)).timestamp(),
    };
    encode(&Header::default(), &claims, &EncodingKey::from_secret(JWT_SECRET))
}
 
pub fn verify_token(token: &str) -> Result<Claims, jsonwebtoken::errors::Error> {
    let decoded = decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET),
        &Validation::default(),
    )?;
    Ok(decoded.claims)
}