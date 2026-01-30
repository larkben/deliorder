import { json } from "@sveltejs/kit";
import { db } from "$lib/server/db";

export async function GET({ params }) {
    const { section } = params;

    const products = await db
        .collection("menu_items")
        .find({ section })
        .toArray();

    return json(
        products.map((p) => ({
            id: p._id.toString(),
            name: p.name,
            description: p.description || "",
            price: p.price,
            section: p.section,
            subsection: p.subsection || null,
            customizations: p.customizations || [],
        }))
    );
}