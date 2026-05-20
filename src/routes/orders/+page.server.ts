import type { PageServerLoad } from "./$types";
import { ObjectId } from "mongodb";
import { db } from "$lib/server/db";

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

type Order = {
  _id: ObjectId;
  name: string;
  userEmail?: string;
  deliveryDayId?: string;
  deliveryDayLabel?: string;
  deliveryDayDate?: string;
  items: OrderItem[];
  total: number;
  status: "new" | "confirmed" | "complete" | "closed" | "cancelled";
  createdAt: Date;
};

export const load: PageServerLoad = async () => {
  // Get all orders, newest first
  const orders = await db
    .collection<Order>("orders")
    .find({ status: { $ne: "cancelled" } })
    .sort({ createdAt: -1 })
    .toArray();

  // Convert _id to string and ensure all fields are properly serialized
  const cleanedOrders = orders.map((o) => ({
    _id: o._id.toString(),
    name: o.name,
    userEmail: o.userEmail || "",
    deliveryDayId: o.deliveryDayId || "",
    deliveryDayLabel: o.deliveryDayLabel || "Unassigned",
    deliveryDayDate: o.deliveryDayDate || "",
    items: o.items.map((item) => ({
      name: item.name,
      basePrice: item.basePrice || item.price || 0,
      finalPrice: item.finalPrice || item.price || 0,
      price: item.price || item.finalPrice || item.basePrice || 0,
      selections: item.selections || {},
      note: item.note || "",
      section: item.section || "",
      subsection: item.subsection || "",
      completed: item.completed || false,
    })),
    total: o.total,
    status: o.status === "closed" ? "complete" : o.status,
    createdAt: o.createdAt.toISOString(), // Convert to ISO string for proper serialization
  }));

  return {
    orders: cleanedOrders,
  };
};
