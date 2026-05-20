import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { db } from "$lib/server/db";
import { getAvailableDeliveryDay, listOpenFutureDeliveryDays } from "$lib/server/deliveryDays";
import type { ObjectId } from "mongodb";

import type { PageServerLoad } from "./$types";

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

type OrderRecord = {
  _id: ObjectId;
  name: string;
  userEmail: string;
  deliveryDayId?: string;
  deliveryDayLabel?: string;
  deliveryDayDate?: string;
  items: Array<{
    name: string;
    finalPrice?: number;
    price?: number;
    selections?: Record<string, string | string[]>;
    displaySelections?: Array<{ label: string; value: string }>;
    note?: string;
  }>;
  total: number;
  status: "new" | "confirmed" | "complete" | "closed" | "cancelled";
  createdAt: Date;
  cancelledAt?: Date;
};

export const load: PageServerLoad = async (event) => {
    // Get the user session
    const session = await event.locals.auth();
    
    // If not logged in, redirect to home
    if (!session?.user) {
        throw redirect(303, "/");
    }

    // Get menu items
    const products = await db.collection("menu_items").find({}).toArray();
    const userEmail = session.user.email || "";
    const userOrders = userEmail
        ? await db
              .collection<OrderRecord>("orders")
              .find({ userEmail })
              .sort({ deliveryDayDate: -1, createdAt: -1 })
              .toArray()
        : [];

    return {
        session,
        userName: session.user.name || session.user.email || "User",
        userEmail,
        deliveryDays: await listOpenFutureDeliveryDays(),
        orders: userOrders.map((order) => ({
            id: order._id.toString(),
            name: order.name,
            deliveryDayId: order.deliveryDayId || "",
            deliveryDayLabel: order.deliveryDayLabel || "Unassigned",
            deliveryDayDate: order.deliveryDayDate || "",
            status: order.status === "closed" ? "complete" : order.status,
            total: order.total,
            createdAt: order.createdAt.toISOString(),
            items: (order.items || []).map((item) => ({
                name: item.name,
                price: item.finalPrice ?? item.price ?? 0,
                selections: item.selections || {},
                displaySelections: item.displaySelections || [],
                note: item.note || "",
            })),
        })),
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
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    const data = await request.formData();
    const session = await locals.auth();

    // get name
    const name = data.get("name")?.toString();
    if (!name) {
      return fail(400, { error: "No name for order" });
    }

    const userEmail = session?.user?.email;
    const deliveryDayId = data.get("deliveryDayId")?.toString();

    if (!userEmail) {
      return fail(400, { error: "Missing user email" });
    }

    if (!deliveryDayId) {
      return fail(400, { error: "Choose an open delivery day" });
    }

    const deliveryDay = await getAvailableDeliveryDay(deliveryDayId);

    if (!deliveryDay) {
      return fail(400, { error: "That delivery day is closed or unavailable" });
    }

    const existingOrder = await db.collection("orders").findOne({
      userEmail,
      deliveryDayId,
      status: { $ne: "cancelled" },
    });

    if (existingOrder) {
      return fail(409, { error: "You already have an order for this delivery day" });
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
      const displaySelections: Array<{ label: string; value: string }> = [];

      // Recalculate price based on selections to prevent client tampering
      if (item.customizations && item.selections) {
        item.customizations.forEach((customization) => {
          const selection = item.selections![customization.id];

          if (customization.type === "single" && typeof selection === "string") {
            const option = customization.options.find((o) => o.value === selection);
            if (option) {
              calculatedPrice += option.price;
              displaySelections.push({ label: customization.label, value: option.label });
            }
          } else if (customization.type === "multiple" && Array.isArray(selection)) {
            selection.forEach((value) => {
              const option = customization.options.find((o) => o.value === value);
              if (option) {
                calculatedPrice += option.price;
                displaySelections.push({ label: customization.label, value: option.label });
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
        displaySelections,
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

    const result = await db.collection("orders").insertOne({
      name,
      userEmail,
      deliveryDayId,
      deliveryDayLabel: deliveryDay.label,
      deliveryDayDate: deliveryDay.date,
      items: validatedItems,
      total,
      status: "new",
      createdAt: new Date(),
    });

    throw redirect(303, `/order/confirmation?id=${result.insertedId.toString()}`);
  },
};
