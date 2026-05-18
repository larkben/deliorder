<script lang="ts">
    import { enhance } from "$app/forms";

    export let data;
    export let form;

    const formatDate = (date: string) => new Date(`${date}T00:00:00`).toLocaleDateString();
</script>

<main class="days-page">
    <header>
        <a href="/admin" class="back-link">Back to Admin</a>
        <h1>Delivery Days</h1>
        <p>Create the days customers can order for, then close a day when all orders are in.</p>
    </header>

    <section class="panel">
        <h2>Create Delivery Day</h2>
        <form class="day-form" method="POST" action="?/create" use:enhance>
            <label>
                Name
                <input name="label" placeholder="Friday Lunch" />
            </label>
            <label>
                Date
                <input name="date" type="date" />
            </label>
            <label>
                Status
                <select name="status">
                    <option value="open">Open</option>
                    <option value="closed">Closed</option>
                </select>
            </label>
            <button class="primary-btn" type="submit">Add Day</button>
        </form>

        {#if form?.dayError}
            <p class="form-error">{form.dayError}</p>
        {/if}
        {#if form?.daySuccess}
            <p class="form-success">{form.daySuccess}</p>
        {/if}
    </section>

    <section class="panel">
        <h2>All Delivery Days</h2>
        {#if data.deliveryDays.length === 0}
            <p class="empty">No delivery days have been created yet.</p>
        {:else}
            <div class="day-list">
                {#each data.deliveryDays as day}
                    <form class="day-row" method="POST" action="?/update" use:enhance>
                        <input type="hidden" name="id" value={day.id} />
                        <label>
                            Name
                            <input name="label" value={day.label} />
                        </label>
                        <label>
                            Date
                            <input name="date" type="date" value={day.date} />
                        </label>
                        <label>
                            Status
                            <select name="status">
                                <option value="open" selected={day.status === "open"}>Open</option>
                                <option value="closed" selected={day.status === "closed"}>Closed</option>
                            </select>
                        </label>
                        <div class="day-actions">
                            <span class:closed={day.status === "closed"}>{formatDate(day.date)} · {day.status}</span>
                            <button class="secondary-btn" type="submit">Update</button>
                            {#if day.status !== "closed"}
                                <button class="secondary-btn" type="submit" formaction="?/close">Close</button>
                            {/if}
                            <button class="danger-btn" type="submit" formaction="?/delete">Delete</button>
                        </div>
                    </form>
                {/each}
            </div>
        {/if}
    </section>
</main>

<style>
    .days-page {
        max-width: 1080px;
        margin: 0 auto;
        padding: 2rem 1.5rem 4rem;
        color: #333;
    }

    header {
        margin-bottom: 1.5rem;
    }

    h1,
    h2,
    p {
        margin: 0;
    }

    h1 {
        font-size: 2.25rem;
        margin: 0.5rem 0;
    }

    header p,
    .empty {
        color: #666;
    }

    .back-link {
        color: #e76f51;
        font-weight: 700;
        text-decoration: none;
    }

    .panel {
        background: white;
        border: 1px solid #e8e8e8;
        border-radius: 8px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
        padding: 1.25rem;
        margin-bottom: 1rem;
    }

    .day-form,
    .day-row {
        display: grid;
        grid-template-columns: 1.2fr 1fr 0.8fr auto;
        gap: 0.8rem;
        align-items: end;
        margin-top: 1rem;
    }

    .day-row {
        grid-template-columns: 1.1fr 0.9fr 0.8fr 1.4fr;
        padding: 1rem 0;
        border-top: 1px solid #f0f0f0;
    }

    label {
        display: grid;
        gap: 0.35rem;
        color: #555;
        font-weight: 600;
    }

    input,
    select {
        box-sizing: border-box;
        width: 100%;
        padding: 0.65rem;
        border: 1px solid #ddd;
        border-radius: 6px;
        font-size: 1rem;
    }

    .day-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.5rem;
        flex-wrap: wrap;
    }

    .day-actions span {
        color: #067647;
        font-size: 0.9rem;
        margin-right: auto;
    }

    .day-actions .closed {
        color: #666;
    }

    button {
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 700;
        padding: 0.65rem 0.9rem;
    }

    .primary-btn {
        background: #e76f51;
        color: white;
    }

    .secondary-btn {
        background: #333;
        color: white;
    }

    .danger-btn {
        background: #b42318;
        color: white;
    }

    .form-error,
    .form-success {
        margin-top: 0.75rem;
        font-size: 0.9rem;
    }

    .form-error {
        color: #b42318;
    }

    .form-success {
        color: #067647;
    }

    @media (max-width: 840px) {
        .day-form,
        .day-row {
            grid-template-columns: 1fr;
        }

        .day-actions {
            justify-content: flex-start;
        }
    }
</style>
