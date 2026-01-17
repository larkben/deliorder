<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    export let data;

    type Product = {
        id: string;
        name: string;
        price: number;
        description: string;
        section: string; // e.g., "sandwiches", "kids-meals", "salads", "drinks", "sides"
        subsection?: string; // e.g., "breakfast", "paninis", "fountain-drinks"
    };
    type CartItem = Product & { note?: string; completed?: boolean };

    let cart: CartItem[] = [];
    let noteInput: Record<string, string> = {};
    let showModal = false;
    let selectedProduct: Product | null = null;
    let activeSection: string = "sandwiches";
    let filteredProducts: Product[] = [];


    /* OPEN MODAL FOR ADDING NOTE */
    function openModal(product: Product) {
        selectedProduct = product;
        noteInput[product.id] = "";
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedProduct = null;
    }

    function addToCart() {
        if (!selectedProduct) return;

        cart = [
            ...cart,
            { ...selectedProduct, note: noteInput[selectedProduct.id] },
        ];
        noteInput[selectedProduct.id] = "";
        closeModal();
    }

    function removeFromCart(index: number) {
        cart = cart.filter((_, i) => i !== index);
    }

    async function submitOrder() {
        if (cart.length === 0) return;

        const formData = new FormData();
        formData.append("items", JSON.stringify(cart));

        const res = await fetch("/order", { method: "POST", body: formData });

        if (!res.ok) {
            alert("Failed to submit order");
            return;
        }

        cart = [];
        goto("/orders");
    }

    async function selectSection(section: string) {
        activeSection = section;

        const res = await fetch(`/api/products/${section}`);
        if (res.ok) {
            filteredProducts = await res.json();
        }
    }


    $: total = cart.reduce((sum, item) => sum + item.price, 0);

    // Group filtered products by subsection
    $: groupedProducts = filteredProducts.reduce(
        (acc: Record<string, Product[]>, product: Product) => {
            const key = product.subsection || "items";
            if (!acc[key]) acc[key] = [];
            acc[key].push(product);
            return acc;
        },
        {}
    );

    onMount(() => {
        selectSection(activeSection);
    });
</script>

