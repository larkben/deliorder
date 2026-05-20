<script lang="ts">
    export let data: any;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);

    $: maxItemRevenue = Math.max(1, ...data.itemTotals.map((item: any) => item.revenue));
    $: maxOptionCount = Math.max(1, ...data.optionTotals.map((option: any) => option.count));
    $: maxDayOrders = Math.max(1, ...data.deliveryDayTotals.map((day: any) => day.count));
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

    <section class="insight-grid">
        <div class="insight-card">
            <span>Expected Next Delivery</span>
            <strong>{data.insights.suggestedPrepCount} orders</strong>
            <p>Based on the average per delivery day.</p>
        </div>
        <div class="insight-card">
            <span>Busiest Day</span>
            <strong>{data.insights.busiestDeliveryDay}</strong>
            <p>Use this as your staffing and prep benchmark.</p>
        </div>
        <div class="insight-card">
            <span>Top Seller</span>
            <strong>{data.insights.topItem}</strong>
            <p>Keep these ingredients stocked first.</p>
        </div>
        <div class="insight-card">
            <span>Top Option</span>
            <strong>{data.insights.topOption}</strong>
            <p>Watch repeated topping and bread demand.</p>
        </div>
    </section>

    <section class="chart-grid">
        <div class="panel">
            <h2>Revenue by Item</h2>
            {#each data.itemTotals.slice(0, 8) as item}
                <div class="bar-row">
                    <div class="bar-meta">
                        <strong>{item.item}</strong>
                        <span>{formatCurrency(item.revenue)}</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill" style={`width: ${(item.revenue / maxItemRevenue) * 100}%`}></div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="panel">
            <h2>Most Selected Options</h2>
            {#each data.optionTotals.slice(0, 8) as option}
                <div class="bar-row">
                    <div class="bar-meta">
                        <strong>{option.option}</strong>
                        <span>{option.count}x</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill option" style={`width: ${(option.count / maxOptionCount) * 100}%`}></div>
                    </div>
                </div>
            {/each}
        </div>

        <div class="panel wide">
            <h2>Orders by Delivery Day</h2>
            {#each data.deliveryDayTotals as day}
                <div class="bar-row">
                    <div class="bar-meta">
                        <strong>{day.label}</strong>
                        <span>{day.count} orders · {formatCurrency(day.revenue)}</span>
                    </div>
                    <div class="bar-track">
                        <div class="bar-fill day" style={`width: ${(day.count / maxDayOrders) * 100}%`}></div>
                    </div>
                </div>
            {/each}
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
            <h2>Sales by Item</h2>
            {#if data.itemTotals.length === 0}
                <p class="empty">No order data yet.</p>
            {:else}
                {#each data.itemTotals as item}
                    <div class="section-row">
                        <div>
                            <strong>{item.item}</strong>
                            <span>{item.count} ordered</span>
                        </div>
                        <span>{formatCurrency(item.revenue)}</span>
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
                            <strong>{order.name}: {formatCurrency(order.total)}</strong>
                            <span>{order.deliveryDayLabel} · {new Date(order.createdAt).toLocaleString()}</span>
                            {#each order.items as item}
                                <span class="order-detail">
                                    {item.name} ({formatCurrency(item.price)})
                                    {#if item.selections.length > 0}
                                        - {item.selections.join(", ")}
                                    {/if}
                                    {#if item.note}
                                        - {item.note}
                                    {/if}
                                </span>
                            {/each}
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
    .content-grid,
    .insight-grid,
    .chart-grid {
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

    .insight-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
        margin-bottom: 1rem;
    }

    .chart-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-bottom: 1rem;
    }

    .wide {
        grid-column: 1 / -1;
    }

    .stat,
    .insight-card,
    .panel {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .stat {
        padding: 1rem;
    }

    .insight-card {
        padding: 1rem;
    }

    .insight-card span {
        color: #e76f51;
        display: block;
        font-size: 0.78rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        margin-bottom: 0.45rem;
        text-transform: uppercase;
    }

    .insight-card strong {
        display: block;
        font-size: 1.05rem;
        line-height: 1.35;
    }

    .insight-card p {
        color: #666;
        font-size: 0.9rem;
        line-height: 1.4;
        margin-top: 0.55rem;
    }

    .stat span,
    .section-row span,
    .order-row span,
    .order-detail,
    .empty {
        color: #666;
    }

    .order-detail {
        font-size: 0.88rem;
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

    .bar-row {
        display: grid;
        gap: 0.45rem;
        padding: 0.75rem 0;
        border-top: 1px solid #f0f0f0;
    }

    .bar-row:first-of-type {
        border-top: none;
    }

    .bar-meta {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
    }

    .bar-meta strong {
        font-size: 0.92rem;
    }

    .bar-meta span {
        color: #666;
        white-space: nowrap;
    }

    .bar-track {
        height: 0.65rem;
        overflow: hidden;
        background: #f0f0f0;
        border-radius: 999px;
    }

    .bar-fill {
        height: 100%;
        min-width: 0.35rem;
        background: #e76f51;
        border-radius: inherit;
    }

    .bar-fill.option {
        background: #2a9d8f;
    }

    .bar-fill.day {
        background: #333;
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
        .content-grid,
        .insight-grid,
        .chart-grid {
            grid-template-columns: 1fr;
        }

        .analytics-page {
            padding: 1rem 0.75rem 5rem;
        }

        .bar-meta,
        .section-row,
        .order-row {
            flex-direction: column;
        }
    }
</style>
