import { redirect, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { listAdminUsers, logoutAdmin, upsertAdminUser } from "$lib/server/adminAuth";
import { db } from "$lib/server/db";

type OrderRecord = {
    total?: number;
    status?: "new" | "confirmed" | "complete" | "closed" | "cancelled";
    createdAt?: Date;
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.adminUser) {
        throw redirect(303, "/");
    }

    const orders = await db.collection<OrderRecord>("orders").find({ status: { $ne: "cancelled" } }).toArray();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const activeOrders = orders.filter((order) => order.status === "new").length;
    const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;
    const completedOrders = orders.filter((order) => order.status === "complete" || order.status === "closed").length;

    return {
        adminUser: locals.adminUser,
        adminUsers: await listAdminUsers(),
        summary: {
            orderCount: orders.length,
            activeOrders,
            confirmedOrders,
            completedOrders,
            totalRevenue,
            averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
        },
    };
};

export const actions: Actions = {
    saveAdmin: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const data = await request.formData();
        const username = data.get("username")?.toString().trim() ?? "";
        const password = data.get("password")?.toString() ?? "";

        if (!username || !password) {
            return fail(400, { userError: "Username and new password are required." });
        }

        if (password.length < 8) {
            return fail(400, { userError: "Admin passwords must be at least 8 characters." });
        }

        await upsertAdminUser(username, password);

        return { userSuccess: `Saved admin login for ${username}.` };
    },
    logout: async ({ cookies }) => {
        await logoutAdmin(cookies);
        throw redirect(303, "/");
    },
};
