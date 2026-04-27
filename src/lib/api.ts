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
