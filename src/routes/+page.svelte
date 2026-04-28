<script lang="ts">
    import { goto } from "$app/navigation";
    import { session, signIn, signOut } from "$lib/auth";

    let signingIn = false;
    let error = "";

    async function handleSignIn() {
        signingIn = true;
        error = "";
        try {
            await signIn();
            // give the store a moment to update, then redirect
            setTimeout(() => { if ($session) goto("/order"); }, 300);
        } catch (e) {
            error = "Sign-in failed. Please try again.";
        } finally {
            signingIn = false;
        }
    }
</script>

<main>
    <h1>🥪 Peanut Butter & Deli</h1>

    {#if $session}
        <p>Welcome, {$session.user.name}!</p>
        <a href="/order">Go to menu →</a>
        <button on:click={signOut}>Sign out</button>
    {:else}
        {#if error}<p class="error">{error}</p>{/if}
        <button on:click={handleSignIn} disabled={signingIn}>
            {signingIn ? "Opening browser…" : "Sign in with Google"}
        </button>
    {/if}
</main>

<style>
    main { max-width: 480px; margin: 6rem auto; text-align: center; font-family: sans-serif; }
    h1   { margin-bottom: 2rem; }
    button, a {
        display: inline-block; margin: 0.5rem;
        padding: 0.75rem 1.5rem; border-radius: 8px;
        font-size: 1rem; font-weight: 600; cursor: pointer; text-decoration: none;
    }
    button { background: #e76f51; color: white; border: none; }
    button:hover:not(:disabled) { background: #d45a3e; }
    button:disabled { opacity: 0.6; cursor: not-allowed; }
    a    { background: #2a9d8f; color: white; }
    .error { color: #c0392b; margin-bottom: 1rem; }
</style>
