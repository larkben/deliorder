import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { MongoClient } from "mongodb";
import { MONGODB_URI } from "$env/static/private";

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

export const actions: Actions = {
  default: async ({ request }) => {
    const data = await request.formData();

    const name = data.get("name")?.toString();
    const description = data.get("description")?.toString();
    const price = Number(data.get("price"));
    const section = data.get("section")?.toString();
    const subsection = data.get("subsection")?.toString();
    const customizationsJSON = data.get("customizations")?.toString();

    if (!name || !price || !section) {
      return fail(400, { error: "Missing required fields" });
    }

    // Parse and validate customizations
    let customizations: Customization[] = [];
    if (customizationsJSON) {
      try {
        const parsed = JSON.parse(customizationsJSON);
        
        // Validate the structure
        if (Array.isArray(parsed)) {
          customizations = parsed.filter((c: any) => {
            return (
              c.id &&
              c.label &&
              (c.type === "single" || c.type === "multiple") &&
              typeof c.required === "boolean" &&
              Array.isArray(c.options) &&
              c.options.length > 0 &&
              c.options.every(
                (o: any) =>
                  o.value &&
                  o.label &&
                  typeof o.price === "number"
              )
            );
          });
        }
      } catch (e) {
        console.error("Failed to parse customizations:", e);
        return fail(400, { error: "Invalid customizations format" });
      }
    }

    await client.connect();
    const db = client.db("food_order");

    const menuItem: any = {
      name,
      description,
      price,
      section,
      subsection,
      createdAt: new Date(),
    };

    // Only add customizations if they exist
    if (customizations.length > 0) {
      menuItem.customizations = customizations;
    }

    await db.collection("menu_items").insertOne(menuItem);

    throw redirect(303, "/order");
  },
};
