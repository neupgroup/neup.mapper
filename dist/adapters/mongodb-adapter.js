/**
 * MongoDB Database Adapter
 * Requires: npm install mongodb
 */
export class MongoDBAdapter {
    constructor(config) {
        this.config = config;
        try {
            // Dynamically import mongodb to avoid bundling if not used
            this.mongodb = require('mongodb');
        }
        catch (error) {
            throw new Error(`Failed to initialize MongoDB adapter: ${error.message}\n` +
                `Make sure to install mongodb: npm install mongodb`);
        }
    }
    /**
     * Connect to MongoDB
     */
    async connect() {
        var _a, _b, _c;
        if (this.client)
            return;
        const { MongoClient } = this.mongodb;
        this.client = new MongoClient(this.config.uri, {
            maxPoolSize: ((_a = this.config.options) === null || _a === void 0 ? void 0 : _a.maxPoolSize) || 10,
            minPoolSize: ((_b = this.config.options) === null || _b === void 0 ? void 0 : _b.minPoolSize) || 2,
            serverSelectionTimeoutMS: ((_c = this.config.options) === null || _c === void 0 ? void 0 : _c.serverSelectionTimeoutMS) || 5000,
        });
        await this.client.connect();
        this.db = this.client.db(this.config.database);
    }
    /**
     * Ensure connection is established
     */
    async ensureConnected() {
        if (!this.client) {
            await this.connect();
        }
    }
    buildMongoQuery(options) {
        const query = {};
        // Handle raw WHERE clause
        if (options.rawWhere) {
            try {
                return JSON.parse(options.rawWhere);
            }
            catch {
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
    async get(options) {
        await this.ensureConnected();
        const collection = this.db.collection(options.collectionName);
        const query = this.buildMongoQuery(options);
        let cursor = collection.find(query);
        // Add projection (field selection)
        if (options.fields.length > 0) {
            const projection = {};
            options.fields.forEach(field => {
                projection[field] = 1;
            });
            cursor = cursor.project(projection);
        }
        // Add sorting
        if (options.sortBy) {
            const sort = {};
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
        return results.map((doc) => {
            var _a;
            return ({
                ...doc,
                _id: (_a = doc._id) === null || _a === void 0 ? void 0 : _a.toString(),
            });
        });
    }
    async getOne(options) {
        var _a;
        await this.ensureConnected();
        const collection = this.db.collection(options.collectionName);
        const query = this.buildMongoQuery(options);
        const projection = {};
        if (options.fields.length > 0) {
            options.fields.forEach(field => {
                projection[field] = 1;
            });
        }
        const result = await collection.findOne(query, { projection });
        if (!result)
            return null;
        return {
            ...result,
            _id: (_a = result._id) === null || _a === void 0 ? void 0 : _a.toString(),
        };
    }
    async getDocuments(options) {
        return this.get(options);
    }
    async addDocument(collectionName, data) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        const result = await collection.insertOne(data);
        return result.insertedId.toString();
    }
    async updateDocument(collectionName, docId, data) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        const { ObjectId } = this.mongodb;
        // Try to convert docId to ObjectId, fallback to string
        let query;
        try {
            query = { _id: new ObjectId(docId) };
        }
        catch {
            query = { _id: docId };
        }
        await collection.updateOne(query, { $set: data });
    }
    async deleteDocument(collectionName, docId) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        const { ObjectId } = this.mongodb;
        // Try to convert docId to ObjectId, fallback to string
        let query;
        try {
            query = { _id: new ObjectId(docId) };
        }
        catch {
            query = { _id: docId };
        }
        await collection.deleteOne(query);
    }
    /**
     * Close the MongoDB connection
     */
    async close() {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }
    /**
     * Execute aggregation pipeline
     */
    async aggregate(collectionName, pipeline) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        const results = await collection.aggregate(pipeline).toArray();
        return results.map((doc) => {
            var _a;
            return ({
                ...doc,
                _id: (_a = doc._id) === null || _a === void 0 ? void 0 : _a.toString(),
            });
        });
    }
    /**
     * Create an index
     */
    async createIndex(collectionName, fields, options) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        return await collection.createIndex(fields, options);
    }
    /**
     * Get collection statistics
     */
    async getStats(collectionName) {
        await this.ensureConnected();
        const collection = this.db.collection(collectionName);
        return await collection.stats();
    }
}
/**
 * Factory function to create MongoDB adapter
 */
export function createMongoDBAdapter(config) {
    return new MongoDBAdapter(config);
}
