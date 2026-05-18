import { fail, redirect } from "@sveltejs/kit";
import { ObjectId } from "mongodb";
import type { Actions, PageServerLoad } from "./$types";
import { db } from "$lib/server/db";
import { isPastDeliveryDate, listDeliveryDays } from "$lib/server/deliveryDays";

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.adminUser) {
        throw redirect(303, "/");
    }

    return {
        deliveryDays: await listDeliveryDays(),
    };
};

function validateDeliveryDayForm(data: FormData) {
    const label = data.get("label")?.toString().trim() ?? "";
    const date = data.get("date")?.toString() ?? "";
    const status = data.get("status")?.toString() === "closed" ? "closed" : "open";

    if (!label || !date) {
        return { error: "Delivery day name and date are required." };
    }

    return { label, date, status };
}

export const actions: Actions = {
    create: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const parsed = validateDeliveryDayForm(await request.formData());

        if ("error" in parsed) {
            return fail(400, { dayError: parsed.error });
        }

        const now = new Date();

        await db.collection("delivery_days").insertOne({
            label: parsed.label,
            date: parsed.date,
            status: isPastDeliveryDate(parsed.date) ? "closed" : parsed.status,
            createdAt: now,
            updatedAt: now,
        });

        return { daySuccess: "Delivery day created." };
    },
    update: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const data = await request.formData();
        const id = data.get("id")?.toString() ?? "";
        const parsed = validateDeliveryDayForm(data);

        if (!ObjectId.isValid(id)) {
            return fail(400, { dayError: "Invalid delivery day." });
        }

        if ("error" in parsed) {
            return fail(400, { dayError: parsed.error });
        }

        await db.collection("delivery_days").updateOne(
            { _id: new ObjectId(id) },
            {
                $set: {
                    label: parsed.label,
                    date: parsed.date,
                    status: isPastDeliveryDate(parsed.date) ? "closed" : parsed.status,
                    updatedAt: new Date(),
                },
            },
        );

        return { daySuccess: "Delivery day updated." };
    },
    close: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const id = (await request.formData()).get("id")?.toString() ?? "";

        if (!ObjectId.isValid(id)) {
            return fail(400, { dayError: "Invalid delivery day." });
        }

        await db.collection("delivery_days").updateOne(
            { _id: new ObjectId(id) },
            { $set: { status: "closed", updatedAt: new Date() } },
        );

        return { daySuccess: "Delivery day closed." };
    },
    delete: async ({ request, locals }) => {
        if (!locals.adminUser) {
            throw redirect(303, "/");
        }

        const id = (await request.formData()).get("id")?.toString() ?? "";

        if (!ObjectId.isValid(id)) {
            return fail(400, { dayError: "Invalid delivery day." });
        }

        const ordersForDay = await db.collection("orders").countDocuments({ deliveryDayId: id });

        if (ordersForDay > 0) {
            return fail(400, { dayError: "Delivery days with orders cannot be deleted. Close it instead." });
        }

        await db.collection("delivery_days").deleteOne({ _id: new ObjectId(id) });

        return { daySuccess: "Delivery day deleted." };
    },
};
