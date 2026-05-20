import { json } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import { db } from "$lib/server/db";
import type { RequestHandler } from "@sveltejs/kit";

export const PATCH: RequestHandler = async ({ params, locals }) => {
    const session = await locals.auth();
    const userEmail = session?.user?.email;

    if (!userEmail) {
        return json({ error: "You must be signed in to cancel an order." }, { status: 401 });
    }

    const id = params.id;

    if (!id || !ObjectId.isValid(id)) {
        return json({ error: "Invalid order ID." }, { status: 400 });
    }

    const result = await db.collection("orders").updateOne(
        {
            _id: new ObjectId(id),
            userEmail,
            status: "new",
        },
        {
            $set: {
                status: "cancelled",
                cancelledAt: new Date(),
                updatedAt: new Date(),
            },
        },
    );

    if (result.matchedCount === 0) {
        return json(
            { error: "Only unconfirmed orders can be cancelled." },
            { status: 409 },
        );
    }

    return json({ success: true, status: "cancelled" });
};
