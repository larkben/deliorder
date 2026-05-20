import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { formatDisplaySelections, selectionText } from "$lib/orderDisplay";

type OrderRecord = {
    total?: number;
    status?: "new" | "confirmed" | "complete" | "closed" | "cancelled";
    createdAt?: Date;
    deliveryDayLabel?: string;
    deliveryDayDate?: string;
    name?: string;
    userEmail?: string;
    items?: {
        name?: string;
        section?: string;
        subsection?: string;
        finalPrice?: number;
        price?: number;
        selections?: Record<string, string | string[]>;
        displaySelections?: Array<{ label: string; value: string }>;
        note?: string;
    }[];
};

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.adminUser) {
        throw redirect(303, "/");
    }

    const orders = await db
        .collection<OrderRecord>("orders")
        .find({ status: { $ne: "cancelled" } })
        .sort({ createdAt: -1 })
        .toArray();
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total ?? 0), 0);
    const activeOrders = orders.filter((order) => order.status === "new").length;
    const confirmedOrders = orders.filter((order) => order.status === "confirmed").length;
    const completedOrders = orders.filter((order) => order.status === "complete" || order.status === "closed").length;
    const itemTotals = new Map<string, { count: number; revenue: number }>();
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
            const itemLabel = [item.section, item.subsection, item.name]
                .filter(Boolean)
                .join(" > ") || "Uncategorized";
            const current = itemTotals.get(itemLabel) ?? { count: 0, revenue: 0 };
            current.count += 1;
            current.revenue += item.finalPrice ?? item.price ?? 0;
            itemTotals.set(itemLabel, current);

            for (const selection of formatDisplaySelections(item.displaySelections, item.selections)) {
                const key = selectionText(selection);
                optionCounts.set(key, (optionCounts.get(key) ?? 0) + 1);
            }
        }
    }

    const sortedItemTotals = [...itemTotals.entries()]
        .map(([item, totals]) => ({ item, ...totals }))
        .sort((a, b) => b.revenue - a.revenue);
    const sortedOptionTotals = [...optionCounts.entries()]
        .map(([option, count]) => ({ option, count }))
        .sort((a, b) => b.count - a.count);
    const sortedDeliveryDayTotals = [...deliveryDayTotals.entries()]
        .map(([key, totals]) => ({ label: key.split("|")[1], ...totals }))
        .sort((a, b) => a.date.localeCompare(b.date));
    const averageOrdersPerDeliveryDay =
        sortedDeliveryDayTotals.length > 0
            ? sortedDeliveryDayTotals.reduce((sum, day) => sum + day.count, 0) / sortedDeliveryDayTotals.length
            : 0;
    const busiestDeliveryDay = [...sortedDeliveryDayTotals].sort((a, b) => b.count - a.count)[0];
    const topItem = sortedItemTotals[0];
    const topOption = sortedOptionTotals[0];

    return {
        summary: {
            orderCount: orders.length,
            totalRevenue,
            activeOrders,
            confirmedOrders,
            completedOrders,
            averageOrderValue: orders.length ? totalRevenue / orders.length : 0,
        },
        itemTotals: sortedItemTotals,
        optionTotals: sortedOptionTotals.slice(0, 25),
        deliveryDayTotals: sortedDeliveryDayTotals,
        insights: {
            averageOrdersPerDeliveryDay,
            busiestDeliveryDay: busiestDeliveryDay
                ? `${busiestDeliveryDay.label} (${busiestDeliveryDay.count} orders)`
                : "No delivery-day data yet",
            topItem: topItem ? `${topItem.item} (${topItem.count} ordered)` : "No item data yet",
            topOption: topOption ? `${topOption.option} (${topOption.count}x)` : "No option data yet",
            suggestedPrepCount: Math.ceil(averageOrdersPerDeliveryDay),
        },
        recentOrders: orders.slice(0, 8).map((order) => ({
            name: order.name ?? "Unknown",
            userEmail: order.userEmail ?? "",
            total: order.total ?? 0,
            status: order.status === "closed" ? "complete" : order.status ?? "new",
            createdAt: order.createdAt?.toISOString() ?? new Date().toISOString(),
            deliveryDayLabel: order.deliveryDayLabel ?? "Unassigned",
            deliveryDayDate: order.deliveryDayDate ?? "",
            items: (order.items ?? []).map((item) => ({
                name: item.name ?? "Item",
                price: item.finalPrice ?? item.price ?? 0,
                selections: formatDisplaySelections(item.displaySelections, item.selections).map(selectionText),
                note: item.note ?? "",
            })),
        })),
    };
};
