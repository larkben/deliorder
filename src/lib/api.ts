/**
 * Base URL for the Deliorder Rust API server.
 * Defaults to http://localhost:3001 if VITE_API_URL is not set.
 */
export const API_URL: string =
  import.meta.env.VITE_API_URL ?? "http://localhost:3001";

/**
 * Fetch all products for a given section from the Rust API.
 */
export async function getProducts(section: string) {
  const response = await fetch(`${API_URL}/api/products/${encodeURIComponent(section)}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch products: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a new menu item via the Rust API.
 */
export async function createProduct(product: {
  name: string;
  description?: string;
  price: number;
  section: string;
  subsection?: string;
  customizations?: unknown[];
}) {
  const response = await fetch(`${API_URL}/api/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(product),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Fetch all orders from the Rust API, newest first.
 */
export async function getOrders() {
  const response = await fetch(`${API_URL}/api/orders`);
  if (!response.ok) {
    throw new Error(`Failed to fetch orders: ${response.status}`);
  }
  return response.json();
}

/**
 * Create a new order via the Rust API.
 */
export async function createOrder(name: string, items: unknown[]) {
  const response = await fetch(`${API_URL}/api/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, items }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Update the status of an order via the Rust API.
 */
export async function patchOrderStatus(orderId: string, status: "new" | "closed") {
  const response = await fetch(
    `${API_URL}/api/orders/${encodeURIComponent(orderId)}/status`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Update items on an order via the Rust API.
 */
export async function patchOrderItems(orderId: string, items: unknown[]) {
  const response = await fetch(`${API_URL}/api/orders/${encodeURIComponent(orderId)}/items`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(error.error ?? `Request failed: ${response.status}`);
  }
  return response.json();
}

/**
 * Subscribe to realtime order events via SSE.
 * Returns an EventSource. Call `.close()` when done.
 */
export function subscribeOrderEvents(
  orderId: string,
  onEvent: (event: MessageEvent) => void,
): EventSource {
  const es = new EventSource(
    `${API_URL}/api/orders/${encodeURIComponent(orderId)}/events`,
  );
  es.onmessage = onEvent;
  return es;
}
