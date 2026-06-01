import type { PageServerLoad } from "./$types";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { loginAdmin } from "$lib/server/adminAuth";

const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;
const loginAttempts = new Map<string, { count: number; resetAt: number }>();

function rateLimitKey(username: string, address: string) {
    return `${address}:${username.toLowerCase()}`;
}

function isRateLimited(key: string) {
    const attempt = loginAttempts.get(key);
    const now = Date.now();

    if (!attempt || attempt.resetAt <= now) {
        loginAttempts.set(key, { count: 0, resetAt: now + LOGIN_WINDOW_MS });
        return false;
    }

    return attempt.count >= MAX_LOGIN_ATTEMPTS;
}

function recordFailedLogin(key: string) {
    const now = Date.now();
    const attempt = loginAttempts.get(key) ?? { count: 0, resetAt: now + LOGIN_WINDOW_MS };

    loginAttempts.set(key, {
        count: attempt.count + 1,
        resetAt: attempt.resetAt > now ? attempt.resetAt : now + LOGIN_WINDOW_MS,
    });
}

export const load: PageServerLoad = async (event) => {
    const session = await event.locals.auth();
    
    return {
        session,
    };
};

export const actions: Actions = {
    adminLogin: async ({ request, cookies, getClientAddress }) => {
        const data = await request.formData();
        const username = data.get("username")?.toString().trim() ?? "";
        const password = data.get("password")?.toString() ?? "";

        if (!username || !password) {
            return fail(400, { adminError: "Enter an admin username and password." });
        }

        const key = rateLimitKey(username, getClientAddress());

        if (isRateLimited(key)) {
            return fail(429, { adminError: "Too many login attempts. Try again in a few minutes." });
        }

        const admin = await loginAdmin(username, password, cookies);

        if (!admin) {
            recordFailedLogin(key);
            return fail(401, { adminError: "Invalid admin login." });
        }

        loginAttempts.delete(key);
        throw redirect(303, "/admin");
    },
};
