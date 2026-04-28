<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { session } from "$lib/auth";
    import { getOrders, patchOrderStatus, patchOrderItems } from "$lib/api";

    let allOrders: {
        id: string;
        _id: string;
        name: string;
        items: {
            name: string;
            basePrice: number;
            finalPrice: number;
            price: number;
            selections: Record<string, unknown>;
            note: string;
            section: string;
            subsection: string;
            completed: boolean;
        }[];
        total: number;
        status: "new" | "closed";
        createdAt: string;
    }[] = [];
    let filteredOrders = allOrders;

    let showModal = false;
    let selectedOrder: (typeof allOrders)[0] | null = null;

    // Date filter state
    let dateFilter: "today" | "week" | "month" | "all" | "custom" = "today";
    let customStartDate = "";
    let customEndDate = "";

    // Status filter
    let statusFilter: "all" | "new" | "closed" = "all";

    // Search
    let searchQuery = "";

    function openOrder(order: (typeof allOrders)[0]) {
        selectedOrder = order;
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedOrder = null;
    }

    async function updateStatus(orderId: string, status: "new" | "closed") {
        if (!orderId) {
            console.error("Missing order id", { orderId });
            return;
        }

        const res = await patchOrderStatus(orderId, status);

        if (!res) return;

        // Update local state - create new array
        allOrders = allOrders.map((o) =>
            o._id === orderId ? { ...o, status } : o
        );
    }

    async function toggleItemCompleted(orderId: string, itemIndex: number) {
        const order = allOrders.find((o) => o._id === orderId);
        if (!order) {
            console.error("Order not found!");
            return;
        }

        // Create a new items array with the toggled item
        const updatedItems = order.items.map((item, idx) => {
            if (idx === itemIndex) {
                return {
                    ...item,
                    completed: !item.completed
                };
            }
            return item;
        });

        // Optimistically update the UI immediately - CREATE NEW ARRAY
        allOrders = allOrders.map((o) =>
            o._id === orderId ? { ...o, items: updatedItems } : o
        );

        // Update selected order if modal is open
        if (selectedOrder && selectedOrder._id === orderId) {
            selectedOrder = { ...selectedOrder, items: updatedItems };
        }

        // Send to server
        try {
            await patchOrderItems(orderId, updatedItems);
        } catch {
            console.error("Failed to update item completion");
            const revertedItems = updatedItems.map((item, idx) => {
                if (idx === itemIndex) {
                    return {
                        ...item,
                        completed: !item.completed
                    };
                }
                return item;
            });
            
            allOrders = allOrders.map((o) =>
                o._id === orderId ? { ...o, items: revertedItems } : o
            );

            if (selectedOrder && selectedOrder._id === orderId) {
                selectedOrder = { ...selectedOrder, items: revertedItems };
            }
        }
    }

    function getDateRange(
        filter: typeof dateFilter
    ): { start: Date; end: Date } | null {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        switch (filter) {
            case "today":
                return {
                    start: today,
                    end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
                };
            case "week":
                const weekStart = new Date(today);
                weekStart.setDate(today.getDate() - today.getDay());
                return {
                    start: weekStart,
                    end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000),
                };
            case "month":
                return {
                    start: new Date(now.getFullYear(), now.getMonth(), 1),
                    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
                };
            case "custom":
                if (customStartDate && customEndDate) {
                    return {
                        start: new Date(customStartDate),
                        end: new Date(
                            new Date(customEndDate).getTime() + 24 * 60 * 60 * 1000
                        ),
                    };
                }
                return null;
            default:
                return null;
        }
    }

    function applyFilters() {
        let result = [...allOrders];

        // Date filter
        if (dateFilter !== "all") {
            const range = getDateRange(dateFilter);
            if (range) {
                result = result.filter((order) => {
                    const orderDate = new Date(order.createdAt);
                    return orderDate >= range.start && orderDate < range.end;
                });
            }
        }

        // Status filter
        if (statusFilter !== "all") {
            result = result.filter((order) => order.status === statusFilter);
        }

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            result = result.filter(
                (order) =>
                    order.name.toLowerCase().includes(query) ||
                    order.items.some((item) =>
                        item.name.toLowerCase().includes(query)
                    )
            );
        }

        filteredOrders = result;
    }

    function getOrderProgress(order: (typeof allOrders)[0]): number {
        if (!order.items || order.items.length === 0) return 0;
        const completed = order.items.filter((item) => item.completed).length;
        return Math.round((completed / order.items.length) * 100);
    }

    function formatTime(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
        });
    }

    function formatDate(date: Date | string): string {
        const d = new Date(date);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
        });
    }

    // Analytics - make reactive to allOrders changes
    $: totalRevenue = filteredOrders.reduce((sum, o) => sum + o.total, 0);
    $: averageOrderValue = filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0;
    $: newOrdersCount = filteredOrders.filter((o) => o.status === "new").length;
    $: completedOrdersCount = filteredOrders.filter((o) => o.status === "closed").length;

    // Top items
    $: topItems = (() => {
        const itemCounts: Record<string, number> = {};
        filteredOrders.forEach((order) => {
            order.items.forEach((item) => {
                itemCounts[item.name] = (itemCounts[item.name] || 0) + 1;
            });
        });
        return Object.entries(itemCounts)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([name, count]) => ({ name, count }));
    })();

    // React to filter changes AND allOrders changes
    $: dateFilter, statusFilter, searchQuery, customStartDate, customEndDate, allOrders, applyFilters();

    onMount(async () => {
        if (!$session) {
            goto("/");
            return;
        }
        try {
            const fetched = await getOrders();
            // Rust API returns { id } but UI uses { _id }; normalise here
            allOrders = fetched.map((o: Record<string, unknown>) => ({ ...o, _id: o.id ?? o._id }));
        } catch (err) {
            console.error("Failed to load orders", err);
        }
        applyFilters();
    });
