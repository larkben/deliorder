<script lang="ts">
    import { onMount } from "svelte";
    import { goto } from "$app/navigation";
    import { session } from "$lib/auth";
    import { getProducts, createOrder } from "$lib/api";

    // Get user name from session store
    let name = $session?.user?.name ?? $session?.user?.email ?? "";
    let isNameFromSession = true; // Flag to make it read-only

    type CustomizationOption = {
        value: string;
        label: string;
        price: number;
    };

    type Customization = {
        id: string;
        label: string;
        type: "single" | "multiple";
        required: boolean;
        options: CustomizationOption[];
    };

    type Product = {
        id: string;
        name: string;
        price: number;
        description: string;
        section: string;
        subsection?: string;
        customizations?: Customization[];
    };

    type CartItem = Product & {
        note?: string;
        completed?: boolean;
        selections?: Record<string, string | string[]>;
        finalPrice?: number;
    };

    let cart: CartItem[] = [];
    let noteInput: string = "";
    let showModal = false;
    let selectedProduct: Product | null = null;
    let selections: Record<string, string | string[]> = {};
    let activeSection: string = "sandwiches";
    let filteredProducts: Product[] = [];

    /* OPEN MODAL FOR CUSTOMIZATION */
    function openModal(product: Product) {
        selectedProduct = product;
        noteInput = "";
        selections = {};
        
        // Initialize selections for customizations
        if (product.customizations) {
            product.customizations.forEach((customization) => {
                if (customization.type === "single") {
                    selections[customization.id] = "";
                } else {
                    selections[customization.id] = [];
                }
            });
        }
        
        showModal = true;
    }

    function closeModal() {
        showModal = false;
        selectedProduct = null;
        selections = {};
        noteInput = "";
    }

    function toggleMultipleOption(customizationId: string, optionValue: string) {
        const current = selections[customizationId] as string[];
        if (current.includes(optionValue)) {
            selections[customizationId] = current.filter((v) => v !== optionValue);
        } else {
            selections[customizationId] = [...current, optionValue];
        }
    }

    function calculateFinalPrice(product: Product, selections: Record<string, string | string[]>): number {
        let total = product.price;

        if (product.customizations) {
            product.customizations.forEach((customization) => {
                const selection = selections[customization.id];

                if (customization.type === "single" && typeof selection === "string") {
                    const option = customization.options.find((o) => o.value === selection);
                    if (option) {
                        total += option.price;
                    }
                } else if (customization.type === "multiple" && Array.isArray(selection)) {
                    selection.forEach((value) => {
                        const option = customization.options.find((o) => o.value === value);
                        if (option) {
                            total += option.price;
                        }
                    });
                }
            });
        }

        return total;
    }

    function canAddToCart(): boolean {
        if (!selectedProduct) return false;

        // If no customizations exist, can always add to cart
        if (!selectedProduct.customizations || selectedProduct.customizations.length === 0) {
            return true;
        }

        // Check if all required customizations are filled
        for (const customization of selectedProduct.customizations) {
            if (customization.required) {
                const selection = selections[customization.id];
                
                if (customization.type === "single") {
                    if (!selection || selection === "") {
                        return false;
                    }
                }
                
                if (customization.type === "multiple") {
                    if (!Array.isArray(selection) || selection.length === 0) {
                        return false;
                    }
                }
            }
        }

        return true;
    }

    $: currentPrice = selectedProduct ? calculateFinalPrice(selectedProduct, selections) : 0;
    
    $: canAdd = selectedProduct && selections && canAddToCart();

    $: {
        console.log("🔄 REACTIVE UPDATE:");
        console.log("  selectedProduct:", selectedProduct?.name);
        console.log("  selections:", selections);
        console.log("  canAdd:", canAdd);
    }

    function addToCart() {
        if (!selectedProduct || !canAdd) return;
        const finalPrice = calculateFinalPrice(selectedProduct, selections);

        cart = [
            ...cart,
            {
                ...selectedProduct,
                note: noteInput,
                selections: { ...selections },
                finalPrice,
            },
        ];

        closeModal();
    }

    function removeFromCart(index: number) {
        cart = cart.filter((_, i) => i !== index);
    }

    async function submitOrder() {
        if (cart.length === 0) return;
        if (name === "") return;

        try {
            await createOrder(name, cart);
            cart = [];
            goto("/orders");
        } catch {
            alert("Failed to submit order");
        }
    }

    async function selectSection(section: string) {
        activeSection = section;

        try {
            filteredProducts = await getProducts(section);
        } catch (err) {
            console.error("Failed to load products", err);
        }
    }

    function getSelectionDisplay(item: CartItem): string[] {
        if (!item.selections || !item.customizations) return [];

        const displays: string[] = [];

        item.customizations.forEach((customization) => {
            const selection = item.selections![customization.id];

            if (customization.type === "single" && typeof selection === "string" && selection) {
                const option = customization.options.find((o) => o.value === selection);
                if (option) {
                    displays.push(`${customization.label}: ${option.label}`);
                }
            } else if (customization.type === "multiple" && Array.isArray(selection) && selection.length > 0) {
                const labels = selection
                    .map((value) => {
                        const option = customization.options.find((o) => o.value === value);
                        return option?.label;
                    })
                    .filter(Boolean);
                if (labels.length > 0) {
                    displays.push(`${customization.label}: ${labels.join(", ")}`);
                }
            }
        });

        return displays;
    }

    $: total = cart.reduce((sum, item) => sum + (item.finalPrice || item.price), 0);

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
        if (!$session) {
            goto("/");
            return;
        }
        selectSection(activeSection);
    });
