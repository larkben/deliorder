<script lang="ts">
    import { enhance } from "$app/forms";

    export let data;
    export let form;

    const formatCurrency = (value: number) =>
        new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(value);
</script>

<main class="admin-page">
    <header class="admin-header">
        <div>
            <p class="eyebrow">Admin Control Center</p>
            <h1>Welcome, {data.adminUser.username}</h1>
        </div>

        <form method="POST" action="?/logout">
            <button class="secondary-btn" type="submit">Sign Out</button>
        </form>
    </header>

    <section class="quick-links" aria-label="Admin sections">
        <a class="action-card" href="/orders">
            <span class="card-label">Orders</span>
            <strong>Open Orders Dashboard</strong>
            <span>{data.summary.activeOrders} active orders</span>
        </a>

        <a class="action-card" href="/admin/order-confirmation">
            <span class="card-label">Confirmation</span>
            <strong>Confirm Paid Orders</strong>
            <span>{data.summary.activeOrders} waiting for payment confirmation</span>
        </a>

        <a class="action-card" href="/admin/analytics">
            <span class="card-label">Analytics</span>
            <strong>View Order Analytics</strong>
            <span>{formatCurrency(data.summary.totalRevenue)} total revenue</span>
        </a>

        <a class="action-card" href="/admin/delivery-days">
            <span class="card-label">Delivery Days</span>
            <strong>Manage Order Dates</strong>
            <span>Open, close, edit, or remove delivery days</span>
        </a>
    </section>

    <section class="stats-grid" aria-label="Order summary">
        <div class="stat">
            <span>Total Orders</span>
            <strong>{data.summary.orderCount}</strong>
        </div>
        <div class="stat">
            <span>New</span>
            <strong>{data.summary.activeOrders}</strong>
        </div>
        <div class="stat">
            <span>Confirmed</span>
            <strong>{data.summary.confirmedOrders}</strong>
        </div>
        <div class="stat">
            <span>Complete</span>
            <strong>{data.summary.completedOrders}</strong>
        </div>
        <div class="stat">
            <span>Average Order</span>
            <strong>{formatCurrency(data.summary.averageOrderValue)}</strong>
        </div>
    </section>

    <section class="management">
        <div>
            <p class="eyebrow">Admin Users</p>
            <h2>Add or Update Login</h2>
            <p class="helper">Passwords are never shown. Enter a username and a new password to create or update a login.</p>
        </div>

        <form class="admin-form" method="POST" action="?/saveAdmin" use:enhance>
            <label>
                Username
                <input name="username" placeholder="admin" autocomplete="username" />
            </label>

            <label>
                New Password
                <input name="password" type="password" placeholder="At least 8 characters" autocomplete="new-password" />
            </label>

            {#if form?.userError}
                <p class="form-error">{form.userError}</p>
            {/if}

            {#if form?.userSuccess}
                <p class="form-success">{form.userSuccess}</p>
            {/if}

            <button class="primary-btn" type="submit">Save Login</button>
        </form>

        <div class="user-list">
            <h3>Current Admin Logins</h3>
            {#each data.adminUsers as user}
                <div class="user-row">
                    <div>
                        <strong>{user.username}</strong>
                        <span>Updated {new Date(user.updatedAt).toLocaleDateString()}</span>
                    </div>
                    <span class="password-note">Password hidden</span>
                </div>
            {/each}
        </div>
    </section>
</main>

<style>
    .admin-page {
        max-width: 1080px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
        color: #333;
    }

    .admin-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        margin-bottom: 1.5rem;
    }

    h1,
    h2,
    h3,
    p {
        margin: 0;
    }

    h1 {
        font-size: 2.25rem;
    }

    h2 {
        font-size: 1.5rem;
        margin-top: 0.25rem;
    }

    .eyebrow,
    .card-label {
        color: #e76f51;
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
    }

    .quick-links,
    .stats-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .stats-grid {
        grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .action-card,
    .stat,
    .management {
        background: #fff;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .action-card {
        display: grid;
        gap: 0.5rem;
        padding: 1.25rem;
        color: inherit;
        text-decoration: none;
        transition: transform 0.2s, border-color 0.2s;
    }

    .action-card:hover {
        border-color: #e76f51;
        transform: translateY(-2px);
    }

    .action-card strong {
        font-size: 1.15rem;
    }

    .action-card span:last-child,
    .helper,
    .user-row span {
        color: #666;
    }

    .stat {
        padding: 1rem;
    }

    .stat span {
        display: block;
        color: #666;
        font-size: 0.9rem;
        margin-bottom: 0.35rem;
    }

    .stat strong {
        font-size: 1.5rem;
    }

    .management {
        display: grid;
        grid-template-columns: 1fr 1.1fr;
        gap: 1.5rem;
        padding: 1.5rem;
        margin-top: 1rem;
    }

    .helper {
        margin-top: 0.75rem;
        line-height: 1.5;
    }

    .admin-form {
        display: grid;
        gap: 0.9rem;
    }

    label {
        display: grid;
        gap: 0.4rem;
        color: #555;
        font-weight: 600;
    }

    input {
        width: 100%;
        box-sizing: border-box;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }

    .primary-btn,
    .secondary-btn {
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
        padding: 0.75rem 1rem;
    }

    .primary-btn {
        background: #e76f51;
        color: white;
    }

    .secondary-btn {
        background: #333;
        color: white;
    }

    .form-error,
    .form-success {
        margin: 0;
        font-size: 0.9rem;
    }

    .form-error {
        color: #b42318;
    }

    .form-success {
        color: #067647;
    }

    .user-list {
        grid-column: 1 / -1;
        border-top: 1px solid #eee;
        padding-top: 1rem;
    }

    .user-list h3 {
        margin-bottom: 0.75rem;
    }

    .user-row {
        display: flex;
        justify-content: space-between;
        gap: 1rem;
        padding: 0.8rem 0;
        border-top: 1px solid #f0f0f0;
    }

    .user-row div {
        display: grid;
        gap: 0.25rem;
    }

    .password-note {
        align-self: center;
        font-size: 0.9rem;
    }

    @media (max-width: 760px) {
        .admin-header,
        .user-row {
            align-items: stretch;
            flex-direction: column;
        }

        .quick-links,
        .stats-grid,
        .management {
            grid-template-columns: 1fr;
        }
    }
</style>
