import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";

let checked = false;

export function validateRuntimeConfig() {
    if (checked) {
        return;
    }

    checked = true;

    const required = ["MONGODB_URI", "AUTH_SECRET", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];
    const missing = required.filter((key) => !env[key]);

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
    }

    if (!dev && env.ADMIN_DEFAULT_PASSWORD === "secret123") {
        throw new Error("ADMIN_DEFAULT_PASSWORD cannot be secret123 in production.");
    }
}
