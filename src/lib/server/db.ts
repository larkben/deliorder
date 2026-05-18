import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
}

const client = new MongoClient(MONGODB_URI);
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
