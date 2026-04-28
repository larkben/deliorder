<script lang="ts">
    import { goto } from "$app/navigation";
    import { createProduct } from "$lib/api";

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

    let name = "";
    let description = "";
    let price = 0;
    let section = "sandwiches";
    let subsection = "";
    let customizations: Customization[] = [];
    let submitting = false;
    let error = "";

    function addCustomization() {
        customizations = [
            ...customizations,
            {
                id: crypto.randomUUID(),
                label: "",
                type: "single",
                required: false,
                options: [],
            },
        ];
    }

    function removeCustomization(index: number) {
        customizations = customizations.filter((_, i) => i !== index);
    }

    function addOption(customizationIndex: number) {
        customizations[customizationIndex].options = [
            ...customizations[customizationIndex].options,
            { value: "", label: "", price: 0 },
        ];
    }

    function removeOption(customizationIndex: number, optionIndex: number) {
        customizations[customizationIndex].options = customizations[
            customizationIndex
        ].options.filter((_, i) => i !== optionIndex);
    }

    async function handleSubmit(e: Event) {
        e.preventDefault();
        error = "";

        if (!name.trim() || !price || !section) {
            error = "Name, price, and section are required.";
            return;
        }

        // Filter out empty customizations and options
        const cleanedCustomizations = customizations
            .filter((c) => c.label.trim() && c.options.length > 0)
            .map((c) => ({
                ...c,
                options: c.options.filter(
                    (o) => o.value.trim() && o.label.trim()
                ),
            }))
            .filter((c) => c.options.length > 0);

        submitting = true;
        try {
            await createProduct({
                name: name.trim(),
                description: description.trim() || undefined,
                price,
                section,
                subsection: subsection.trim() || undefined,
                customizations: cleanedCustomizations,
            });
            goto("/order");
        } catch (err) {
            error = err instanceof Error ? err.message : "Failed to add item.";
        } finally {
            submitting = false;
        }
    }
</script>

