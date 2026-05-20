import { fail, redirect } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/server/db";

type OrderItem = {
    name: string;
    basePrice?: number;
    finalPrice?: number;
    price?: number;
    selections?: Record<string, string | string[]>;
    displaySelections?: Array<{ label: string; value: string }>;
    note?: string;
    section?: string;
    subsection?: string;
};

type OrderRecord = {
    _id: ObjectId;
    name: string;
    userEmail?: string;
    deliveryDayLabel?: string;
    deliveryDayDate?: string;
    items: OrderItem[];
    total: number;
    status: "new" | "confirmed" | "complete" | "closed";
    createdAt: Date;
};

function serializeOrder(order: OrderRecord) {
    return {
        id: order._id.toString(),
        name: order.name,
        userEmail: order.userEmail ?? "",
        deliveryDayLabel: order.deliveryDayLabel ?? "Unassigned",
        deliveryDayDate: order.deliveryDayDate ?? "",
        items: order.items.map((item) => ({
            name: item.name,
            price: item.finalPrice ?? item.price ?? item.basePrice ?? 0,
            selections: item.selections ?? {},
            displaySelections: item.displaySelections ?? [],
            note: item.note ?? "",
            section: item.section ?? "",
            subsection: item.subsection ?? "",
        })),
        total: order.total,
        status: order.status,
        createdAt: order.createdAt.toISOString(),
    };
}

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.adminUser) {
        throw redirect(303, "/");
    }

    const orders = await db
        .collection<OrderRecord>("orders")
        .find({ status: "new" })
        .sort({ deliveryDayDate: 1, createdAt: 1 })
        .toArray();

    return {
        orders: orders.map(serializeOrder),
    };
};

export const actions: Actions = {
    confirm: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const id = (await request.formData()).get("id")?.toString() ?? "";

        if (!ObjectId.isValid(id)) {
            return fail(400, { confirmError: "Invalid order." });
        }

        const result = await db.collection("orders").updateOne(
            { _id: new ObjectId(id), status: "new" },
            {
                $set: {
                    status: "confirmed",
                    confirmedAt: new Date(),
                    updatedAt: new Date(),
                },
            },
        );

        if (result.matchedCount === 0) {
            return fail(404, { confirmError: "Order was not found or was already confirmed." });
        }

        return { confirmSuccess: "Order confirmed." };
    },
};
