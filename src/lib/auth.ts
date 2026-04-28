import { writable, get } from "svelte/store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { open } from "@tauri-apps/plugin-shell";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface User {
    email: string;
    name: string;
    picture: string;
}

export interface Session {
    user: User;
    accessToken: string;
    expiresAt: number; // unix seconds
}

// ── Session store (persisted in localStorage) ─────────────────────────────────

const KEY = "deliorder_session";

function load(): Session | null {
    try {
        const raw = localStorage.getItem(KEY);
        if (!raw) return null;
        const s: Session = JSON.parse(raw);
        if (Date.now() / 1000 > s.expiresAt) { localStorage.removeItem(KEY); return null; }
        return s;
    } catch { return null; }
}

export const session = writable<Session | null>(load());

// ── Google Sign-In ─────────────────────────────────────────────────────────────
// Google requires PKCE for desktop apps (no client secret).
// We start a tiny local HTTP server via a Tauri Rust command,
// open Google's login page in the system browser, and wait for the redirect.

const AUTH_URL  = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const INFO_URL  = "https://www.googleapis.com/oauth2/v3/userinfo";

// Produce a random URL-safe base64 string
function rand(bytes: number) {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return btoa(String.fromCharCode(...buf)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

// SHA-256 → base64url  (PKCE code_challenge)
async function sha256b64(s: string) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
    return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function signIn(): Promise<void> {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string;
    if (!clientId) throw new Error("VITE_GOOGLE_CLIENT_ID not set in .env");

    const verifier  = rand(32);
    const challenge = await sha256b64(verifier);

    // Ask the Tauri Rust backend to start a local HTTP server and give us its port
    const port = await invoke<number>("start_oauth_server");
    const redirectUri = `http://127.0.0.1:${port}`;

    // Wait for the Rust backend to emit the auth code (fires when Google redirects back)
    const unlisten = await listen<string>("oauth://code", async ({ payload: code }) => {
        unlisten(); // unsubscribe — we only need this once

        if (!code) return;

        // Exchange the code for an access token
        const tokenRes = await fetch(TOKEN_URL, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ code, client_id: clientId, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier }),
        });
        if (!tokenRes.ok) return;
        const { access_token, expires_in = 3600 } = await tokenRes.json();

        // Fetch the user's name/email/picture from Google
        const infoRes = await fetch(INFO_URL, { headers: { Authorization: `Bearer ${access_token}` } });
        if (!infoRes.ok) return;
        const { email = "", name = "", picture = "" } = await infoRes.json();

        const s: Session = { user: { email, name, picture }, accessToken: access_token, expiresAt: Math.floor(Date.now() / 1000) + expires_in };
        localStorage.setItem(KEY, JSON.stringify(s));
        session.set(s);
    });

    // Open Google's login page in the system browser
    await open(`${AUTH_URL}?${new URLSearchParams({ client_id: clientId, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", code_challenge: challenge, code_challenge_method: "S256" })}`);
}

export function signOut(): void {
    localStorage.removeItem(KEY);
    session.set(null);
}

export function getSession(): Session | null { return get(session); }
