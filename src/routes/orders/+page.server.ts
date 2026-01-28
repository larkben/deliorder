import type { PageServerLoad } from "./$types";
import { MongoClient, ObjectId } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

const client = new MongoClient(MONGODB_URI);

export const load: PageServerLoad = async () => {
  await client.connect();
  const db = client.db("food_order");

  // Get all orders, newest first
  const orders = await db
    .collection("orders")
    .find({})
    .sort({ createdAt: -1 })
    .toArray();

  // Convert _id to string for frontend
  const cleanedOrders = orders.map((o) => ({
    _id: o._id.toString(),
    name: o.name,
    items: o.items,
    total: o.total,
    status: o.status,
    createdAt: o.createdAt,
  }));

  return {
    orders: cleanedOrders,
  };
};
