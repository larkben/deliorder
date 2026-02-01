import { SvelteKitAuth } from "@auth/sveltekit";
import Google from "@auth/core/providers/google";
import { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, AUTH_SECRET } from "$env/static/private";
import { redirect, type Handle } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";

const ALLOWED_EMAIL_DOMAINS = ["gmail.com"];

// Get the handle from SvelteKitAuth
const { handle: authHandle } = SvelteKitAuth({
    providers: [
        Google({
            clientId: GOOGLE_CLIENT_ID,
            clientSecret: GOOGLE_CLIENT_SECRET,
        }),
    ],
    secret: AUTH_SECRET,
    trustHost: true,
    basePath: "/auth",  // Add this line
    callbacks: {
        async signIn({ user }) {
            if (user.email) {
                const domain = user.email.split("@")[1];
                if (ALLOWED_EMAIL_DOMAINS.includes(domain)) {
                    return true;
                }
            }
            return false;
        },
    },
});

// Authorization middleware
const authorization: Handle = async ({ event, resolve }) => {
    const publicRoutes = ["/", "/auth"];
    
    const isPublicRoute = publicRoutes.some(route => 
        event.url.pathname === route || event.url.pathname.startsWith("/auth/")
    );
    
    if (isPublicRoute) {
        return resolve(event);
    }

    const session = await event.locals.auth();
    
    if (!session?.user) {
        throw redirect(303, "/");
    }

    const email = session.user.email;
    if (email) {
        const domain = email.split("@")[1];
        if (!ALLOWED_EMAIL_DOMAINS.includes(domain)) {
            throw redirect(303, "/?error=unauthorized_domain");
        }
    }

    return resolve(event);
};

export const handle: Handle = sequence(authHandle, authorization);