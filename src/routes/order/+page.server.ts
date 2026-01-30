import { MongoClient } from "mongodb";
import { MONGODB_URI } from "$env/static/private";
import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";

const client = new MongoClient(MONGODB_URI);

type CustomizationOption = {
  value: string;
  label: string;
  price: number;
};

type Customization = {
  id: string;
  label: string;
  type: "single" | "multiple";
  required: boolean;
  options: CustomizationOption[];
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  description?: string;
  section: string;
  subsection?: string;
  customizations?: Customization[];
  note?: string;
  completed?: boolean;
  selections?: Record<string, string | string[]>;
  finalPrice?: number;
};

export async function load() {
  const products = await db.collection("menu_items").find({}).toArray();

  return {
    products: products.map((p) => ({
      id: p._id.toString(),
      name: p.name,
      description: p.description || "",
      price: p.price,
      section: p.section,
      subsection: p.subsection || null,
      customizations: p.customizations || [],
    })),
  };
}

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    // get name
    const name = data.get("name")?.toString();
    if (!name) {
      return fail(400, { error: "No name for order" });
    }

    // Expect cart items as JSON string
    const itemsJson = data.get("items")?.toString();
    if (!itemsJson) {
      return fail(400, { error: "No items in order" });
    }

    let items: CartItem[];
    try {
      items = JSON.parse(itemsJson);
    } catch {
      return fail(400, { error: "Invalid items format" });
    }

    // Validate and recalculate prices on server side (security measure)
    const validatedItems = items.map((item) => {
      let calculatedPrice = item.price;

      // Recalculate price based on selections to prevent client tampering
      if (item.customizations && item.selections) {
        item.customizations.forEach((customization) => {
          const selection = item.selections![customization.id];

          if (customization.type === "single" && typeof selection === "string") {
            const option = customization.options.find((o) => o.value === selection);
            if (option) {
              calculatedPrice += option.price;
            }
          } else if (customization.type === "multiple" && Array.isArray(selection)) {
            selection.forEach((value) => {
              const option = customization.options.find((o) => o.value === value);
              if (option) {
                calculatedPrice += option.price;
              }
            });
          }
        });
      }

      return {
        name: item.name,
        basePrice: item.price,
        finalPrice: calculatedPrice,
        selections: item.selections || {},
        note: item.note || "",
        section: item.section,
        subsection: item.subsection,
      };
    });

    // Calculate total from validated prices
    const total = validatedItems.reduce(
      (sum, item) => sum + item.finalPrice,
      0
    );

    // Connect to DB
    await client.connect();
    const orderDb = client.db("food_order");

    await orderDb.collection("orders").insertOne({
      name,
      items: validatedItems,
      total,
      status: "new",
      createdAt: new Date(),
    });

    // Redirect back to Orders page
    throw redirect(303, "/orders");
  },
};
