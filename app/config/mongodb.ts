import 'server-only';

import { Db, MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI;
const defaultDbName = process.env.MONGODB_DB;

if (!uri) {
	throw new Error('Missing MONGODB_URI in environment variables.');
}

const globalForMongo = globalThis as typeof globalThis & {
	mongoClient?: MongoClient;
	mongoClientPromise?: Promise<MongoClient>;
};

export async function getMongoClient(): Promise<MongoClient> {
	if (process.env.NEXT_RUNTIME === 'edge') {
		throw new Error('MongoDB can only run in the Node.js runtime, not Edge runtime.');
	}

	if (globalForMongo.mongoClient) {
		return globalForMongo.mongoClient;
	}

	if (!globalForMongo.mongoClientPromise) {
		const client = new MongoClient(uri);
		globalForMongo.mongoClientPromise = client.connect();
	}

	globalForMongo.mongoClient = await globalForMongo.mongoClientPromise;
	return globalForMongo.mongoClient;
}

export async function getDb(dbName = defaultDbName): Promise<Db> {
	const client = await getMongoClient();
	return dbName ? client.db(dbName) : client.db();
}
