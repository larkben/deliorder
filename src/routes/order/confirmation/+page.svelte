<script lang="ts">
    import { formatDisplaySelections, selectionText } from "$lib/orderDisplay";

    export let data: any;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    function itemSelections(item: NonNullable<typeof data.order>["items"][number]) {
        return formatDisplaySelections(item.displaySelections, item.selections).map(selectionText);
    }
</script>

<main class="confirmation-page">
    {#if data.order}
        <section class="confirmation">
            <p class="eyebrow">Order Confirmed</p>
            <h1>Thanks, {data.order.name}</h1>
            <p class="message">Your order was sent to the deli counter.</p>

            <div class="summary">
                <div>
                    <span>Name</span>
                    <strong>{data.order.name}</strong>
                </div>
                {#if data.order.userEmail}
                    <div>
                        <span>Email</span>
                        <strong>{data.order.userEmail}</strong>
                    </div>
                {/if}
                <div>
                    <span>Order Number</span>
                    <strong>{data.order.id.slice(-6).toUpperCase()}</strong>
                </div>
                <div>
                    <span>Total</span>
                    <strong>{formatCurrency(data.order.total)}</strong>
                </div>
                <div>
                    <span>Status</span>
                    <strong>{data.order.status}</strong>
                </div>
                <div>
                    <span>Delivery Day</span>
                    <strong>
                        {data.order.deliveryDayLabel}
                        {#if data.order.deliveryDayDate}
                            · {new Date(`${data.order.deliveryDayDate}T00:00:00`).toLocaleDateString()}
                        {/if}
                    </strong>
                </div>
            </div>

            <div class="items">
                <h2>Items</h2>
                {#each data.order.items as item}
                    <div class="item-row">
                        <div>
                            <strong>{item.name}</strong>
                            {#each itemSelections(item) as selection}
                                <span>{selection}</span>
                            {/each}
                            {#if item.note}
                                <span>{item.note}</span>
                            {/if}
                        </div>
                        <span>{formatCurrency(item.price)}</span>
                    </div>
                {/each}
            </div>

            <div class="confirmation-actions">
                <a class="secondary-link" href="/order">Back to Menu</a>
                <a class="primary-link" href="/order">Start Another Order</a>
            </div>
        </section>
    {:else}
        <section class="confirmation">
            <p class="eyebrow">Order Status</p>
            <h1>We could not find that order</h1>
            <p class="message">The confirmation link may be missing its order number.</p>
            <div class="confirmation-actions">
                <a class="primary-link" href="/order">Back to Menu</a>
            </div>
        </section>
    {/if}
</main>

<style>
    .confirmation-page {
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 2rem 1.5rem;
        color: #333;
    }

    .confirmation {
        width: min(640px, 100%);
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
        padding: 2rem;
    }

    h1,
    h2,
    p {
        margin: 0;
    }

    h1 {
        font-size: 2.25rem;
        margin-top: 0.25rem;
    }

    h2 {
        font-size: 1.2rem;
        margin-bottom: 0.75rem;
    }

    .eyebrow {
        color: #e76f51;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .message {
        color: #666;
        margin-top: 0.75rem;
    }

    .summary {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 0.75rem;
        margin: 1.5rem 0;
    }

    .summary div {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 1rem;
    }

    .summary span,
    .item-row span {
        color: #666;
        font-size: 0.9rem;
    }

    .summary strong {
        display: block;
        margin-top: 0.25rem;
        font-size: 1.1rem;
    }

    .items {
        border-top: 1px solid #eee;
        padding-top: 1rem;
        margin-bottom: 1.5rem;
    }

    .item-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.75rem 0;
        border-top: 1px solid #f0f0f0;
    }

    .item-row div {
        display: grid;
        gap: 0.25rem;
    }

    .confirmation-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 0.75rem;
    }

    .primary-link,
    .secondary-link {
        display: inline-block;
        padding: 0.85rem 1.25rem;
        border-radius: 8px;
        font-weight: 700;
        text-decoration: none;
    }

    .primary-link {
        background: #e76f51;
        color: white;
    }

    .secondary-link {
        background: #f8f9fa;
        border: 1px solid #ddd;
        color: #333;
    }

    @media (max-width: 640px) {
        .summary {
            grid-template-columns: 1fr;
        }

        .primary-link,
        .secondary-link {
            text-align: center;
            width: 100%;
        }
    }
</style>
