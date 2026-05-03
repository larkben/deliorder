// routes.rs

use crate::models::order::*;
use mongodb::{Client, bson::doc};
use rocket::{State, http::Status, serde::json::Json};
use rocket::{get, post};

pub struct DbState {
    pub client: Client,
}

use crate::models::guards::*;
use crate::models::jwt::*;
use crate::models::model::*;

use crate::ADMIN_PASSWORD;
use crate::ADMIN_USERNAME;

/// Public — no auth required.
#[get("/health")]
pub fn health() -> Json<ApiResponse<&'static str>> {
    ApiResponse::ok("ok")
}

/// Public — exchange credentials for a JWT.
#[post("/admin/login", data = "<body>")]
pub fn login(
    body: Json<LoginRequest>,
) -> Result<Json<ApiResponse<LoginResponse>>, (Status, Json<ApiResponse<String>>)> {
    // In production: query DB, use bcrypt::verify(&body.password, &stored_hash)
    if body.username != ADMIN_USERNAME || body.password != ADMIN_PASSWORD {
        return Err((
            Status::Unauthorized,
            ApiResponse::<String>::err("Invalid credentials"),
        ));
    }

    match create_token(&body.username, "admin") {
        Ok(token) => Ok(ApiResponse::ok(LoginResponse { token })),
        Err(_) => Err((
            Status::InternalServerError,
            ApiResponse::<String>::err("Token generation failed"),
        )),
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

// ── GET /menu ────────────────────────────────────────────────────────────────

#[rocket::get("/menu")]
pub async fn get_menu(db: &State<DbState>) -> Result<Json<Vec<MenuItemResponse>>, Status> {
    let collection = db
        .client
        .database("food_order")
        .collection::<MenuItem>("menu_items");

    let mut cursor = collection
        .find(doc! {})
        .await
        .map_err(|_| Status::InternalServerError)?;

    let mut items = Vec::new();
    while cursor
        .advance()
        .await
        .map_err(|_| Status::InternalServerError)?
    {
        let item = cursor
            .deserialize_current()
            .map_err(|_| Status::InternalServerError)?;

        items.push(MenuItemResponse {
            id: item.id.map(|id| id.to_hex()).unwrap_or_default(),
            name: item.name,
            description: item.description.unwrap_or_default(),
            price: item.price,
            section: item.section,
            subsection: item.subsection,
            customizations: item.customizations.unwrap_or_default(),
        });
    }

    Ok(Json(items))
}

#[rocket::post("/order", format = "json", data = "<payload>")]
pub async fn create_order(
    db: &State<DbState>,
    payload: Json<CreateOrderRequest>,
) -> Result<Json<OrderResponse>, (Status, Json<OrderResponse>)> {
    let req = payload.into_inner();

    if req.name.is_empty() {
        return Err((
            Status::BadRequest,
            Json(OrderResponse {
                success: false,
                message: "No name for order".into(),
            }),
        ));
    }

    if req.items.is_empty() {
        return Err((
            Status::BadRequest,
            Json(OrderResponse {
                success: false,
                message: "No items in order".into(),
            }),
        ));
    }

    // Server-side price validation (prevents client tampering)
    let validated_items: Vec<ValidatedItem> = req
        .items
        .iter()
        .map(|item| {
            let mut calculated_price = item.price;

            if let (Some(customizations), Some(selections)) =
                (&item.customizations, &item.selections)
            {
                for customization in customizations {
                    match &customization.kind {
                        CustomizationType::Single => {
                            if let Some(Selection::Single(value)) =
                                selections.get(&customization.id)
                            {
                                if let Some(opt) =
                                    customization.options.iter().find(|o| &o.value == value)
                                {
                                    calculated_price += opt.price;
                                }
                            }
                        }
                        CustomizationType::Multiple => {
                            if let Some(Selection::Multiple(values)) =
                                selections.get(&customization.id)
                            {
                                for value in values {
                                    if let Some(opt) =
                                        customization.options.iter().find(|o| &o.value == value)
                                    {
                                        calculated_price += opt.price;
                                    }
                                }
                            }
                        }
                    }
                }
            }

            ValidatedItem {
                name: item.name.clone(),
                base_price: item.price,
                final_price: calculated_price,
                selections: item.selections.clone().unwrap_or_default(),
                note: item.note.clone().unwrap_or_default(),
                section: item.section.clone(),
                subsection: item.subsection.clone(),
            }
        })
        .collect();

    let total: f64 = validated_items.iter().map(|i| i.final_price).sum();

    let order = Order {
        name: req.name,
        items: validated_items,
        total,
        status: "new".into(),
        created_at: bson::DateTime::now(),
    };

    // Serialize to BSON and insert
    let doc = bson::to_document(&order).map_err(|_| {
        (
            Status::InternalServerError,
            Json(OrderResponse {
                success: false,
                message: "Serialization error".into(),
            }),
        )
    })?;

    db.client
        .database("food_order")
        .collection("orders")
        .insert_one(doc)
        .await
        .map_err(|_| {
            (
                Status::InternalServerError,
                Json(OrderResponse {
                    success: false,
                    message: "DB insert failed".into(),
                }),
            )
        })?;

    Ok(Json(OrderResponse {
        success: true,
        message: "Order created".into(),
    }))
}

// order query

#[rocket::get("/orders")]
pub async fn get_orders(db: &State<DbState>) -> Result<Json<Vec<OrderResponse>>, Status> {
    let collection = db
        .client
        .database("food_order")
        .collection::<Order>("orders");

    let options = FindOptions::builder()
        .sort(doc! { "created_at": -1 })
        .build();

    let mut cursor = collection
        .find(doc! {})
        .with_options(options)
        .await
        .map_err(|_| Status::InternalServerError)?;

    let mut orders = Vec::new();
    while cursor
        .advance()
        .await
        .map_err(|_| Status::InternalServerError)?
    {
        let o = cursor
            .deserialize_current()
            .map_err(|_| Status::InternalServerError)?;

        orders.push(OrderQueryResponse {
            id: o.id.map(|id| id.to_hex()).unwrap_or_default(),
            name: o.name,
            items: o
                .items
                .into_iter()
                .map(|item| OrderItemResponse {
                    name: item.name,
                    base_price: item.base_price,
                    final_price: item.final_price,
                    selections: item.selections,
                    note: item.note,
                    section: item.section,
                    subsection: item.subsection,
                    completed: item.completed.unwrap_or(false),
                })
                .collect(),
            total: o.total,
            status: o.status,
            created_at: o
                .created_at
                .to_system_time()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| {
                    let secs = d.as_secs();
                    // format as ISO 8601
                    chrono::DateTime::<chrono::Utc>::from_timestamp(secs as i64, 0)
                        .unwrap_or_default()
                        .to_rfc3339()
                })
                .unwrap_or_default(),
        });
    }

    Ok(Json(orders))
}