<main class="container">
    <h1>Add Menu Item</h1>

    {#if error}
        <p class="error-msg">{error}</p>
    {/if}

    <form on:submit={handleSubmit}>
        <label>
            Name
            <input bind:value={name} required />
        </label>

        <label>
            Description
            <textarea bind:value={description}></textarea>
        </label>

        <label>
            Price ($)
            <input bind:value={price} type="number" step="0.01" min="0" required />
        </label>

        <label>
            Section
            <select bind:value={section} required>
                <option value="sandwiches">Sandwiches</option>
                <option value="kids-meals">Kids Meals</option>
                <option value="salads">Salads</option>
                <option value="drinks">Drinks</option>
                <option value="sides">Sides</option>
            </select>
        </label>

        <label>
            Subsection
            <input bind:value={subsection} />
        </label>

        <div class="customizations-section">
            <div class="section-header">
                <h2>Customization Options</h2>
                <button type="button" on:click={addCustomization} class="add-btn">
                    + Add Customization
                </button>
            </div>

            {#each customizations as customization, custIndex}
                <div class="customization-block">
                    <div class="customization-header">
                        <input
                            type="text"
                            placeholder="Customization name (e.g., Choose your bread)"
                            bind:value={customization.label}
                            class="customization-label"
                        />
                        <button
                            type="button"
                            on:click={() => removeCustomization(custIndex)}
                            class="remove-btn"
                        >
                            ✕
                        </button>
                    </div>

                    <div class="customization-settings">
                        <label class="inline-label">
                            <select bind:value={customization.type}>
                                <option value="single">Single Choice</option>
                                <option value="multiple">Multiple Choice</option>
                            </select>
                        </label>

                        <label class="inline-label checkbox-label">
                            <input
                                type="checkbox"
                                bind:checked={customization.required}
                            />
                            Required
                        </label>
                    </div>

                    <div class="options-list">
                        <h4>Options:</h4>
                        {#each customization.options as option, optIndex}
                            <div class="option-row">
                                <input
                                    type="text"
                                    placeholder="Value (e.g., wheat)"
                                    bind:value={option.value}
                                    class="option-value"
                                />
                                <input
                                    type="text"
                                    placeholder="Label (e.g., Wheat Bread)"
                                    bind:value={option.label}
                                    class="option-label"
                                />
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="Price"
                                    bind:value={option.price}
                                    class="option-price"
                                />
                                <button
                                    type="button"
                                    on:click={() => removeOption(custIndex, optIndex)}
                                    class="remove-option-btn"
                                >
                                    ✕
                                </button>
                            </div>
                        {/each}
                        <button
                            type="button"
                            on:click={() => addOption(custIndex)}
                            class="add-option-btn"
                        >
                            + Add Option
                        </button>
                    </div>
                </div>
            {/each}
        </div>

        <button type="submit" class="submit-btn" disabled={submitting}>
            {submitting ? "Adding…" : "Add Item"}
        </button>
    </form>

    <a href="/order" class="back">← Back to Menu</a>
</main>

<style>
    .container {
        max-width: 720px;
        margin: 3rem auto;
        padding: 1.5rem;
    }

    .error-msg {
        background: #fee;
        border: 1px solid #fcc;
        color: #c0392b;
        padding: 0.75rem 1rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        font-size: 0.95rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    input,
    textarea,
    select {
        width: 100%;
        padding: 0.5rem;
        border: 1px solid #ddd;
        border-radius: 4px;
    }

    .customizations-section {
        margin-top: 2rem;
        padding: 1.5rem;
        background: #f8f9fa;
        border-radius: 8px;
    }

    .section-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
    }

    .section-header h2 {
        margin: 0;
        font-size: 1.25rem;
    }

    .add-btn {
        padding: 0.5rem 1rem;
        background: #2a9d8f;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.9rem;
        cursor: pointer;
    }

    .add-btn:hover {
        background: #238276;
    }

    .customization-block {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        margin-bottom: 1rem;
        border: 1px solid #e0e0e0;
    }

    .customization-header {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1rem;
    }

    .customization-label {
        flex: 1;
        font-weight: 600;
    }

    .remove-btn {
        padding: 0.5rem 0.75rem;
        background: #e76f51;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1rem;
    }

    .remove-btn:hover {
        background: #d45a3e;
    }

    .customization-settings {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .inline-label {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .inline-label select {
        width: auto;
        padding: 0.4rem;
    }

    .checkbox-label {
        font-weight: normal;
    }

    .checkbox-label input[type="checkbox"] {
        width: auto;
        margin: 0;
    }

    .options-list {
        margin-top: 1rem;
    }

    .options-list h4 {
        margin: 0 0 0.5rem 0;
        font-size: 0.9rem;
        color: #666;
    }

    .option-row {
        display: grid;
        grid-template-columns: 1fr 2fr 100px 40px;
        gap: 0.5rem;
        margin-bottom: 0.5rem;
        align-items: center;
    }

    .option-value,
    .option-label,
    .option-price {
        padding: 0.4rem;
        font-size: 0.9rem;
    }

    .remove-option-btn {
        padding: 0.4rem;
        background: #ff6b6b;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.9rem;
    }

    .remove-option-btn:hover {
        background: #ee5a52;
    }

    .add-option-btn {
        padding: 0.4rem 0.75rem;
        background: #4a90e2;
        color: white;
        border: none;
        border-radius: 4px;
        font-size: 0.85rem;
        cursor: pointer;
        margin-top: 0.5rem;
    }

    .add-option-btn:hover {
        background: #357abd;
    }

    .submit-btn {
        padding: 0.75rem;
        background: #e76f51;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
        font-size: 1rem;
        margin-top: 1rem;
    }

    .submit-btn:hover:not(:disabled) {
        background: #d45a3e;
    }

    .submit-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
    }

    .back {
        display: inline-block;
        margin-top: 1rem;
        text-decoration: none;
        color: #555;
    }

    .back:hover {
        color: #333;
    }
</style>
