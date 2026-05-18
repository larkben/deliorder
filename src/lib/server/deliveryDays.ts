import { db } from "$lib/server/db";
import { ObjectId } from "mongodb";

export type DeliveryDayStatus = "open" | "closed";

export type DeliveryDaySummary = {
    id: string;
    label: string;
    date: string;
    status: DeliveryDayStatus;
    createdAt: string;
    updatedAt: string;
};

type DeliveryDayRecord = {
    _id: ObjectId;
    label: string;
    date: string;
    status: DeliveryDayStatus;
    createdAt: Date;
    updatedAt: Date;
};

export function isPastDeliveryDate(date: string) {
    const today = new Date();
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate())
        .toISOString()
        .slice(0, 10);

    return date < todayKey;
}

export function serializeDeliveryDay(day: DeliveryDayRecord): DeliveryDaySummary {
    return {
        id: day._id.toString(),
        label: day.label,
        date: day.date,
        status: day.status,
        createdAt: day.createdAt.toISOString(),
        updatedAt: day.updatedAt.toISOString(),
    };
}

export async function listDeliveryDays() {
    const days = await db
        .collection<DeliveryDayRecord>("delivery_days")
        .find({})
        .sort({ date: 1 })
        .toArray();

    return days.map(serializeDeliveryDay);
}

export async function listOpenFutureDeliveryDays() {
    const days = await db
        .collection<DeliveryDayRecord>("delivery_days")
        .find({
            status: "open",
            date: { $gte: new Date().toISOString().slice(0, 10) },
        })
        .sort({ date: 1 })
        .toArray();

    return days.map(serializeDeliveryDay).filter((day) => !isPastDeliveryDate(day.date));
}

export async function getAvailableDeliveryDay(id: string) {
    if (!ObjectId.isValid(id)) {
        return null;
    }

    const day = await db.collection<DeliveryDayRecord>("delivery_days").findOne({
        _id: new ObjectId(id),
        status: "open",
    });

    if (!day || isPastDeliveryDate(day.date)) {
        return null;
    }

    return serializeDeliveryDay(day);
}

