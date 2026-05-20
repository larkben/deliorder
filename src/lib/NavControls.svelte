<script lang="ts">
    function goBack() {
        history.back();
    }

    function goForward() {
        history.forward();
    }
</script>

<nav class="history-nav" aria-label="Page history controls">
    <button type="button" on:click={goBack} aria-label="Go back" title="Go back">
        ←
    </button>
    <button type="button" on:click={goForward} aria-label="Go forward" title="Go forward">
        →
    </button>
</nav>

<style>
    .history-nav {
        position: fixed;
        top: 0.75rem;
        left: 0.75rem;
        z-index: 900;
        display: flex;
        gap: 0.35rem;
        padding: 0.3rem;
        background: rgba(255, 255, 255, 0.92);
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
        backdrop-filter: blur(8px);
    }

    button {
        width: 2.25rem;
        height: 2.25rem;
        border: none;
        border-radius: 6px;
        background: #333;
        color: white;
        cursor: pointer;
        font-size: 1.1rem;
        font-weight: 800;
        line-height: 1;
    }

    button:hover {
        background: #e76f51;
    }

    @media (max-width: 640px) {
        .history-nav {
            top: auto;
            bottom: 0.75rem;
            left: 0.75rem;
        }
    }
</style>
