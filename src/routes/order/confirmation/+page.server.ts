import { ObjectId } from "mongodb";
import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db";

type OrderItem = {
    name: string;
    finalPrice?: number;
    price?: number;
    selections?: Record<string, string | string[]>;
    displaySelections?: Array<{ label: string; value: string }>;
    note?: string;
};

type OrderRecord = {
    _id: ObjectId;
    name: string;
    userEmail?: string;
    items: OrderItem[];
    total: number;
    status: "new" | "confirmed" | "complete" | "closed" | "cancelled";
    deliveryDayLabel?: string;
    deliveryDayDate?: string;
    createdAt: Date;
};

export const load: PageServerLoad = async ({ url }) => {
    const id = url.searchParams.get("id");

    if (!id || !ObjectId.isValid(id)) {
        return { order: null };
    }

    const order = await db.collection<OrderRecord>("orders").findOne({ _id: new ObjectId(id) });

    return {
        order: order
            ? {
                  id: order._id.toString(),
                  name: order.name,
                  userEmail: order.userEmail ?? "",
                  items: order.items.map((item) => ({
                      name: item.name,
                      price: item.finalPrice ?? item.price ?? 0,
                      selections: item.selections ?? {},
                      displaySelections: item.displaySelections ?? [],
                      note: item.note ?? "",
                  })),
                  total: order.total,
                  status: order.status === "closed" ? "complete" : order.status,
                  deliveryDayLabel: order.deliveryDayLabel ?? "Unassigned",
                  deliveryDayDate: order.deliveryDayDate ?? "",
                  createdAt: order.createdAt.toISOString(),
              }
            : null,
    };
};
