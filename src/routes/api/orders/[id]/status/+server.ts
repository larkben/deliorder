import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { db } from "$lib/server/db";
import type { RequestHandler } from "./$types";

const VALID_STATUSES = ["new", "confirmed", "complete"] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

const NEXT_STATUS: Record<OrderStatus, OrderStatus | null> = {
    new: "confirmed",
    confirmed: "complete",
    complete: null,
};

export const PATCH: RequestHandler = async ({ params, request }) => {
    if (!ObjectId.isValid(params.id)) {
        return json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status as OrderStatus | undefined;

    if (!status || !VALID_STATUSES.includes(status)) {
        return json({ error: "Invalid order status" }, { status: 400 });
    }

    const order = await db.collection<{ status?: OrderStatus }>("orders").findOne(
        { _id: new ObjectId(params.id) },
        { projection: { status: 1 } },
    );

    if (!order) {
        return json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = order.status;

    if (!currentStatus || !VALID_STATUSES.includes(currentStatus)) {
        return json({ error: "Order is not in an editable status" }, { status: 409 });
    }

    if (status !== currentStatus && NEXT_STATUS[currentStatus] !== status) {
        return json(
            { error: "Orders must move from new to confirmed to complete." },
            { status: 409 },
        );
    }

    await db.collection("orders").updateOne(
        { _id: new ObjectId(params.id) },
        {
            $set: {
                status,
                updatedAt: new Date(),
            },
        },
    );

    return json({ success: true, status });
};