</script>

<main class="mobile-layout">

    <div class="user-header">
        <h1>Menu</h1>
    </div>

    <label>
        Name
        <input 
            name="name" 
            bind:value={name} 
            readonly={isNameFromSession}
            class:readonly={isNameFromSession}
        />
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
            <p>Available on white sourdough bread or wheatberry bread, or on a regular tortilla, sun-dried tomato, or spinach wrap!</p>
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
            <p>Add on to your meal with one of our delicious sides!</p>
        {/if}

        {#each Object.entries(groupedProducts) as [subsection, products]}
            <h3>{subsection}</h3>
            {#each products as product}
                <button class="product-card" on:click={() => openModal(product)} type="button">
                    <div class="product-info">
                        <strong>{product.name}</strong>
                    </div>
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
                        {#each getSelectionDisplay(item) as display}
                            <p class="selection">{display}</p>
                        {/each}
                        {#if item.note}<p class="note">📝 {item.note}</p>{/if}
                    </div>
                    <div class="price">
                        ${(item.finalPrice || item.price).toFixed(2)}
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

    <!-- Customization Modal -->
    {#if showModal && selectedProduct}
        <div class="modal-backdrop" on:click={closeModal} on:keydown={(e) => e.key === 'Escape' && closeModal()} role="button" tabindex="-1" aria-label="Close modal"></div>
        <div class="modal-centered">
            <div class="modal-content">
                <button class="modal-close" on:click={closeModal} type="button">✕</button>
                
                <h2>{selectedProduct.name}</h2>
                <p class="base-price">Base Price: ${selectedProduct.price.toFixed(2)}</p>

                {#if selectedProduct.description}
                    <p class="modal-description">{selectedProduct.description}</p>
                {/if}

                {#if selectedProduct.customizations && selectedProduct.customizations.length > 0}
                    <div class="customizations">
                        {#each selectedProduct.customizations as customization}
                            <div class="customization-group">
                                <h3>
                                    {customization.label}
                                    {#if customization.required}<span class="required">*</span>{/if}
                                </h3>

                                {#if customization.type === "single"}
                                    <div class="options-grid">
                                        {#each customization.options as option}
                                            <button
                                                type="button"
                                                class="option-btn"
                                                class:selected={selections[customization.id] === option.value}
                                                on:click={() => (selections[customization.id] = option.value)}
                                            >
                                                <span class="option-label">{option.label}</span>
                                                {#if option.price > 0}
                                                    <span class="option-price">+${option.price.toFixed(2)}</span>
                                                {/if}
                                            </button>
                                        {/each}
                                    </div>
                                {:else}
                                    <div class="options-grid">
                                        {#each customization.options as option}
                                            <button
                                                type="button"
                                                class="option-btn"
                                                class:selected={selections[customization.id] && (selections[customization.id] as string[]).includes(option.value)}
                                                on:click={() => toggleMultipleOption(customization.id, option.value)}
                                            >
                                                <span class="option-label">{option.label}</span>
                                                {#if option.price > 0}
                                                    <span class="option-price">+${option.price.toFixed(2)}</span>
                                                {/if}
                                            </button>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        {/each}
                    </div>
                {/if}

                <label class="note-label">
                    Special Instructions (optional)
                    <textarea
                        placeholder="Add any special requests here..."
                        bind:value={noteInput}
                        rows="3"
                    ></textarea>
                </label>

                <div class="modal-footer">
                    <div class="current-price">
                        Total: <strong>${currentPrice.toFixed(2)}</strong>
                    </div>
                    <button
                        class="add-to-cart-btn"
                        on:click={addToCart}
                        disabled={!canAdd}
                        type="button"
                    >
                        Add to Cart
                    </button>
                </div>
            </div>
        </div>
    {/if}
</main>

<style>
    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }

    .modal-centered {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        width: 90%;
        max-width: 600px;
        max-height: 90vh;
        overflow-y: auto;
    }

    .modal-content {
        background: white;
        border-radius: 12px;
        padding: 2rem;
        position: relative;
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
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
    }

    .modal-close:hover {
        background: #e0e0e0;
    }

    .modal-content h2 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }

    .base-price {
        color: #666;
        font-size: 0.95rem;
        margin: 0 0 1rem 0;
    }

    .modal-description {
        color: #555;
        margin: 0 0 1.5rem 0;
        line-height: 1.5;
    }

    .customizations {
        margin: 1.5rem 0;
    }

    .customization-group {
        margin-bottom: 1.5rem;
    }

    .customization-group h3 {
        margin: 0 0 0.75rem 0;
        font-size: 1rem;
        color: #333;
    }

    .required {
        color: #e76f51;
        font-weight: bold;
    }

    .options-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 0.75rem;
    }

    .option-btn {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 0.75rem;
        background: #f8f9fa;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
        min-height: 60px;
    }

    .option-btn:hover {
        background: #e9ecef;
        border-color: #ced4da;
    }

    .option-btn.selected {
        background: #e76f51;
        border-color: #e76f51;
        color: white;
    }

    .option-label {
        font-weight: 500;
        text-align: center;
        font-size: 0.9rem;
    }

    .option-price {
        font-size: 0.85rem;
        margin-top: 0.25rem;
        opacity: 0.8;
    }

    .note-label {
        display: block;
        margin: 1.5rem 0;
        font-weight: 500;
        color: #333;
    }

    .note-label textarea {
        width: 100%;
        padding: 0.75rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        margin-top: 0.5rem;
        font-family: inherit;
        resize: vertical;
    }

    .modal-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 1.5rem;
        padding-top: 1.5rem;
        border-top: 1px solid #e0e0e0;
    }

    .current-price {
        font-size: 1.1rem;
        color: #333;
    }

    .current-price strong {
        font-size: 1.3rem;
        color: #e76f51;
    }

    .add-to-cart-btn {
        padding: 0.75rem 2rem;
        background: #2a9d8f;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        font-size: 1rem;
        transition: background 0.2s;
    }

    .add-to-cart-btn:hover:not(:disabled) {
        background: #238276;
    }

    .add-to-cart-btn:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .selection {
        font-size: 0.85rem;
        color: #666;
        margin: 0.25rem 0;
    }

    /* Keep your existing styles for the rest of the page */
    .mobile-layout {
        max-width: 1200px;
        margin: 0 auto;
        padding: 1rem;
    }

    h1 {
        text-align: center;
        margin-bottom: 1.5rem;
    }

    label {
        display: block;
        margin-bottom: 1rem;
    }

    input, select {
        width: 100%;
        padding: 0.5rem;
        margin-top: 0.25rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .menu-nav {
        display: flex;
        gap: 0.5rem;
        margin: 1.5rem 0;
        overflow-x: auto;
    }

    .menu-nav button {
        padding: 0.5rem 1rem;
        background: #f0f0f0;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        white-space: nowrap;
    }

    .menu-nav button.active {
        background: #e76f51;
        color: white;
    }

    .menu-section {
        margin: 2rem 0;
    }

    .menu-section h2 {
        margin-bottom: 0.5rem;
    }

    .menu-section h3 {
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
        color: #555;
    }

    .product-card {
        display: flex;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        padding: 1rem;
        margin-bottom: 0.5rem;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }

    .product-card:hover {
        border-color: #e76f51;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }

    .price {
        font-weight: bold;
        color: #e76f51;
    }

    .cart {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 8px;
        margin: 2rem 0;
    }

    .cart-item {
        display: flex;
        justify-content: space-between;
        padding: 1rem;
        background: white;
        border-radius: 6px;
        margin-bottom: 0.5rem;
    }

    .cart-item button {
        background: #e76f51;
        color: white;
        border: none;
        border-radius: 4px;
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        margin-left: 0.5rem;
    }

    .note {
        font-size: 0.85rem;
        color: #666;
        margin: 0.25rem 0;
    }

    .total {
        margin-top: 1rem;
        padding-top: 1rem;
        border-top: 2px solid #e0e0e0;
        font-size: 1.1rem;
        text-align: right;
    }

    .submit {
        width: 100%;
        padding: 1rem;
        background: #2a9d8f;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 1.1rem;
        cursor: pointer;
    }

    .submit:disabled {
        background: #ccc;
        cursor: not-allowed;
    }

    .empty {
        color: #999;
        text-align: center;
        padding: 2rem;
    }
</style>
