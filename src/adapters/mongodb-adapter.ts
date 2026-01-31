import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';

export interface MongoDBConfig {
    uri: string;
    database: string;
    options?: {
        maxPoolSize?: number;
        minPoolSize?: number;
        serverSelectionTimeoutMS?: number;
    };
}

/**
 * MongoDB Database Adapter
 * Requires: npm install mongodb
 */
export class MongoDBAdapter implements DbAdapter {
    private client: any;
    private db: any;
    private mongodb: any;

    constructor(private config: MongoDBConfig) {
        try {
            // Dynamically import mongodb to avoid bundling if not used
            this.mongodb = require('mongodb');
        } catch (error: any) {
            throw new Error(
                `Failed to initialize MongoDB adapter: ${error.message}\n` +
                `Make sure to install mongodb: npm install mongodb`
            );
        }
    }

    /**
     * Connect to MongoDB
     */
    async connect(): Promise<void> {
        if (this.client) return;

        const { MongoClient } = this.mongodb;
        this.client = new MongoClient(this.config.uri, {
            maxPoolSize: this.config.options?.maxPoolSize || 10,
            minPoolSize: this.config.options?.minPoolSize || 2,
            serverSelectionTimeoutMS: this.config.options?.serverSelectionTimeoutMS || 5000,
        });

        await this.client.connect();
        this.db = this.client.db(this.config.database);
    }

    /**
     * Ensure connection is established
     */
    private async ensureConnected(): Promise<void> {
        if (!this.client) {
            await this.connect();
        }
    }

    private buildMongoQuery(options: QueryOptions): any {
        const query: any = {};

        // Handle raw WHERE clause
        if (options.rawWhere) {
            try {
                return JSON.parse(options.rawWhere);
            } catch {
                return {};
            }
        }

        // Build query from filters
        for (const filter of options.filters) {
            const { field, operator, value } = filter;

            switch (operator) {
                case '=':
                    query[field] = value;
                    break;
                case '>':
                    query[field] = { $gt: value };
                    break;
                case '<':
                    query[field] = { $lt: value };
                    break;
                case '>=':
                    query[field] = { $gte: value };
                    break;
                case '<=':
                    query[field] = { $lte: value };
                    break;
                case '!=':
                    query[field] = { $ne: value };
                    break;
                case 'IN':
                    query[field] = { $in: Array.isArray(value) ? value : [value] };
                    break;
                case 'LIKE':
                    // Convert SQL LIKE to MongoDB regex
                    const pattern = value.replace(/%/g, '.*').replace(/_/g, '.');
                    query[field] = { $regex: new RegExp(pattern, 'i') };
                    break;
                default:
                    query[field] = value;
            }
        }

        return query;
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        await this.ensureConnected();

        const collection = this.db.collection(options.collectionName);
        const query = this.buildMongoQuery(options);

        let cursor = collection.find(query);

        // Add projection (field selection)
        if (options.fields.length > 0) {
            const projection: any = {};
            options.fields.forEach(field => {
                projection[field] = 1;
            });
            cursor = cursor.project(projection);
        }

        // Add sorting
        if (options.sortBy) {
            const sort: any = {};
            sort[options.sortBy.field] = options.sortBy.direction === 'asc' ? 1 : -1;
            cursor = cursor.sort(sort);
        }

        // Add limit and offset
        if (options.offset !== null) {
            cursor = cursor.skip(options.offset);
        }
        if (options.limit !== null) {
            cursor = cursor.limit(options.limit);
        }

        const results = await cursor.toArray();

        // Convert _id to string for consistency
        return results.map((doc: any) => ({
            ...doc,
            _id: doc._id?.toString(),
        }));
    }

    async getOne(options: QueryOptions): Promise<DocumentData | null> {
        await this.ensureConnected();

        const collection = this.db.collection(options.collectionName);
        const query = this.buildMongoQuery(options);

        const projection: any = {};
        if (options.fields.length > 0) {
            options.fields.forEach(field => {
                projection[field] = 1;
            });
        }

        const result = await collection.findOne(query, { projection });

        if (!result) return null;

        return {
            ...result,
            _id: result._id?.toString(),
        };
    }

    async getDocuments(options: QueryOptions): Promise<DocumentData[]> {
        return this.get(options);
    }

    async addDocument(collectionName: string, data: DocumentData): Promise<string> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        const result = await collection.insertOne(data);

        return result.insertedId.toString();
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        const { ObjectId } = this.mongodb;

        // Try to convert docId to ObjectId, fallback to string
        let query: any;
        try {
            query = { _id: new ObjectId(docId) };
        } catch {
            query = { _id: docId };
        }

        await collection.updateOne(query, { $set: data });
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        const { ObjectId } = this.mongodb;

        // Try to convert docId to ObjectId, fallback to string
        let query: any;
        try {
            query = { _id: new ObjectId(docId) };
        } catch {
            query = { _id: docId };
        }

        await collection.deleteOne(query);
    }

    /**
     * Close the MongoDB connection
     */
    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }

    /**
     * Execute aggregation pipeline
     */
    async aggregate(collectionName: string, pipeline: any[]): Promise<DocumentData[]> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        const results = await collection.aggregate(pipeline).toArray();

        return results.map((doc: any) => ({
            ...doc,
            _id: doc._id?.toString(),
        }));
    }

    /**
     * Create an index
     */
    async createIndex(collectionName: string, fields: any, options?: any): Promise<string> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        return await collection.createIndex(fields, options);
    }

    /**
     * Get collection statistics
     */
    async getStats(collectionName: string): Promise<any> {
        await this.ensureConnected();

        const collection = this.db.collection(collectionName);
        return await collection.stats();
    }

    async raw(query: string, params?: any[]): Promise<any> {
        await this.ensureConnected();
        try {
            // Try to parse query as a command object if it's a string
            const command = typeof query === 'string' ? JSON.parse(query) : query;
            return await this.db.command(command);
        } catch (e) {
            // For migrations, if it's not JSON, we might not be able to do much
            // but we can at least return the database object for custom logic if params are provided
            return this.db;
        }
    }
}

/**
 * Factory function to create MongoDB adapter
 */
export function createMongoDBAdapter(config: MongoDBConfig): MongoDBAdapter {
    return new MongoDBAdapter(config);
}
