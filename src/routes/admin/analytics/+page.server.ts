import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";

type OrderRecord = {
    total?: number;
    status?: "new" | "confirmed" | "complete" | "closed";
    createdAt?: Date;
    deliveryDayLabel?: string;
    deliveryDayDate?: string;
    items?: {
        section?: string;
        finalPrice?: number;
        price?: number;
        selections?: Record<string, string | string[]>;
    }[];
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.adminUser) {
        throw redirect(303, "/");
    }

    const orders = await db.collection<OrderRecord>("orders").find({}).sort({ createdAt: -1 }).toArray();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const activeOrders = orders.filter((order) => order.status === "new").length;
    const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;
    const completedOrders = orders.filter((order) => order.status === "complete" || order.status === "closed").length;
    const sectionTotals = new Map<string, { count: number; revenue: number }>();
    const optionCounts = new Map<string, number>();
    const deliveryDayTotals = new Map<string, { date: string; count: number; revenue: number }>();

    for (const order of orders) {
        const dayKey = `${order.deliveryDayDate || "No date"}|${order.deliveryDayLabel || "Unassigned"}`;
        const dayCurrent = deliveryDayTotals.get(dayKey) ?? {
            date: order.deliveryDayDate || "",
            count: 0,
            revenue: 0,
        };
        dayCurrent.count += 1;
        dayCurrent.revenue += order.total ?? 0;
        deliveryDayTotals.set(dayKey, dayCurrent);

        for (const item of order.items ?? []) {
            const section = item.section || "Uncategorized";
            const current = sectionTotals.get(section) ?? { count: 0, revenue: 0 };
            current.count += 1;
            current.revenue += item.finalPrice ?? item.price ?? 0;
            sectionTotals.set(section, current);

            const selections = item.selections ?? {};
            for (const [group, value] of Object.entries(selections)) {
                if (typeof value === "string" && value) {
                    const key = `${group}: ${value}`;
                    optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
                }

                if (Array.isArray(value)) {
                    for (const option of value.filter(Boolean)) {
                        const key = `${group}: ${option}`;
                        optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
                    }
                }
            }
        }
    }

    return {
        summary: {
            orderCount: orders.length,
            totalRevenue,
            activeOrders,
            confirmedOrders,
            completedOrders,
            averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
        },
        sectionTotals: [...sectionTotals.entries()]
            .map(([section, totals]) => ({ section, ...totals }))
            .sort((a, b) => b.revenue - a.revenue),
        optionTotals: [...optionCounts.entries()]
            .map(([option, count]) => ({ option, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 25),
        deliveryDayTotals: [...deliveryDayTotals.entries()]
            .map(([key, totals]) => ({ label: key.split("|")[1], ...totals }))
            .sort((a, b) => a.date.localeCompare(b.date)),
        recentOrders: orders.slice(0, 8).map((order) => ({
            total: order.total ?? 0,
            status: order.status === "closed" ? "complete" : order.status ?? "new",
            createdAt: order.createdAt?.toISOString() ?? new Date().toISOString(),
            deliveryDayLabel: order.deliveryDayLabel ?? "Unassigned",
            deliveryDayDate: order.deliveryDayDate ?? "",
            itemCount: order.items?.length ?? 0,
        })),
    };
};
