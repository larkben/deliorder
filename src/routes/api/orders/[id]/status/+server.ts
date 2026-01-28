import type { RequestHandler } from "./$types";
import { ObjectId } from "mongodb";
import { db } from "$lib/server/db"; // adjust import to your setup

export const PATCH: RequestHandler = async ({ params, request }) => {
    const { id } = params;
    const { status } = await request.json();

    if (!ObjectId.isValid(id)) {
        return new Response("Invalid order id", { status: 400 });
    }

    const result = await db.collection("orders").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status } }
    );

    if (result.matchedCount === 0) {
        return new Response("Order not found", { status: 404 });
    }

    return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
    });
};