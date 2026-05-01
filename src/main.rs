use rocket::{launch, routes};
use rocket_cors::{CorsOptions, AllowedOrigins};

use crate::models::routes::{health, login, profile, list_users, reset_db};

pub mod models;

// Config
// ---------------

const JWT_SECRET: &[u8] = b"change_this_to_an_env_var_in_production";
 
// Hardcoded admin for demo. In production: pull from DB, store hashed passwords.
const ADMIN_USERNAME: &str = "admin";
const ADMIN_PASSWORD: &str = "secret123"; // bcrypt this in real use

// ─── Launch ────────────────────────────────────────────────────────────────
 
#[launch]
fn rocket() -> _ {
    let cors = CorsOptions {
        allowed_origins: AllowedOrigins::all(), // tighten this later
        allowed_methods: vec!["GET", "POST", "OPTIONS"]
            .into_iter()
            .map(|m| m.parse().unwrap())
            .collect(),
        allowed_headers: rocket_cors::AllowedHeaders::all(),
        allow_credentials: true,
        ..Default::default()
    }
    .to_cors()
    .unwrap();

    rocket::build()
    .attach(cors)
    .mount("/api", routes![
        health,
        login,
        profile,
        list_users,
        reset_db,
    ])
}