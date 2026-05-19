<script lang="ts">
    import { enhance } from "$app/forms";

    export let data;
    export let form;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    function formatDeliveryDay(order: (typeof data.orders)[number]) {
        if (!order.deliveryDayDate) {
            return order.deliveryDayLabel;
        }

        return `${order.deliveryDayLabel} · ${new Date(`${order.deliveryDayDate}T00:00:00`).toLocaleDateString()}`;
    }

    function formatSelections(selections: Record<string, string | string[]>) {
        return Object.entries(selections).flatMap(([label, value]) => {
            if (typeof value === "string" && value) {
                return [`${label}: ${value}`];
            }

            if (Array.isArray(value)) {
                return value.filter(Boolean).map((option) => `${label}: ${option}`);
            }

            return [];
        });
    }
</script>

<main class="confirmation-queue">
    <header>
        <a href="/admin" class="back-link">Back to Admin</a>
        <h1>Order Confirmation</h1>
        <p>Review new orders after payment is received, then confirm them for preparation.</p>
    </header>

    {#if form?.confirmError}
        <p class="form-error">{form.confirmError}</p>
    {/if}

    {#if form?.confirmSuccess}
        <p class="form-success">{form.confirmSuccess}</p>
    {/if}

    {#if data.orders.length === 0}
        <section class="empty-state">
            <h2>No orders waiting for confirmation</h2>
            <p>New orders will appear here before they move to the confirmed queue.</p>
        </section>
    {:else}
        <section class="order-list">
            {#each data.orders as order}
                <article class="order-card">
                    <div class="order-header">
                        <div>
                            <p class="eyebrow">{formatDeliveryDay(order)}</p>
                            <h2>{order.name}</h2>
                            {#if order.userEmail}
                                <p class="muted">{order.userEmail}</p>
                            {/if}
                        </div>
                        <div class="total">{formatCurrency(order.total)}</div>
                    </div>

                    <div class="items">
                        {#each order.items as item}
                            <div class="item-row">
                                <div>
                                    <strong>{item.name}</strong>
                                    <!-- So it's being displayed like this: 918d0fc3-defa-4ed0-b230-88a90531a846: White -->
                                    <!-- We want this: White -->
                                    <!-- The coded gibberish means nothing to our frontend user. Simplify It. -->
                                    {#each formatSelections(item.selections) as selection}
                                        <span class="selection">{selection}</span>
                                    {/each}
                                    {#if item.note}
                                        <span class="note">{item.note}</span>
                                    {/if}
                                </div>
                                <span>{formatCurrency(item.price)}</span>
                            </div>
                        {/each}
                    </div>

                    <form method="POST" action="?/confirm" use:enhance>
                        <input type="hidden" name="id" value={order.id} />
                        <button class="confirm-btn" type="submit">Confirm Payment Received</button>
                    </form>
                </article>
            {/each}
        </section>
    {/if}
</main>

<style>
    .confirmation-queue {
        max-width: 1080px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
        color: #333;
    }

    header {
        margin-bottom: 1.5rem;
    }

    h1,
    h2,
    p {
        margin: 0;
    }

    h1 {
        font-size: 2.25rem;
        margin: 0.5rem 0;
    }

    header p,
    .muted,
    .empty-state p,
    .selection,
    .note {
        color: #666;
    }

    .back-link {
        color: #e76f51;
        font-weight: 700;
        text-decoration: none;
    }

    .order-list {
        display: grid;
        gap: 1rem;
    }

    .order-card,
    .empty-state {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        padding: 1.25rem;
    }

    .order-header,
    .item-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .order-header {
        align-items: flex-start;
        border-bottom: 1px solid #eee;
        padding-bottom: 1rem;
    }

    .eyebrow {
        color: #e76f51;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .total {
        color: #2a9d8f;
        font-size: 1.4rem;
        font-weight: 800;
        white-space: nowrap;
    }

    .items {
        margin: 1rem 0;
    }

    .item-row {
        padding: 0.85rem 0;
        border-top: 1px solid #f4f4f4;
    }

    .item-row:first-child {
        border-top: none;
    }

    .item-row div {
        display: grid;
        gap: 0.25rem;
    }

    .selection,
    .note {
        font-size: 0.9rem;
    }

    .note {
        font-style: italic;
    }

    .confirm-btn {
        width: 100%;
        border: none;
        border-radius: 8px;
        background: #2a9d8f;
        color: white;
        cursor: pointer;
        font-size: 1rem;
        font-weight: 800;
        padding: 0.9rem 1rem;
    }

    .form-error,
    .form-success {
        margin-bottom: 1rem;
        font-size: 0.95rem;
    }

    .form-error {
        color: #b42318;
    }

    .form-success {
        color: #067647;
    }

    @media (max-width: 680px) {
        .order-header,
        .item-row {
            flex-direction: column;
        }
    }
</style>
