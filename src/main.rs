use dotenvy::dotenv;
use mongodb::Client;
use rocket::routes;
use rocket_cors::{AllowedOrigins, CorsOptions};

use crate::models::routes::{
    DbState, add_menu_item, analytics_customizations, analytics_menu_items, analytics_sales, complete_order, confirm_order, create_order, get_completed_orders, get_menu, get_orders, health, list_users, login, profile, reset_db,
};

pub mod models;

// Config
// ---------------

const JWT_SECRET: &[u8] = b"change_this_to_an_env_var_in_production";

// Hardcoded admin for demo. In production: pull from DB, store hashed passwords.
const ADMIN_USERNAME: &str = "admin";
const ADMIN_PASSWORD: &str = "secret123"; // bcrypt this in real use

// ─── Launch ────────────────────────────────────────────────────────────────

#[rocket::main]
async fn main() -> Result<(), rocket::Error> {
    // cors

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

    // mongo db
    dotenv().ok(); // load .env file

    let client =
        Client::with_uri_str(dotenvy::var("MONGODB_URI").expect("MongoDB Uri must be set."))
            .await
            .expect("Failed to connect to MongoDB.");

    rocket::build()
        .attach(cors)
        .manage(DbState { client })
        .mount(
            "/api",
            routes![
                health,
                login,
                profile,
                list_users,
                reset_db,
                get_menu,
                create_order,
                get_orders,
                confirm_order,
                complete_order,
                add_menu_item,
                analytics_sales,
                analytics_customizations,
                analytics_menu_items,
                get_completed_orders
            ],
        )
        .launch()
        .await?;

    Ok(())
}
