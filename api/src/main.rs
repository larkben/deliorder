mod error;
mod models;
mod routes;

use std::sync::Arc;

use axum::{
    http::{HeaderValue, Method},
    routing::{get, patch, post},
    Router,
};
use mongodb::{options::ClientOptions, Client};
use tokio::sync::broadcast;
use tower_http::{
    cors::{AllowOrigin, CorsLayer},
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

use crate::models::OrderEvent;
use crate::routes::{
    orders::{create_order, list_orders, order_events, patch_order_items, patch_order_status},
    products::{create_product, get_products},
};

/// Shared application state passed to all route handlers.
#[derive(Clone)]
pub struct AppState {
    pub db: mongodb::Database,
    /// Broadcast channel for realtime order events.
    pub order_tx: Arc<broadcast::Sender<OrderEvent>>,
}

#[tokio::main]
async fn main() {
    // Initialise structured tracing (reads RUST_LOG env var).
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "deliorder_api=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // --- MongoDB ---
    let mongodb_uri = std::env::var("MONGODB_URI")
        .expect("MONGODB_URI environment variable must be set");

    let mut client_opts = ClientOptions::parse(&mongodb_uri)
        .await
        .expect("Failed to parse MONGODB_URI");
    client_opts.app_name = Some("deliorder-api".to_string());

    let client = Client::with_options(client_opts).expect("Failed to create MongoDB client");
    let db = client.database("food_order");

    tracing::info!("Connected to MongoDB (database: food_order)");

    // --- Broadcast channel for order events ---
    // Capacity of 128 means up to 128 events can be buffered for slow subscribers.
    let (order_tx, _) = broadcast::channel::<OrderEvent>(128);
    let order_tx = Arc::new(order_tx);

    let state = AppState { db, order_tx };

    // --- CORS ---
    // Allow Tauri dev origins (localhost:1420) and the Tauri production origin.
    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::predicate(|origin: &HeaderValue, _| {
            let origin_str = origin.to_str().unwrap_or("");
            origin_str.starts_with("http://localhost")
                || origin_str.starts_with("https://localhost")
                || origin_str.starts_with("tauri://")
                || origin_str.starts_with("https://tauri.localhost")
        }))
        .allow_methods([Method::GET, Method::POST, Method::PATCH, Method::OPTIONS])
        .allow_headers(tower_http::cors::Any);

    // --- Router ---
    let app = Router::new()
        .route("/api/products/{section}", get(get_products))
        .route("/api/products", post(create_product))
        .route("/api/orders", get(list_orders).post(create_order))
        .route("/api/orders/{id}/items", patch(patch_order_items))
        .route("/api/orders/{id}/status", patch(patch_order_status))
        .route("/api/orders/{id}/events", get(order_events))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    // --- Bind and serve ---
    let port: u16 = std::env::var("PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(3001);

    let listener = tokio::net::TcpListener::bind(format!("0.0.0.0:{port}"))
        .await
        .expect("Failed to bind TCP listener");

    tracing::info!("Listening on http://0.0.0.0:{port}");

    axum::serve(listener, app)
        .await
        .expect("Server error");
}
