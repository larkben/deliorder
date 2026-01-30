<script lang="ts">
    let username = "";
    let password = "";
    let showAdminLogin = false;

    function handleLogin() {
        alert(`Admin logging in as ${username}`);
        showAdminLogin = false;
    }

    function toggleAdminLogin() {
        showAdminLogin = !showAdminLogin;
    }
</script>

<!-- Admin login trigger -->
<button class="admin-button" on:click={toggleAdminLogin}>
    Admin Login
</button>

<!-- Admin popup -->
{#if showAdminLogin}
    <div class="admin-popup">
        <h3>Admin Login</h3>

        <input
            type="text"
            placeholder="Username"
            bind:value={username}
        />

        <input
            type="password"
            placeholder="Password"
            bind:value={password}
        />

        <button on:click={handleLogin}>Login</button>
    </div>
{/if}

<main class="container">
    <h1>🥪 Peanut Butter & Deli</h1>
    <p class="tagline">.. some text</p>

    <a href="/order" class="order-link">
        Start Your Order
    </a>
</main>

<style>
    .container {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #cb70da, #5153d2);
        font-family: system-ui, sans-serif;
        text-align: center;
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

    .order-link {
        display: inline-block;
        padding: 1rem 2.5rem;
        font-size: 1.2rem;
        font-weight: bold;
        background-color: #cf5ae3;
        color: white;
        border-radius: 12px;
        text-decoration: none;
        box-shadow: 0 8px 20px rgba(47, 15, 47, 0.2);
    }

    .order-link:hover {
        background-color: #ca41d3;
    }

    /* Admin button (top right) */
    .admin-button {
        position: fixed;
        top: 16px;
        right: 16px;
        background: rgba(255,255,255,0.85);
        border: none;
        padding: 0.5rem 0.75rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
    }

    /* Admin popup */
    .admin-popup {
        position: fixed;
        top: 60px;
        right: 16px;
        background: rgb(238, 233, 239);
        padding: 1.5rem;
        width: 280px;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.25);
        z-index: 1000;
    }

    .admin-popup h3 {
        margin-bottom: 1rem;
        text-align: center;
    }

    .admin-popup input {
        width: 100%;
        padding: 0.6rem;
        padding-right: 0.1rem;
        margin-bottom: 0.75rem;
        border-radius: 6px;
        border: 1px solid #ccc;
    }

    .admin-popup button {
        width: 100%;
        padding: 0.6rem;
        border: none;
        border-radius: 6px;
        background-color: #de53e5;
        color: white;
        font-weight: bold;
        cursor: pointer;
    }

    .admin-popup button:hover {
        background-color: #c042f2;
    }
</style>

