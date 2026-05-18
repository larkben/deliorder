import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/sveltekit/providers/google";
import { env } from "$env/dynamic/private";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from "$env/static/private";
import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from "@sveltejs/kit";
import { getAdminSession } from "$lib/server/adminAuth";

const ALLOWED_EMAIL_DOMAINS = (env.ALLOWED_EMAIL_DOMAINS ?? "")
    .split(",")
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);

function isAllowedEmail(email: string | null | undefined) {
    if (ALLOWED_EMAIL_DOMAINS.length === 0) {
        return true;
    }

    const domain = email?.split("@")[1]?.toLowerCase();
    return !!domain && ALLOWED_EMAIL_DOMAINS.includes(domain);
}

async function authorization({ event, resolve }: Parameters<Handle>[0]) {
    event.locals.adminUser = await getAdminSession(event.cookies);

    // Public routes that don't need auth
    const publicRoutes = ["/auth"];
    
    if (event.url.pathname === "/" || publicRoutes.some(route => event.url.pathname.startsWith(route))) {
        return resolve(event);
    }

    if (
        event.url.pathname.startsWith("/admin") ||
        event.url.pathname.startsWith("/orders") ||
        event.url.pathname.startsWith("/api/orders")
    ) {
        if (!event.locals.adminUser) {
            throw redirect(303, "/");
        }

        return resolve(event);
    }

    // Check if user is authenticated
    const session = await event.locals.auth();
    
    if (!session?.user) {
        throw redirect(303, "/");
    }

    // Check if email domain is allowed
    if (!isAllowedEmail(session.user.email)) {
        throw redirect(303, "/auth/error?error=unauthorized_domain");
    }

    return resolve(event);
}

export const handle: Handle = sequence(
    SvelteKitAuth({
        providers: [
            Google({
                clientId: GOOGLE_CLIENT_ID,
                clientSecret: GOOGLE_CLIENT_SECRET,
            }),
        ],
        secret: AUTH_SECRET,
        trustHost: true,
        callbacks: {
            async signIn({ user }) {
                // Check if email domain is allowed
                return isAllowedEmail(user.email);
            },
        },
    }).handle,
    authorization
);
