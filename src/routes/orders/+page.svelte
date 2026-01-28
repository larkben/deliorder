<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    export let data;
    let orders = data.orders;

    let showModal = false;
    let selectedOrder: (typeof orders)[0] | null = null;

    function openOrder(order: (typeof orders)[0]) {
        selectedOrder = order;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedOrder = null;
    }

    function resumeOrder() {
        if (!selectedOrder) return;

        localStorage.setItem(
            "active-order",
            JSON.stringify(selectedOrder.items),
        );

        goto("/order");
    }

    async function updateStatus(orderId: string, status: "new" | "closed") {
        if (!orderId) {
            console.error("Missing order id", { orderId });
            return;
        }

        console.log("updating order:", orderId); // <-- add this once

        const res = await fetch(`/api/orders/${orderId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
        });

        if (!res.ok) return;

        // Optimistic UI update
        orders = orders.map((o) => ({
            ...o,
            id: o._id.toString(),
        }));

    }
</script>

<main class="orders-page">
    <h1>Orders</h1>

    {#if orders.length === 0}
        <p class="empty">No orders yet</p>
    {:else}
        <div class="orders-grid">
            {#each orders as order}
                <div class="order-row">
                    <!-- Order card -->
                    <button
                        type="button"
                        class="order-card"
                        on:click={() => openOrder(order)}
                    >
                        <span class="order-card-left">
                            <strong>
                                {new Date(order.createdAt).toLocaleString()}
                            </strong>
                            <span class="order-meta">
                                {order.items.length} items · ${order.total.toFixed(2)}
                            </span>
                        </span>

                        <span class="order-status">
                            {order.status}
                        </span>
                    </button>

                    <!-- Status toggle (separate button) -->
                    <button
                        type="button"
                        class="status-toggle {order.status}"
                        aria-label="Toggle order status"
                        on:click={() =>
                            updateStatus(
                                order._id,
                                order.status === "new" ? "closed" : "new"
                            )
                        }
                    >
                        {#if order.status === "new"}
                            ✓
                        {:else}
                            ↺
                        {/if}
                    </button>
                </div>
            {/each}
        </div>
    {/if}

    {#if showModal && selectedOrder}
        <button
            class="modal-backdrop"
            on:click={closeModal}
            type="button"
            aria-label="Close modal"
        ></button>

        <div class="modal">
            <h2>Order Details</h2>

            <div class="modal-items">
                {#each selectedOrder.items as item}
                    <div class="modal-item">
                        <strong>{item.name}</strong>
                        {#if item.description}
                            <p>{item.description}</p>
                        {/if}
                        {#if item.note}
                            <p class="note">📝 {item.note}</p>
                        {/if}
                        <span>${item.price.toFixed(2)}</span>
                    </div>
                {/each}
            </div>

            <div class="modal-total">
                Total: <strong>${selectedOrder.total.toFixed(2)}</strong>
            </div>

            <div class="modal-actions">
                <button on:click={resumeOrder}>Resume Order</button>
                <button on:click={closeModal}>Close</button>
            </div>
        </div>
    {/if}
</main>

<style>
    /* Grid of orders */
    .orders-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.5rem;
    }

    .order-row {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .order-card {
        flex: 1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        border-radius: 12px;
        background: #fff9f0;
        border: 2px solid #d2b48c;
    }

    .order-status {
        font-size: 0.75rem;
        text-transform: uppercase;
        font-weight: bold;
    }

    .status-toggle {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        font-weight: bold;
        font-size: 1rem;
    }

    .status-toggle.new {
        background: #2e7d32;
        color: white;
    }

    .status-toggle.closed {
        background: #999;
        color: white;
    }

    /* Individual order card */
    .order-card {
        background: #fff9f0;
        padding: 1.5rem;
        border-radius: 12px;
        border: 3px solid #d2b48c;
        box-shadow: 0 6px 15px rgba(139, 69, 19, 0.15);
        display: flex;
        justify-content: space-between;
        align-items: center;
        cursor: pointer;
        transition:
            transform 0.2s ease,
            box-shadow 0.2s ease;
    }

    .order-card-right {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .status-badge {
        padding: 0.25rem 0.5rem;
        border-radius: 12px;
        font-size: 0.75rem;
        font-weight: bold;
        text-transform: uppercase;
    }

    .status-badge.new {
        background: #ffe6f3;
        color: #9f30c0;
    }

    .status-badge.closed {
        background: #e6f4ea;
        color: #2e7d32;
    }

    .status-action {
        background: #2e7d32;
        color: white;
        border-radius: 50%;
        width: 28px;
        height: 28px;
        font-size: 1rem;
        line-height: 1;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .order-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 20px rgba(139, 69, 19, 0.25);
    }

    .order-card strong {
        color: #5d3a1a;
    }

    .order-meta {
        font-size: 0.9rem;
        color: #6b4423;
    }

    /* Modal backdrop */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        z-index: 50;
    }

    /* Modal window */
    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff9f0;
        padding: 2rem;
        border-radius: 12px;
        border: 3px solid #d2b48c;
        box-shadow: 0 10px 25px rgba(139, 69, 19, 0.25);
        z-index: 100;
        max-width: 600px;
        width: 90%;
    }

    /* Modal items */
    .modal-items {
        margin-top: 1rem;
        max-height: 300px;
        overflow-y: auto;
    }

    .modal-item {
        border-bottom: 1px solid #d2b48c;
        padding: 0.5rem 0;
        display: flex;
        justify-content: space-between;
        flex-direction: column;
    }

    .modal-item .note {
        font-style: italic;
        font-size: 0.85rem;
        color: #8b6914;
    }

    /* Modal total and actions */
    .modal-total {
        margin-top: 1rem;
        font-size: 1.2rem;
        font-weight: bold;
        color: #5d3a1a;
    }

    .modal-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1rem;
    }

    .modal-actions button {
        flex: 1;
        padding: 0.75rem;
        border-radius: 6px;
        border: none;
        background: #8b4513;
        color: white;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.3s ease;
    }

    .modal-actions button:hover {
        background: #5d3a1a;
    }

    .empty {
        text-align: center;
        margin-top: 2rem;
        font-style: italic;
        color: #a0826d;
    }

    .orders-page {
        padding: 2rem;
        background: linear-gradient(135deg, #f4e8d8 0%, #e8d5c4 100%);
        min-height: 100vh;
        font-family: "Georgia", serif;
    }

    .orders-page h1 {
        font-size: 2rem;
        color: #5d3a1a;
        font-weight: bold;
        margin-bottom: 1.5rem;
        border-bottom: 3px solid #8b4513;
        padding-bottom: 0.75rem;
    }
</style>
