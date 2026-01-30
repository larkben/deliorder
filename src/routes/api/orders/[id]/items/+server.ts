import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { ObjectId } from "mongodb";
import type { RequestHandler } from "./$types";

type OrderItem = {
    name: string;
    basePrice?: number;
    finalPrice?: number;
    price?: number;
    selections?: Record<string, string | string[]>;
    note?: string;
    section?: string;
    subsection?: string;
    completed?: boolean;
};

export const PATCH: RequestHandler = async ({ params, request }) => {
    const { id } = params;

    // Validate ObjectId format
    if (!ObjectId.isValid(id)) {
        return json({ error: "Invalid order ID format" }, { status: 400 });
    }

    let body;
    try {
        body = await request.json();
    } catch (error) {
        console.error("Failed to parse JSON:", error);
        return json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { items } = body;

    // Validate items
    if (!items || !Array.isArray(items)) {
        return json({ error: "Items must be an array" }, { status: 400 });
    }

    // Ensure all items have required fields
    const validatedItems: OrderItem[] = items.map((item: any) => ({
        name: item.name || "",
        basePrice: item.basePrice || item.price || 0,
        finalPrice: item.finalPrice || item.price || 0,
        price: item.price || item.finalPrice || item.basePrice || 0,
        selections: item.selections || {},
        note: item.note || "",
        section: item.section || "",
        subsection: item.subsection || "",
        completed: item.completed || false,
    }));

    try {
        const result = await db.collection("orders").updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    items: validatedItems,
                    updatedAt: new Date()
                } 
            }
        );

        if (result.matchedCount === 0) {
            return json({ error: "Order not found" }, { status: 404 });
        }

        return json({ 
            success: true,
            items: validatedItems
        });
    } catch (error) {
        console.error("Error updating order items:", error);
        return json(
            { error: "Failed to update items" },
            { status: 500 }
        );
    }
};