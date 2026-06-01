import { MongoClient } from 'mongodb';
import { env } from '$env/dynamic/private';

if (!env.MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
}

const client = new MongoClient(env.MONGODB_URI);
const database = client.db('food_order');

let clientPromise: Promise<MongoClient> | null = null;

function getClient() {
    if (!clientPromise) {
        clientPromise = client.connect();
    }

    return clientPromise;
}

export const db = database;

export async function connectDb() {
    await getClient();
    return database;
}

let setupPromise: Promise<void> | null = null;

export async function ensureDatabaseSetup() {
    if (!setupPromise) {
        setupPromise = (async () => {
            await getClient();

            await database.collection('orders').updateMany(
                { status: 'cancelled' },
                { $set: { activeOrder: false } },
            );

            await database.collection('orders').updateMany(
                { status: { $in: ['new', 'confirmed', 'complete', 'closed'] } },
                { $set: { activeOrder: true } },
            );

            await database.collection('orders').createIndex(
                { userEmail: 1, deliveryDayId: 1 },
                {
                    name: 'unique_active_order_per_person_delivery_day',
                    unique: true,
                    partialFilterExpression: {
                        activeOrder: true,
                    },
                },
            );

            await database.collection('admin_sessions').createIndex(
                { expiresAt: 1 },
                { expireAfterSeconds: 0, name: 'expire_admin_sessions' },
            );

            await database.collection('delivery_days').createIndex(
                { date: 1 },
                { name: 'delivery_days_by_date' },
            );
        })();
    }

    return setupPromise;
}