</script>

<main class="orders-page">
    <header class="page-header">
        <h1>Orders Dashboard</h1>
        <div class="header-actions">
            <a href="/order" class="btn-primary">+ New Order</a>
        </div>
    </header>

    <!-- Analytics Cards -->
    <section class="analytics-grid">
        <div class="stat-card">
            <div class="stat-label">Total Revenue</div>
            <div class="stat-value">${totalRevenue.toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Orders</div>
            <div class="stat-value">{filteredOrders.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Order Value</div>
            <div class="stat-value">${averageOrderValue.toFixed(2)}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Active Orders</div>
            <div class="stat-value highlight">{newOrdersCount}</div>
        </div>
    </section>

    <!-- Top Items -->
    {#if topItems.length > 0}
        <section class="top-items">
            <h3>Top Items</h3>
            <div class="items-list">
                {#each topItems as item}
                    <div class="item-stat">
                        <span class="item-name">{item.name}</span>
                        <span class="item-count">{item.count}x</span>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <!-- Filters -->
    <section class="filters-section">
        <div class="filter-group">
            <label>Date Range</label>
            <div class="filter-buttons">
                <button
                    class:active={dateFilter === "today"}
                    on:click={() => (dateFilter = "today")}
                >
                    Today
                </button>
                <button
                    class:active={dateFilter === "week"}
                    on:click={() => (dateFilter = "week")}
                >
                    This Week
                </button>
                <button
                    class:active={dateFilter === "month"}
                    on:click={() => (dateFilter = "month")}
                >
                    This Month
                </button>
                <button
                    class:active={dateFilter === "all"}
                    on:click={() => (dateFilter = "all")}
                >
                    All Time
                </button>
                <button
                    class:active={dateFilter === "custom"}
                    on:click={() => (dateFilter = "custom")}
                >
                    Custom
                </button>
            </div>
        </div>

        {#if dateFilter === "custom"}
            <div class="custom-date-inputs">
                <input type="date" bind:value={customStartDate} />
                <span>to</span>
                <input type="date" bind:value={customEndDate} />
            </div>
        {/if}

        <div class="filter-group">
            <label>Status</label>
            <div class="filter-buttons">
                <button
                    class:active={statusFilter === "all"}
                    on:click={() => (statusFilter = "all")}
                >
                    All ({allOrders.length})
                </button>
                <button
                    class:active={statusFilter === "new"}
                    on:click={() => (statusFilter = "new")}
                >
                    Active ({allOrders.filter((o) => o.status === "new").length})
                </button>
                <button
                    class:active={statusFilter === "closed"}
                    on:click={() => (statusFilter = "closed")}
                >
                    Completed ({allOrders.filter((o) => o.status === "closed").length})
                </button>
            </div>
        </div>

        <div class="filter-group">
            <label>Search</label>
            <input
                type="search"
                placeholder="Search by name or item..."
                bind:value={searchQuery}
                class="search-input"
            />
        </div>
    </section>

    <!-- Orders List -->
    {#if filteredOrders.length === 0}
        <p class="empty">No orders found</p>
    {:else}
        <div class="orders-list">
            {#each filteredOrders as order}
                {@const progress = getOrderProgress(order)}
                <div 
                    class="order-card" 
                    class:completed={order.status === "closed"}
                    on:click={() => openOrder(order)}
                    on:keydown={(e) => e.key === 'Enter' && openOrder(order)}
                    role="button"
                    tabindex="0"
                >
                    <div class="order-header">
                        <div class="order-info">
                            <h3>{order.name}</h3>
                            <div class="order-meta">
                                <span class="time">{formatTime(order.createdAt)}</span>
                                <span class="date">{formatDate(order.createdAt)}</span>
                            </div>
                        </div>
                        <div class="order-summary">
                            <div class="order-total">${order.total.toFixed(2)}</div>
                            <div class="order-count">{order.items.length} items</div>
                        </div>
                    </div>

                    <div class="order-items">
                        {#each order.items as item}
                            <div class="order-item">
                                <div class="item-checkbox-display" class:checked={item.completed}>
                                    {#if item.completed}✓{/if}
                                </div>
                                <div class="item-details" class:completed={item.completed}>
                                    <strong>{item.name}</strong>
                                    {#if item.selections && Object.keys(item.selections).length > 0}
                                        <div class="item-customizations">
                                            {#each Object.entries(item.selections) as [key, value]}
                                                {#if typeof value === "string" && value}
                                                    <span class="customization-tag">{value}</span>
                                                {:else if Array.isArray(value) && value.length > 0}
                                                    {#each value as v}
                                                        <span class="customization-tag">{v}</span>
                                                    {/each}
                                                {/if}
                                            {/each}
                                        </div>
                                    {/if}
                                    {#if item.note}
                                        <p class="item-note">📝 {item.note}</p>
                                    {/if}
                                </div>
                                <div class="item-price">${(item.finalPrice || item.basePrice || item.price).toFixed(2)}</div>
                            </div>
                        {/each}
                    </div>

                    <div class="order-footer">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: {progress}%"></div>
                            <span class="progress-text">{progress}% Complete</span>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {/if}

    <!-- Modal -->
    {#if showModal && selectedOrder}
        <div
            class="modal-backdrop"
            on:click={closeModal}
            on:keydown={(e) => e.key === "Escape" && closeModal()}
            role="button"
            tabindex="-1"
            aria-label="Close modal"
        ></div>

        <div class="modal">
            <button class="modal-close" on:click={closeModal} type="button">✕</button>
            
            <h2>Order from {selectedOrder.name}</h2>
            <div class="modal-meta">
                {formatDate(selectedOrder.createdAt)} at {formatTime(selectedOrder.createdAt)}
            </div>

            <div class="modal-items">
                {#each selectedOrder.items as item, itemIndex}
                    <div class="modal-item">
                        <button
                            class="item-checkbox"
                            class:checked={item.completed}
                            on:click={() => toggleItemCompleted(selectedOrder._id, itemIndex)}
                            type="button"
                        >
                            {#if item.completed}✓{/if}
                        </button>
                        <div class="item-info">
                            <strong class:completed={item.completed}>{item.name}</strong>
                            {#if item.selections && Object.keys(item.selections).length > 0}
                                <div class="item-customizations">
                                    {#each Object.entries(item.selections) as [key, value]}
                                        {#if typeof value === "string" && value}
                                            <span class="customization-tag">{value}</span>
                                        {:else if Array.isArray(value) && value.length > 0}
                                            {#each value as v}
                                                <span class="customization-tag">{v}</span>
                                            {/each}
                                        {/if}
                                    {/each}
                                </div>
                            {/if}
                            {#if item.note}
                                <p class="item-note">📝 {item.note}</p>
                            {/if}
                        </div>
                        <span>${(item.finalPrice || item.basePrice || item.price).toFixed(2)}</span>
                    </div>
                {/each}
            </div>

            <div class="modal-total">
                Total: <strong>${selectedOrder.total.toFixed(2)}</strong>
            </div>

            <div class="modal-actions">
                <button on:click={closeModal} class="btn-primary">Close</button>
            </div>
        </div>
    {/if}
</main>

<style>
    .orders-page {
        padding: 2rem;
        background: #f5f5f5;
        min-height: 100vh;
    }

    .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
    }

    .page-header h1 {
        font-size: 2rem;
        color: #333;
        margin: 0;
    }

    .btn-primary {
        padding: 0.75rem 1.5rem;
        background: #e76f51;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        text-decoration: none;
        display: inline-block;
    }

    .btn-primary:hover {
        background: #d45a3e;
    }

    /* Analytics */
    .analytics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        margin-bottom: 2rem;
    }

    .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .stat-label {
        font-size: 0.85rem;
        color: #666;
        margin-bottom: 0.5rem;
    }

    .stat-value {
        font-size: 2rem;
        font-weight: bold;
        color: #333;
    }

    .stat-value.highlight {
        color: #e76f51;
    }

    /* Top Items */
    .top-items {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .top-items h3 {
        margin: 0 0 1rem 0;
        color: #333;
    }

    .items-list {
        display: grid;
        gap: 0.5rem;
    }

    .item-stat {
        display: flex;
        justify-content: space-between;
        padding: 0.5rem;
        background: #f8f9fa;
        border-radius: 6px;
    }

    .item-name {
        font-weight: 500;
    }

    .item-count {
        color: #666;
    }

    /* Filters */
    .filters-section {
        background: white;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 2rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .filter-group {
        margin-bottom: 1.5rem;
    }

    .filter-group:last-child {
        margin-bottom: 0;
    }

    .filter-group label {
        display: block;
        font-weight: 600;
        margin-bottom: 0.5rem;
        color: #333;
    }

    .filter-buttons {
        display: flex;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .filter-buttons button {
        padding: 0.5rem 1rem;
        background: #f0f0f0;
        border: 2px solid transparent;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .filter-buttons button:hover {
        background: #e0e0e0;
    }

    .filter-buttons button.active {
        background: #e76f51;
        color: white;
        border-color: #e76f51;
    }

    .custom-date-inputs {
        display: flex;
        gap: 1rem;
        align-items: center;
        margin-top: 1rem;
    }

    .custom-date-inputs input {
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 6px;
    }

    .search-input {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }

    /* Orders List */
    .orders-list {
        display: grid;
        gap: 1.5rem;
    }

    .order-card {
        background: white;
        border-radius: 12px;
        padding: 1.5rem;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        transition: all 0.2s;
    }

    .order-card.completed {
        opacity: 0.7;
    }

    .order-card:hover {
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .order-header {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #f0f0f0;
    }

    .order-info h3 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }

    .order-meta {
        display: flex;
        gap: 1rem;
        font-size: 0.85rem;
        color: #666;
    }

    .order-summary {
        text-align: right;
    }

    .order-total {
        font-size: 1.5rem;
        font-weight: bold;
        color: #e76f51;
    }

    .order-count {
        font-size: 0.85rem;
        color: #666;
    }

    .order-items {
        display: grid;
        gap: 0.75rem;
        margin-bottom: 1rem;
    }

    .order-item {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        gap: 1rem;
        align-items: start;
        padding: 0.75rem;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .item-checkbox {
        width: 32px;
        height: 32px;
        border: 2px solid #ddd;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        transition: all 0.2s;
    }

    .item-checkbox:hover {
        border-color: #2a9d8f;
    }

    .item-checkbox.checked {
        background: #2a9d8f;
        border-color: #2a9d8f;
        color: white;
    }

    .item-details {
        flex: 1;
    }

    .item-details.completed strong {
        text-decoration: line-through;
        color: #999;
    }

    .item-customizations {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
        margin-top: 0.5rem;
    }

    .customization-tag {
        padding: 0.25rem 0.5rem;
        background: #e0e0e0;
        border-radius: 4px;
        font-size: 0.75rem;
        color: #555;
    }

    .item-note {
        font-size: 0.85rem;
        color: #666;
        margin: 0.5rem 0 0 0;
        font-style: italic;
    }

    .item-price {
        font-weight: 600;
        color: #333;
    }

    .order-footer {
        padding-top: 1rem;
        border-top: 2px solid #f0f0f0;
    }

    .progress-bar {
        position: relative;
        height: 32px;
        background: #f0f0f0;
        border-radius: 6px;
        overflow: hidden;
        margin-bottom: 1rem;
    }

    .progress-fill {
        position: absolute;
        height: 100%;
        background: linear-gradient(90deg, #2a9d8f 0%, #238276 100%);
        transition: width 0.3s;
    }

    .progress-text {
        position: absolute;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        color: #333;
        font-size: 0.85rem;
    }

    .order-actions {
        display: flex;
        gap: 1rem;
    }

    .btn-action, .btn-status {
        flex: 1;
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
    }

    .btn-action {
        background: #f0f0f0;
        color: #333;
    }

    .btn-action:hover {
        background: #e0e0e0;
    }

    .btn-status {
        background: #2a9d8f;
        color: white;
    }

    .btn-status:hover {
        background: #238276;
    }

    .btn-status.active {
        background: #2a9d8f;
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }

    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        padding: 2rem;
        max-width: 600px;
        width: 90%;
        max-height: 90vh;
        overflow-y: auto;
        z-index: 1000;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
    }

    .modal-close {
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: #f0f0f0;
        border: none;
        border-radius: 50%;
        width: 32px;
        height: 32px;
        font-size: 1.2rem;
        cursor: pointer;
    }

    .modal h2 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }

    .modal-meta {
        color: #666;
        margin-bottom: 1.5rem;
        font-size: 0.9rem;
    }

    .modal-items {
        margin: 1.5rem 0;
        max-height: 400px;
        overflow-y: auto;
    }

    .modal-item {
        display: grid;
        grid-template-columns: 32px 1fr auto;
        gap: 1rem;
        padding: 1rem 0;
        border-bottom: 1px solid #f0f0f0;
    }

    .modal-total {
        margin-top: 1.5rem;
        padding-top: 1rem;
        border-top: 2px solid #f0f0f0;
        font-size: 1.2rem;
        text-align: right;
    }

    .modal-total strong {
        color: #e76f51;
    }

    .modal-actions {
        display: flex;
        gap: 1rem;
        margin-top: 1.5rem;
    }

    .btn-secondary {
        flex: 1;
        padding: 0.75rem;
        background: #f0f0f0;
        color: #333;
        border: none;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }

    .btn-secondary:hover {
        background: #e0e0e0;
    }

    .empty {
        text-align: center;
        padding: 3rem;
        color: #999;
        font-style: italic;
    }
</style>
