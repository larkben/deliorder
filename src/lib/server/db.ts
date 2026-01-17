import { MongoClient } from 'mongodb';
import { MONGODB_URI } from '$env/static/private';

if (!MONGODB_URI) {
    throw new Error('Missing MONGODB_URI');
}

const client = new MongoClient(MONGODB_URI);

// Module-scoped promise (initialized immediately)
const clientPromise: Promise<MongoClient> = client.connect();

export const db = (await clientPromise).db('food_order');

