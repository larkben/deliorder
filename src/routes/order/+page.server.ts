import type { Actions } from "./$types";
import { redirect, fail } from "@sveltejs/kit";
import { MongoServerError, ObjectId } from "mongodb";
import { db } from "$lib/server/db";
import { getAvailableDeliveryDay, listOpenFutureDeliveryDays } from "$lib/server/deliveryDays";

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

type MenuItem = {
  _id: ObjectId;
  name: string;
  price: number;
  description?: string;
  section: string;
  subsection?: string;
  customizations?: Customization[];
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
  activeOrder?: boolean;
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
      activeOrder: true,
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

    if (!Array.isArray(items) || items.length === 0) {
      return fail(400, { error: "No items in order" });
    }

    const itemIds = items.map((item) => item.id).filter((id) => ObjectId.isValid(id));

    if (itemIds.length !== items.length) {
      return fail(400, { error: "One or more menu items are invalid" });
    }

    const menuItems = await db
      .collection<MenuItem>("menu_items")
      .find({ _id: { $in: itemIds.map((id) => new ObjectId(id)) } })
      .toArray();
    const menuById = new Map(menuItems.map((item) => [item._id.toString(), item]));

    const validatedItems = [];

    for (const item of items) {
      const menuItem = menuById.get(item.id);

      if (!menuItem) {
        return fail(400, { error: "One or more menu items are no longer available" });
      }

      let calculatedPrice = menuItem.price;
      const displaySelections: Array<{ label: string; value: string }> = [];
      const storedSelections: Record<string, string | string[]> = {};
      const selections = item.selections ?? {};

      for (const customization of menuItem.customizations ?? []) {
        const selection = selections[customization.id];

        if (customization.required) {
          const isEmpty =
            customization.type === "single"
              ? !selection || typeof selection !== "string"
              : !Array.isArray(selection) || selection.length === 0;

          if (isEmpty) {
            return fail(400, { error: `Choose ${customization.label} for ${menuItem.name}` });
          }
        }

        if (customization.type === "single") {
          if (typeof selection !== "string" || !selection) {
            continue;
          }

          const option = customization.options.find((o) => o.value === selection);

          if (!option) {
            return fail(400, { error: `Invalid ${customization.label} for ${menuItem.name}` });
          }

          calculatedPrice += option.price;
          storedSelections[customization.id] = selection;
          displaySelections.push({ label: customization.label, value: option.label });
        } else {
          if (!Array.isArray(selection) || selection.length === 0) {
            continue;
          }

          const validValues: string[] = [];

          for (const value of [...new Set(selection)]) {
            const option = customization.options.find((o) => o.value === value);

            if (!option) {
              return fail(400, { error: `Invalid ${customization.label} for ${menuItem.name}` });
            }

            calculatedPrice += option.price;
            validValues.push(value);
            displaySelections.push({ label: customization.label, value: option.label });
          }

          storedSelections[customization.id] = validValues;
        }
      }

      validatedItems.push({
        name: menuItem.name,
        basePrice: menuItem.price,
        finalPrice: calculatedPrice,
        selections: storedSelections,
        displaySelections,
        note: (item.note || "").slice(0, 500),
        section: menuItem.section,
        subsection: menuItem.subsection,
      });
    }

    // Calculate total from validated prices
    const total = validatedItems.reduce(
      (sum, item) => sum + item.finalPrice,
      0
    );

    let result;

    try {
      result = await db.collection("orders").insertOne({
        name,
        userEmail,
        deliveryDayId,
        deliveryDayLabel: deliveryDay.label,
        deliveryDayDate: deliveryDay.date,
        items: validatedItems,
        total,
        activeOrder: true,
        status: "new",
        createdAt: new Date(),
      });
    } catch (error) {
      if (error instanceof MongoServerError && error.code === 11000) {
        return fail(409, { error: "You already have an order for this delivery day" });
      }

      throw error;
    }

    throw redirect(303, `/order/confirmation?id=${result.insertedId.toString()}`);
  },
};
