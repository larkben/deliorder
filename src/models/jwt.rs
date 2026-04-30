// jwt.rs

use serde::{Deserialize, Serialize};

use chrono::{Utc, Duration};
use jsonwebtoken::{encode, decode, Header, EncodingKey, DecodingKey, Validation};
use crate::JWT_SECRET;

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,   // username
    pub role: String,  // "admin" | "user" etc.
    pub exp: i64,      // unix timestamp expiry
    pub iat: i64,      // issued at
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