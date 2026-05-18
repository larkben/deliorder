import type { Session } from "@auth/core/types";

declare global {
    namespace App {
        interface Locals {
            auth: () => Promise<Session | null>;
            adminUser: { username: string } | null;
        }
        interface PageData {
            session?: Session | null;
        }
    }
}

export {};
