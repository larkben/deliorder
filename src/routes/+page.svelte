<script lang="ts">
    let username = "";
    let password = "";

    function handleLogin() {
        // Placeholder for authentication logic
        alert(`Logging in as ${username}`);
    }
</script>

<main class="container">
    <h1>🥪 Peanut Butter & Deli</h1>
    <p class="tagline">Order your favorite sandwiches fast and fresh</p>

    <div class="login-card">
        <h2>Login to Order</h2>

        <input type="text" placeholder="Username" bind:value={username} />

        <input type="password" placeholder="Password" bind:value={password} />

        <button on:click={handleLogin}> Login </button>

        <a href="/order" class="order-link"> Start Order </a>
    </div>
</main>

<style>
    .container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #f7d046, #f4a261);
        font-family: system-ui, sans-serif;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 0.25rem;
    }

    .tagline {
        margin-bottom: 2rem;
        font-size: 1.1rem;
        color: #333;
    }

    .login-card {
        background: white;
        padding: 2rem;
        border-radius: 12px;
        width: 100%;
        max-width: 360px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
        text-align: center;
    }

    .login-card h2 {
        margin-bottom: 1rem;
    }

    input {
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 1rem;
        border-radius: 8px;
        border: 1px solid #ccc;
        font-size: 1rem;
    }

    button {
        width: 100%;
        padding: 0.75rem;
        border: none;
        border-radius: 8px;
        background-color: #e76f51;
        color: white;
        font-size: 1rem;
        font-weight: bold;
        cursor: pointer;
    }

    button:hover {
        background-color: #d65a3c;
    }

    .signup {
        margin-top: 1rem;
        font-size: 0.9rem;
    }

    .signup a {
        color: #e76f51;
        text-decoration: none;
        font-weight: 600;
    }
</style>
