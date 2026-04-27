# Deliorder — Tauri + SvelteKit + Rust API

A food-order app built with Tauri, SvelteKit (static adapter / SPA mode), and a standalone Rust Axum API server.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Svelte](https://marketplace.visualstudio.com/items?itemName=svelte.svelte-vscode) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer).

## Project structure

```
deliorder/
├── api/                  # Standalone Rust API server (Axum + MongoDB)
│   ├── Cargo.toml
│   ├── .env.example
│   └── src/
│       ├── main.rs       # Entry point, server setup, AppState
│       ├── models.rs     # Shared data types (Product, OrderItem, OrderEvent)
│       ├── error.rs      # Unified API error type
│       └── routes/
│           ├── mod.rs
│           ├── products.rs   # GET /api/products/:section
│           └── orders.rs     # PATCH /api/orders/:id/items
│                             # GET  /api/orders/:id/events  (SSE)
├── src/                  # SvelteKit frontend (SPA mode for Tauri)
│   ├── lib/
│   │   └── api.ts        # Typed fetch helpers (uses VITE_API_URL)
│   └── routes/
├── src-tauri/            # Tauri shell
└── ...
```

## Running the Rust API server

### Prerequisites

- [Rust](https://rustup.rs/) 1.70+
- A running MongoDB instance (local or Atlas)

### Environment variables

| Variable      | Required | Default               | Description                        |
|---------------|----------|-----------------------|------------------------------------|
| `MONGODB_URI` | **yes**  | —                     | MongoDB connection string          |
| `PORT`        | no       | `3001`                | Port the API server listens on     |

Copy the example file and fill in your values:

```bash
cp api/.env.example api/.env
# edit api/.env
```

### Start the API

```bash
cd api
MONGODB_URI=mongodb://localhost:27017 cargo run
# or: cargo run --release
```

The server listens on **http://localhost:3001** by default.

### API endpoints

| Method  | Path                           | Description                                    |
|---------|--------------------------------|------------------------------------------------|
| `GET`   | `/api/products/:section`       | List menu items for a section                  |
| `PATCH` | `/api/orders/:id/items`        | Replace items on an order (body: `{items:[]}`) |
| `GET`   | `/api/orders/:id/events`       | SSE stream of realtime order events            |

#### SSE event shape

```json
{
  "order_id": "abc123",
  "event_type": "items_updated",
  "items": [...]
}
```

## Running the Tauri + SvelteKit frontend

```bash
# Install JS dependencies
bun install          # or: npm install

# Copy and set frontend env (API base URL)
cp .env.example .env

# Start Tauri dev mode (starts Vite dev server + Tauri window)
bun run tauri dev
```

> The frontend reads `VITE_API_URL` (default: `http://localhost:3001`) from the
> `.env` file and uses it for all API calls via `src/lib/api.ts`.

## Local development checklist

- [x] Rust API server (`api/`)
- [x] SSE realtime order events
- [x] Typed frontend API helpers (`src/lib/api.ts`)
- [ ] Replicate the full Svelte UI
- [ ] Google Sign-In integration
