import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { db } from "$lib/server/db";
import type { RequestHandler } from "./$types";

const VALID_STATUSES = ["new", "confirmed", "complete"] as const;

type OrderStatus = (typeof VALID_STATUSES)[number];

export const PATCH: RequestHandler = async ({ params, request }) => {
    if (!ObjectId.isValid(params.id)) {
        return json({ error: "Invalid order ID" }, { status: 400 });
    }

    const body = await request.json().catch(() => null);
    const status = body?.status as OrderStatus | undefined;

    if (!status || !VALID_STATUSES.includes(status)) {
        return json({ error: "Invalid order status" }, { status: 400 });
    }

    const result = await db.collection("orders").updateOne(
        { _id: new ObjectId(params.id) },
        {
            $set: {
                status,
                updatedAt: new Date(),
            },
        },
    );

    if (result.matchedCount === 0) {
        return json({ error: "Order not found" }, { status: 404 });
    }

    return json({ success: true, status });
};
