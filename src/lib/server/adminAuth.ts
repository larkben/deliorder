import { db } from "$lib/server/db";
import { env } from "$env/dynamic/private";
import { dev } from "$app/environment";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import type { Cookies } from "@sveltejs/kit";

const SESSION_COOKIE = "admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8;

type AdminUser = {
    username: string;
    passwordHash: string;
    salt: string;
    createdAt: Date;
    updatedAt: Date;
};

type AdminSession = {
    tokenHash: string;
    username: string;
    expiresAt: Date;
    createdAt: Date;
};

export type AdminUserSummary = {
    username: string;
    createdAt: string;
    updatedAt: string;
};

function hashPassword(password: string, salt = randomBytes(16).toString("hex")) {
    return {
        salt,
        passwordHash: scryptSync(password, salt, 64).toString("hex"),
    };
}

function verifyPassword(password: string, user: AdminUser) {
    const attempted = scryptSync(password, user.salt, 64);
    const stored = Buffer.from(user.passwordHash, "hex");

    return stored.length === attempted.length && timingSafeEqual(stored, attempted);
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

function setSessionCookie(cookies: Cookies, token: string) {
    cookies.set(SESSION_COOKIE, token, {
        path: "/",
        httpOnly: true,
        sameSite: "strict",
        secure: !dev,
        maxAge: SESSION_MAX_AGE,
    });
}

export async function ensureDefaultAdmin() {
    const defaultPassword = env.ADMIN_DEFAULT_PASSWORD ?? (dev ? "secret123" : "");

    if (!defaultPassword) {
        return;
    }

    const users = db.collection<AdminUser>("admin_users");
    const existing = await users.findOne({ username: "admin" });

    if (existing) {
        return;
    }

    const now = new Date();
    const { passwordHash, salt } = hashPassword(defaultPassword);

    await users.insertOne({
        username: "admin",
        passwordHash,
        salt,
        createdAt: now,
        updatedAt: now,
    });
}

export async function loginAdmin(username: string, password: string, cookies: Cookies) {
    await ensureDefaultAdmin();

    const user = await db.collection<AdminUser>("admin_users").findOne({ username });

    if (!user || !verifyPassword(password, user)) {
        return null;
    }

    const token = randomBytes(32).toString("hex");
    const now = new Date();
    const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE * 1000);

    await db.collection<AdminSession>("admin_sessions").insertOne({
        tokenHash: hashToken(token),
        username,
        expiresAt,
        createdAt: now,
    });

    setSessionCookie(cookies, token);

    return { username };
}

export async function getAdminSession(cookies: Cookies) {
    const token = cookies.get(SESSION_COOKIE);

    if (!token) {
        return null;
    }

    const session = await db.collection<AdminSession>("admin_sessions").findOne({
        tokenHash: hashToken(token),
        expiresAt: { $gt: new Date() },
    });

    return session ? { username: session.username } : null;
}

export async function logoutAdmin(cookies: Cookies) {
    const token = cookies.get(SESSION_COOKIE);

    if (token) {
        await db.collection<AdminSession>("admin_sessions").deleteOne({ tokenHash: hashToken(token) });
    }

    cookies.delete(SESSION_COOKIE, { path: "/" });
}

export async function listAdminUsers(): Promise<AdminUserSummary[]> {
    await ensureDefaultAdmin();

    const users = await db
        .collection<AdminUser>("admin_users")
        .find({}, { projection: { username: 1, createdAt: 1, updatedAt: 1 } })
        .sort({ username: 1 })
        .toArray();

    return users.map((user) => ({
        username: user.username,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
    }));
}

export async function upsertAdminUser(username: string, password: string) {
    if (password.length < 8) {
        throw new Error("Admin passwords must be at least 8 characters.");
    }

    const now = new Date();
    const { passwordHash, salt } = hashPassword(password);

    await db.collection<AdminUser>("admin_users").updateOne(
        { username },
        {
            $set: {
                passwordHash,
                salt,
                updatedAt: now,
            },
            $setOnInsert: {
                username,
                createdAt: now,
            },
        },
        { upsert: true },
    );
}
