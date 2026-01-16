import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { MongoClient } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

const client = new MongoClient(MONGODB_URI);

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    const name = data.get("name")?.toString();
    const description = data.get("description")?.toString();
    const price = Number(data.get("price"));

    if (!name || !price) {
      return fail(400, { error: "Missing required fields" });
    }

    await client.connect();
    const db = client.db("food_order");

    await db.collection("products").insertOne({
      name,
      description,
      price,
      createdAt: new Date(),
    });

    throw redirect(303, "/order");
  },
};
