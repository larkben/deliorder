<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";

    export let data;

    type Product = {
        id: string;
        name: string;
        price: number;
        description: string;
    };
    type CartItem = Product & { note?: string; completed?: boolean };

    let cart: CartItem[] = [];
    let noteInput: Record<string, string> = {};
    let showModal = false;
    let selectedProduct: Product | null = null;

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

    $: total = cart.reduce((sum, item) => sum + item.price, 0);
</script>

<main class="mobile-layout">
    <h1>Menu</h1>

    {#each data.products as product}
        <div class="product-card" on:click={() => openModal(product)}>
            <div class="product-info">
                <strong>{product.name}</strong>
                <p>{product.description}</p>
            </div>
            <span class="price">${product.price.toFixed(2)}</span>
        </div>
    {/each}

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
                        <button on:click={() => removeFromCart(index)}>✕</button
                        >
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
        <div class="modal-backdrop" on:click={closeModal}></div>
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
    /* MOBILE-FIRST STYLING */
    .mobile-layout {
        padding: 1rem;
        font-family: "Georgia", serif;
        background: #f4e8d8;
        min-height: 100vh;
    }

    h1,
    h2 {
        color: #5d3a1a;
    }
    h1 {
        font-size: 1.8rem;
        margin-bottom: 1rem;
    }
    h2 {
        font-size: 1.4rem;
        margin-top: 2rem;
        margin-bottom: 1rem;
    }

    .product-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #fff9f0;
        padding: 1rem;
        margin-bottom: 0.75rem;
        border-radius: 10px;
        border: 2px solid #d2b48c;
        box-shadow: 0 3px 8px rgba(139, 69, 19, 0.15);
        font-size: 1rem;
    }

    .product-card .price {
        font-weight: bold;
        color: #8b4513;
    }

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

    .submit {
        width: 100%;
        padding: 1rem;
        background: #8b4513;
        color: white;
        font-weight: bold;
        border-radius: 8px;
        border: none;
        margin-top: 1rem;
        font-size: 1.2rem;
    }

    .submit:disabled {
        background: #a0826d;
    }

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
    }

    .modal button {
        width: 100%;
        padding: 0.75rem;
        background: #8b4513;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
    }
</style>
