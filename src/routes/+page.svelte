<script lang="ts">
    import { signIn } from "@auth/sveltekit/client";
    import { goto } from "$app/navigation";

    export let data;

    let username = "";
    let password = "";
    let showAdminLogin = false;
    let showGoogleLogin = false;

    async function handleGoogleLogin() {
        await signIn("google", { callbackUrl: "/order" });
    }

    function handleAdminLogin() {
        // TODO: Implement admin authentication
        alert(`Admin logging in as ${username}`);
        showAdminLogin = false;
        goto("/orders");
    }

    function toggleAdminLogin() {
        showAdminLogin = !showAdminLogin;
    }

    function openGoogleLogin() {
        showGoogleLogin = true;
    }

    function closeGoogleLogin() {
        showGoogleLogin = false;
    }

    // If already logged in, show option to continue
    $: isLoggedIn = !!data?.session?.user;
</script>

<!-- Admin login trigger -->
<button class="admin-button" on:click={toggleAdminLogin}>
    Admin Login
</button>

<!-- Admin popup -->
{#if showAdminLogin}
    <div class="modal-backdrop" on:click={toggleAdminLogin}></div>
    <div class="admin-popup">
        <button class="close-btn" on:click={toggleAdminLogin}>✕</button>
        <h3>Admin Login</h3>

        <input type="text" placeholder="Username" bind:value={username} />

        <input type="password" placeholder="Password" bind:value={password} />

        <button class="login-btn" on:click={handleAdminLogin}>Login</button>
    </div>
{/if}

<!-- Google Login Modal -->
{#if showGoogleLogin}
    <div class="modal-backdrop" on:click={closeGoogleLogin}></div>
    <div class="google-login-modal">
        <button class="close-btn" on:click={closeGoogleLogin}>✕</button>
        <h2>Sign in to order</h2>
        <p class="modal-description">Sign in with your school Google account to continue</p>

        <button class="google-signin-btn" on:click={handleGoogleLogin}>
            <svg width="18" height="18" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
                <path
                    fill="#EA4335"
                    d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                />
                <path
                    fill="#4285F4"
                    d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                />
                <path
                    fill="#FBBC05"
                    d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                />
                <path
                    fill="#34A853"
                    d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                />
                <path fill="none" d="M0 0h48v48H0z" />
            </svg>
            Sign in with Google
        </button>
    </div>
{/if}

<main class="container">
    <h1>🥪 Peanut Butter & Deli</h1>
    <p class="tagline">Fresh sandwiches made to order</p>

    {#if isLoggedIn}
        <div class="user-info">
            <p>Welcome back, {data.session.user.name}!</p>
            <a href="/order" class="order-link"> Continue to Order </a>
        </div>
    {:else}
        <button class="order-link" on:click={openGoogleLogin}>
            Start Your Order
        </button>
    {/if}
</main>

<style>
    .container {
        max-width: 600px;
        margin: 0 auto;
        padding: 3rem 1.5rem;
        text-align: center;
    }

    h1 {
        font-size: 2.5rem;
        margin-bottom: 1rem;
        color: #333;
    }

    .tagline {
        font-size: 1.1rem;
        color: #666;
        margin-bottom: 2rem;
    }

    .user-info {
        background: #f8f9fa;
        padding: 1.5rem;
        border-radius: 12px;
        margin-bottom: 1rem;
    }

    .user-info p {
        margin: 0 0 1rem 0;
        font-size: 1.1rem;
        color: #333;
    }

    .order-link {
        display: inline-block;
        padding: 1rem 2rem;
        background: #e76f51;
        color: white;
        text-decoration: none;
        border-radius: 8px;
        font-weight: bold;
        font-size: 1.1rem;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
    }

    .order-link:hover {
        background: #d45a3e;
        transform: translateY(-2px);
    }

    .admin-button {
        position: fixed;
        bottom: 1rem;
        right: 1rem;
        padding: 0.5rem 1rem;
        background: #333;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        opacity: 0.7;
        transition: opacity 0.2s;
    }

    .admin-button:hover {
        opacity: 1;
    }

    .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 999;
    }

    .admin-popup,
    .google-login-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 2rem;
        border-radius: 12px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000;
        min-width: 300px;
    }

    .google-login-modal {
        max-width: 400px;
        text-align: center;
    }

    .close-btn {
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
    }

    .close-btn:hover {
        background: #e0e0e0;
    }

    .google-login-modal h2 {
        margin: 0 0 0.5rem 0;
        color: #333;
    }

    .modal-description {
        color: #666;
        margin-bottom: 2rem;
        font-size: 0.95rem;
    }

    .google-signin-btn {
        width: 100%;
        padding: 0.75rem 1.5rem;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        font-size: 1rem;
        font-weight: 500;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        transition: all 0.2s;
    }

    .google-signin-btn:hover {
        background: #f8f9fa;
        border-color: #4285f4;
        box-shadow: 0 2px 8px rgba(66, 133, 244, 0.2);
    }

    .admin-popup h3 {
        margin: 0 0 1.5rem 0;
        color: #333;
    }

    .admin-popup input {
        width: 100%;
        padding: 0.75rem;
        margin-bottom: 1rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }

    .login-btn {
        width: 100%;
        padding: 0.75rem;
        background: #333;
        color: white;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        font-size: 1rem;
    }

    .login-btn:hover {
        background: #555;
    }
</style>

