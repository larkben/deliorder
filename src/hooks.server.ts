import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/core/providers/google";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from "$env/static/private";
import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from "@sveltejs/kit";

const ALLOWED_EMAIL_DOMAINS = ["yourdomain.edu", "gmail.com"]; // Change to your school domain

async function authorization({ event, resolve }: Parameters<Handle>[0]) {
    // Public routes that don't need auth
    const publicRoutes = ["/", "/auth/signin", "/auth/error", "/auth/callback/google"];
    
    if (publicRoutes.some(route => event.url.pathname.startsWith(route))) {
        return resolve(event);
    }

    // Check if user is authenticated
    const session = await event.locals.auth();
    
    if (!session?.user) {
        throw redirect(303, "/");
    }

    // Check if email domain is allowed
    const email = session.user.email;
    if (email) {
        const domain = email.split("@")[1];
        if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
            throw redirect(303, "/auth/error?error=unauthorized_domain");
        }
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
                if (user.email) {
                    const domain = user.email.split("@")[1];
                    if (ALLOWED_EMAIL_DOMAINS.includes(domain)) {
                        return true;
                    }
                }
                return false; // Deny access if not from allowed domain
            },
        },
    }).handle,
    authorization
);