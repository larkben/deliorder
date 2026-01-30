import type { PageServerLoad } from "./$types";
import { MongoClient, ObjectId } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

const client = new MongoClient(MONGODB_URI);

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
  items: OrderItem[];
  total: number;
  status: "new" | "closed";
  createdAt: Date;
};

export const load: PageServerLoad = async () => {
  await client.connect();
  const db = client.db("food_order");

  // Get all orders, newest first
  const orders = await db
    .collection<Order>("orders")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Convert _id to string and ensure all fields are properly serialized
  const cleanedOrders = orders.map((o) => ({
    _id: o._id.toString(),
    name: o.name,
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
    status: o.status,
    createdAt: o.createdAt.toISOString(), // Convert to ISO string for proper serialization
  }));

  return {
    orders: cleanedOrders,
  };
};