<main class="mobile-layout">
    <h1>Menu</h1>

    <label>
        Name
        <input name="name"/>
    </label>

    <label>
        Lunch:
        <select name="section" required>
            <option value="a">A</option>
            <option value="b">B</option>
        </select>
    </label>

    <nav class="menu-nav">
        <button
            type="button"
            class:active={activeSection === "sandwiches"}
            on:click={() => selectSection("sandwiches")}
        >
            Sandwiches
        </button>
        <button
            type="button"
            class:active={activeSection === "kids-meals"}
            on:click={() => selectSection("kids-meals")}
        >
            Kid's Meals
        </button>
        <button
            type="button"
            class:active={activeSection === "salads"}
            on:click={() => selectSection("salads")}
        >
            Salads
        </button>
        <button
            type="button"
            class:active={activeSection === "drinks"}
            on:click={() => selectSection("drinks")}
        >
            Drinks
        </button>
        <button
            type="button"
            class:active={activeSection === "sides"}
            on:click={() => selectSection("sides")}
        >
            Sides
        </button>
    </nav>

    <section class="menu-section">
        {#if activeSection === "sandwiches"}
            <h2>Sandwiches</h2>
        {:else if activeSection === "kids-meals"}
            <h2>Kid's Meals</h2>
            <p>All kids' meals come with chips, milk or a small fountain drink, and a small cup of our flavored Dole Whip!</p>
        {:else if activeSection === "salads"}
            <h2>Salads</h2>
            <p>Try one of our fresh and healthy salads! Our dressings include Ranch, French, Italian, Fat Free Ranch, & Fat Free Italian.</p>
        {:else if activeSection === "drinks"}
            <h2>Drinks</h2>
            <p>Milk Options: 2% Milk or Almond Milk</p>
        {:else if activeSection === "sides"}
            <h2>Sides</h2>
        {/if}

        {#each Object.entries(groupedProducts) as [subsection, products]}
            <h3>{subsection}</h3>
            {#each products as product}
                <button class="product-card" on:click={() => openModal(product)} type="button">
                    <div class="product-info">
                        <strong>{product.name}</strong>
                        <p>{product.description}</p>
                    </div>
                    <span class="price">${product.price.toFixed(2)}</span>
                </button>
            {/each}
        {/each}

        {#if filteredProducts.length === 0}
            <p class="empty">No items in this section yet.</p>
        {/if}
    </section>

    <section class="cart">
        <h2>Your Cart ({cart.length})</h2>
        {#if cart.length === 0}
            <p class="empty">Cart is empty</p>
        {:else}
            {#each cart as item, index}
                <div class="cart-item">
                    <div>
                        <strong>{item.name}</strong>
                        {#if item.note}<p class="note">📝 {item.note}</p>{/if}
                    </div>
                    <div class="price">
                        ${item.price.toFixed(2)}
                        <button on:click={() => removeFromCart(index)}>✕</button>
                    </div>
                </div>
            {/each}
            <div class="total">Total: <strong>${total.toFixed(2)}</strong></div>
        {/if}
    </section>

    <button class="submit" on:click={submitOrder} disabled={cart.length === 0}>
        Submit Order
    </button>

    <!-- Modal for notes -->
    {#if showModal && selectedProduct}
        <button class="modal-backdrop" on:click={closeModal} type="button" aria-label="Close modal"></button>
        <div class="modal">
            <h2>{selectedProduct.name}</h2>
            <p>{selectedProduct.description}</p>
            <input
                type="text"
                placeholder="Add a note (optional)"
                bind:value={noteInput[selectedProduct.id]}
            />
            <button on:click={addToCart}>Add to Cart</button>
        </div>
    {/if}
</main>

<style>
    /* General mobile layout */
    .mobile-layout {
        padding: 1rem;
        font-family: "Georgia", serif;
        background: #f4e8d8;
        min-height: 100vh;
    }

    h1,
    h2 {
        color: #5d3a1a;
        scroll-margin-top: 1rem;
    }

    .top-nav {
        display: flex;
        justify-content: space-between;
        margin-bottom: 1rem;
    }

    .top-nav a {
        padding: 0.5rem 1rem;
        background: #d2691e;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        font-size: 1rem;
    }

    .top-nav a:hover {
        background: #8b4513;
    }

    /* Menu section navigation */
    .menu-nav {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding: 0.5rem 0;
        margin-bottom: 1rem;
        -webkit-overflow-scrolling: touch;
    }

    .menu-nav button {
        flex-shrink: 0;
        padding: 0.5rem 0.75rem;
        background: #fff9f0;
        color: #5d3a1a;
        border-radius: 20px;
        border: 2px solid #d2b48c;
        font-size: 0.9rem;
        font-weight: bold;
        cursor: pointer;
        transition: background 0.2s, color 0.2s;
    }

    .menu-nav button:hover {
        background: #d2b48c;
        color: white;
    }

    .menu-nav button.active {
        background: #8b4513;
        color: white;
        border-color: #8b4513;
    }

    .menu-section {
        margin-bottom: 1.5rem;
    }

    .menu-section h3 {
        color: #6b4423;
        margin-top: 1rem;
        margin-bottom: 0.5rem;
        text-transform: capitalize;
    }

    /* Product cards */
    .product-card {
        display: flex;
        flex-direction: column; /* stack content vertically */
        background: #fff9f0;
        padding: 1rem;
        margin-bottom: 0.75rem;
        border-radius: 10px;
        border: 2px solid #d2b48c;
        box-shadow: 0 3px 8px rgba(139, 69, 19, 0.15);
        font-size: 1rem;
        cursor: pointer;
        transition: transform 0.1s;
    }

    .product-card:hover {
        transform: translateY(-2px);
    }

    .product-card .price {
        font-weight: bold;
        color: #8b4513;
        margin-top: 1px; /* space below description */
        font-size: 1.1rem;
    }

    /* Cart section */
    .cart-item {
        display: flex;
        justify-content: space-between;
        padding: 0.75rem;
        background: #fff;
        border-radius: 8px;
        border: 2px solid #d2b48c;
        margin-bottom: 0.5rem;
    }

    .cart-item .note {
        font-size: 0.85rem;
        font-style: italic;
        color: #8b6914;
    }

    .total {
        font-weight: bold;
        margin-top: 1rem;
        font-size: 1.2rem;
        color: #5d3a1a;
    }

    /* Buttons */
    button {
        font-size: 1rem; /* >=16px for iOS */
        font-weight: bold;
        border-radius: 8px;
        padding: 0.75rem;
        border: none;
        cursor: pointer;
    }

    .submit,
    .modal button,
    nav a {
        background: #8b4513;
        color: white;
    }

    .submit:disabled {
        background: #a0826d;
    }

    /* Modal */
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.4);
        z-index: 50;
    }

    .modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #fff9f0;
        padding: 1.5rem;
        border-radius: 12px;
        border: 3px solid #d2b48c;
        z-index: 100;
        width: 90%;
    }

    .modal input {
        width: 100%;
        padding: 0.5rem;
        margin: 0.75rem 0;
        border: 2px solid #d2b48c;
        border-radius: 6px;
        font-size: 1rem; /* fix iOS zoom */
    }

    /* Container label styling */
    label {
        display: flex;
        flex-direction: column;
        font-weight: bold;
        color: #5d3a1a;
        margin-bottom: 1rem;
        font-size: 1rem;
    }

    /* Select styling */
    label select {
        margin-top: 0.5rem;
        padding: 0.5rem 0.75rem;
        border: 2px solid #d2b48c;
        border-radius: 8px;
        font-size: 1rem;
        background: #fff9f0;
        color: #5d3a1a;
        appearance: none; /* removes default arrow styling */
        cursor: pointer;
        transition: border-color 0.2s, box-shadow 0.2s;
    }

    /* Focus state */
    label select:focus {
        border-color: #8b4513;
        box-shadow: 0 0 0 2px rgba(139, 69, 19, 0.2);
        outline: none;
    }

    /* Optional: custom arrow using pseudo-element */
    label select {
        background-image: url("data:image/svg+xml,%3Csvg fill='%238b4513' height='24' viewBox='0 0 24 24' width='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
        background-repeat: no-repeat;
        background-position: right 0.75rem center;
        background-size: 1rem;
        padding-right: 2rem; /* space for arrow */
    }

</style>
