import { MongoClient } from "mongodb";
import { MONGODB_URI } from "$env/static/private";
import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";

const client = new MongoClient(MONGODB_URI);

export async function load() {
  const products = await db.collection("products").find({}).toArray();

  return {
    products: products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description || "",
      price: p.price,
      section: p.section,
      subsection: p.subsection || null,
    })),
  };
}

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    // Expect cart items as JSON string
    const itemsJson = data.get("items")?.toString();
    if (!itemsJson) {
      return fail(400, { error: "No items in order" });
    }

    let items;
    try {
      items = JSON.parse(itemsJson);
    } catch {
      return fail(400, { error: "Invalid items format" });
    }

    // Calculate total
    const total = items.reduce(
      (sum: number, item: any) => sum + Number(item.price),
      0,
    );

    // Connect to DB
    await client.connect();
    const db = client.db("food_order");

    await db.collection("orders").insertOne({
      items,
      total,
      status: "new",
      createdAt: new Date(),
    });

    // Redirect back to Orders page
    throw redirect(303, "/orders");
  },
};
