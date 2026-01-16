<script lang="ts">
    export let form;
</script>

<main class="container">
    <h1>Add Menu Item</h1>

    <form method="POST">
        <label>
            Name
            <input name="name" required />
        </label>

        <label>
            Description
            <textarea name="description"></textarea>
        </label>

        <label>
            Price ($)
            <input name="price" type="number" step="0.01" required />
        </label>

        <button>Add Item</button>
    </form>

    <a href="/order" class="back">← Back to Menu</a>
</main>

<style>
    .container {
        max-width: 480px;
        margin: 3rem auto;
        padding: 1.5rem;
    }

    form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
    }

    input,
    textarea {
        width: 100%;
        padding: 0.5rem;
    }

    button {
        padding: 0.75rem;
        background: #e76f51;
        color: white;
        border: none;
        border-radius: 8px;
        font-weight: bold;
        cursor: pointer;
    }

    .back {
        display: inline-block;
        margin-top: 1rem;
        text-decoration: none;
        color: #555;
    }
</style>
