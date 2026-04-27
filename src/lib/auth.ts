/**
 * Client-side Google OAuth 2.0 authentication for Tauri.
 *
 * Uses tauri-plugin-oauth to spin up a local redirect server,
 * then opens the Google auth URL in the system browser via
 * @tauri-apps/plugin-shell. The resulting tokens are stored in
 * localStorage so the session survives page reloads.
 */
import { writable, get } from "svelte/store";
import { start, cancel } from "tauri-plugin-oauth";
import { open } from "@tauri-apps/plugin-shell";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleUser {
    email: string;
    name: string;
    picture: string;
}

export interface AuthSession {
    user: GoogleUser;
    accessToken: string;
    /** Unix timestamp (seconds) when the access token expires */
    expiresAt: number;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

const SESSION_KEY = "deliorder_session";

function loadSession(): AuthSession | null {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session: AuthSession = JSON.parse(raw);
        if (Date.now() / 1000 > session.expiresAt) {
            localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

function saveSession(session: AuthSession) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

export const session = writable<AuthSession | null>(loadSession());

// ---------------------------------------------------------------------------
// PKCE helpers
// ---------------------------------------------------------------------------

function randomBase64url(bytes: number): string {
    const array = new Uint8Array(bytes);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

async function sha256Base64url(plain: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(plain);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return btoa(String.fromCharCode(...new Uint8Array(digest)))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");
}

// ---------------------------------------------------------------------------
// Google Sign-In  (Authorization Code + PKCE, loopback redirect)
// ---------------------------------------------------------------------------

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

/**
 * Returns the Google OAuth client ID from the VITE_ environment variable.
 * Set VITE_GOOGLE_CLIENT_ID in your .env file.
 */
function getClientId(): string {
    const id = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
    if (!id) {
        throw new Error(
            "VITE_GOOGLE_CLIENT_ID is not set. Add it to your .env file."
        );
    }
    return id;
}

/**
 * Initiates the Google Sign-In flow for Tauri desktop.
 *
 * 1. Starts a local HTTP server on a random port (tauri-plugin-oauth).
 * 2. Opens the Google OAuth URL in the system browser.
 * 3. Waits for the redirect callback containing the auth code.
 * 4. Exchanges the code for tokens, fetches user info, and updates the store.
 */
export async function googleSignIn(): Promise<void> {
    const clientId = getClientId();
    const codeVerifier = randomBase64url(32);
    const codeChallenge = await sha256Base64url(codeVerifier);
    const state = randomBase64url(16);

    // Start the local redirect server; it returns the port it is listening on.
    const port = await start((redirectUrl: string) => {
        handleRedirect(redirectUrl, codeVerifier, clientId, port);
    });

    const redirectUri = `http://127.0.0.1:${port}`;

    const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: redirectUri,
        response_type: "code",
        scope: "openid email profile",
        code_challenge: codeChallenge,
        code_challenge_method: "S256",
        state,
        access_type: "online",
    });

    await open(`${GOOGLE_AUTH_URL}?${params.toString()}`);
}

async function handleRedirect(
    redirectUrl: string,
    codeVerifier: string,
    clientId: string,
    port: number
): Promise<void> {
    try {
        const url = new URL(redirectUrl);
        const code = url.searchParams.get("code");
        if (!code) {
            console.error("No code in OAuth redirect", redirectUrl);
            return;
        }

        const redirectUri = `http://127.0.0.1:${port}`;

        // Exchange code for tokens (public client – no client secret needed with PKCE)
        const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
                code_verifier: codeVerifier,
            }),
        });

        if (!tokenRes.ok) {
            console.error("Token exchange failed", await tokenRes.text());
            return;
        }

        const tokenData = await tokenRes.json();
        const accessToken: string = tokenData.access_token;
        const expiresIn: number = tokenData.expires_in ?? 3600;

        // Fetch user profile
        const userRes = await fetch(GOOGLE_USERINFO_URL, {
            headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!userRes.ok) {
            console.error("Failed to fetch user info", await userRes.text());
            return;
        }

        const profile = await userRes.json();

        const newSession: AuthSession = {
            user: {
                email: profile.email ?? "",
                name: profile.name ?? profile.email ?? "",
                picture: profile.picture ?? "",
            },
            accessToken,
            expiresAt: Math.floor(Date.now() / 1000) + expiresIn,
        };

        saveSession(newSession);
        session.set(newSession);
    } catch (err) {
        console.error("Error handling OAuth redirect", err);
    } finally {
        // Stop the local server once we are done
        await cancel(port);
    }
}

// ---------------------------------------------------------------------------
// Sign out
// ---------------------------------------------------------------------------

export function signOut(): void {
    clearSession();
    session.set(null);
}

// ---------------------------------------------------------------------------
// Auth guard helper
// ---------------------------------------------------------------------------

export function getSession(): AuthSession | null {
    return get(session);
}
