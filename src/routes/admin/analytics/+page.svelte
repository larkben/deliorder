<script lang="ts">
    export let data;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
</script>

<main class="analytics-page">
    <header>
        <a href="/admin" class="back-link">Back to Admin</a>
        <h1>Order Analytics</h1>
    </header>

    <section class="stats-grid">
        <div class="stat">
            <span>Revenue</span>
            <strong>{formatCurrency(data.summary.totalRevenue)}</strong>
        </div>
        <div class="stat">
            <span>Orders</span>
            <strong>{data.summary.orderCount}</strong>
        </div>
        <div class="stat">
            <span>Average Order</span>
            <strong>{formatCurrency(data.summary.averageOrderValue)}</strong>
        </div>
        <div class="stat">
            <span>New / Confirmed / Complete</span>
            <strong>{data.summary.activeOrders} / {data.summary.confirmedOrders} / {data.summary.completedOrders}</strong>
        </div>
    </section>

    <section class="content-grid">
        <div class="panel">
            <h2>Orders by Delivery Day</h2>
            {#if data.deliveryDayTotals.length === 0}
                <p class="empty">No delivery-day data yet.</p>
            {:else}
                {#each data.deliveryDayTotals as day}
                    <div class="section-row">
                        <div>
                            <strong>{day.label}</strong>
                            <span>{day.date ? new Date(`${day.date}T00:00:00`).toLocaleDateString() : "No date"} · {day.count} orders</span>
                        </div>
                        <span>{formatCurrency(day.revenue)}</span>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="panel">
            <h2>Sales by Section</h2>
            {#if data.sectionTotals.length === 0}
                <p class="empty">No order data yet.</p>
            {:else}
                {#each data.sectionTotals as section}
                    <div class="section-row">
                        <div>
                            <strong>{section.section}</strong>
                            <span>{section.count} items</span>
                        </div>
                        <span>{formatCurrency(section.revenue)}</span>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="panel">
            <h2>Toppings & Options</h2>
            {#if data.optionTotals.length === 0}
                <p class="empty">No selected options yet.</p>
            {:else}
                {#each data.optionTotals as option}
                    <div class="section-row">
                        <strong>{option.option}</strong>
                        <span>{option.count}x</span>
                    </div>
                {/each}
            {/if}
        </div>

        <div class="panel">
            <h2>Recent Orders</h2>
            {#if data.recentOrders.length === 0}
                <p class="empty">No recent orders.</p>
            {:else}
                {#each data.recentOrders as order}
                    <div class="order-row">
                        <div>
                            <strong>{formatCurrency(order.total)}</strong>
                            <span>{order.deliveryDayLabel} · {new Date(order.createdAt).toLocaleString()}</span>
                        </div>
                        <span class:active={order.status === "new"}>{order.status}</span>
                    </div>
                {/each}
            {/if}
        </div>
    </section>
</main>

<style>
    .analytics-page {
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
        margin-top: 0.5rem;
    }

    h2 {
        font-size: 1.25rem;
        margin-bottom: 1rem;
    }

    .back-link {
        color: #e76f51;
        font-weight: 700;
        text-decoration: none;
    }

    .stats-grid,
    .content-grid {
        display: grid;
        gap: 1rem;
    }

    .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 1rem;
    }

    .content-grid {
        grid-template-columns: 1fr 1fr;
    }

    .stat,
    .panel {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .stat {
        padding: 1rem;
    }

    .stat span,
    .section-row span,
    .order-row span,
    .empty {
        color: #666;
    }

    .stat span {
        display: block;
        margin-bottom: 0.35rem;
    }

    .stat strong {
        font-size: 1.35rem;
    }

    .panel {
        padding: 1.25rem;
    }

    .section-row,
    .order-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem 0;
        border-top: 1px solid #f0f0f0;
    }

    .section-row div,
    .order-row div {
        display: grid;
        gap: 0.25rem;
    }

    .active {
        color: #e76f51;
        font-weight: 700;
    }

    @media (max-width: 760px) {
        .stats-grid,
        .content-grid {
            grid-template-columns: 1fr;
        }
    }
</style>
