import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

export interface FirebaseConfig {
    /**
     * Path to service account JSON file or the object itself
     */
    serviceAccount?: string | Record<string, any>;
    /**
     * Project ID (optional if in serviceAccount)
     */
    projectId?: string;
    /**
     * Database URL (optional)
     */
    databaseURL?: string;
}

/**
 * Firebase (Firestore) Database Adapter
 * Requires: npm install firebase-admin
 */
export class FirebaseAdapter implements DbAdapter {
    private admin: any;
    private db: any;
    private initialized = false;

    constructor(private config: FirebaseConfig) {
        try {
            this.admin = require('firebase-admin');
        } catch (error: any) {
            throw new Error(
                `Failed to initialize Firebase adapter: ${error.message}\n` +
                `Make sure to install firebase-admin: npm install firebase-admin`
            );
        }
        this.initialize();
    }

    private initialize() {
        if (this.initialized) return;

        // Check if already initialized to avoid "default app already exists"
        if (this.admin.apps.length > 0) {
            this.db = this.admin.firestore();
            this.initialized = true;
            return;
        }

        let credential;
        if (this.config.serviceAccount) {
            if (typeof this.config.serviceAccount === 'string') {
                credential = this.admin.credential.cert(require(this.config.serviceAccount));
            } else {
                credential = this.admin.credential.cert(this.config.serviceAccount);
            }
        } else {
            credential = this.admin.credential.applicationDefault();
        }

        this.admin.initializeApp({
            credential,
            projectId: this.config.projectId,
            databaseURL: this.config.databaseURL,
        });

        this.db = this.admin.firestore();
        this.initialized = true;
    }

    private buildQuery(collectionName: string, options: QueryOptions): any {
        let query = this.db.collection(collectionName);

        // Handle raw WHERE (not really supported in Firestore directly as SQL, but we can try to parse if needed)
        // For now, we ignore rawWhere or throw, but let's just stick to structured filters.

        for (const filter of options.filters) {
            const { field, operator, value } = filter;
            // Map SQL operators to Firestore
            switch (operator) {
                case '=': query = query.where(field, '==', value); break;
                case '!=': query = query.where(field, '!=', value); break;
                case '>': query = query.where(field, '>', value); break;
                case '<': query = query.where(field, '<', value); break;
                case '>=': query = query.where(field, '>=', value); break;
                case '<=': query = query.where(field, '<=', value); break;
                case 'IN': query = query.where(field, 'in', Array.isArray(value) ? value : [value]); break;
                case 'NOT IN': query = query.where(field, 'not-in', Array.isArray(value) ? value : [value]); break;
                case 'ARRAY_CONTAINS': query = query.where(field, 'array-contains', value); break;
                case 'ARRAY_CONTAINS_ANY': query = query.where(field, 'array-contains-any', value); break;
                default:
                    // Fallback for generic equality or warn
                    query = query.where(field, '==', value);
            }
        }

        if (options.sortBy) {
            query = query.orderBy(options.sortBy.field, options.sortBy.direction);
        }

        if (options.offset !== null) {
            query = query.offset(options.offset);
        }

        if (options.limit !== null) {
            query = query.limit(options.limit);
        }

        // Firestore 'select' (projection)
        if (options.fields && options.fields.length > 0) {
            query = query.select(...options.fields);
        }

        return query;
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        const query = this.buildQuery(options.collectionName, options);
        const snapshot = await query.get();
        
        return snapshot.docs.map((doc: any) => ({
            ...doc.data(),
            id: doc.id // Ensure ID is included
        }));
    }

    async getOne(options: QueryOptions): Promise<DocumentData | null> {
        const query = this.buildQuery(options.collectionName, { ...options, limit: 1 });
        const snapshot = await query.get();
        
        if (snapshot.empty) return null;
        const doc = snapshot.docs[0];
        return {
            ...doc.data(),
            id: doc.id
        };
    }

    async getDocuments(options: QueryOptions): Promise<DocumentData[]> {
        return this.get(options);
    }

    async addDocument(collectionName: string, data: DocumentData): Promise<string> {
        const colRef = this.db.collection(collectionName);
        const docRef = await colRef.add(data);
        return docRef.id;
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        const docRef = this.db.collection(collectionName).doc(docId);
        await docRef.update(data);
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        const docRef = this.db.collection(collectionName).doc(docId);
        await docRef.delete();
    }

    /**
     * Execute a raw command or access internal instance
     * If query is 'instance', returns the Firestore instance.
     */
    async raw(query: string, params?: any[]): Promise<any> {
        if (query === 'instance') {
            return this.db;
        }
        // Could implement raw query parsing if needed, but Firestore is object-based
        throw new Error('Raw queries are not fully supported in Firebase adapter. Use "instance" to get the Firestore SDK object.');
    }

    /**
     * Begin a transaction (WriteBatch)
     * Firestore transactions are callback-based, so we map this to a WriteBatch for atomic writes.
     * NOTE: This does not support read-modify-write patterns that require a real Transaction.
     */
    async beginTransaction(): Promise<any> {
        // Return a WriteBatch
        return this.db.batch();
    }

    /**
     * Commit a transaction (WriteBatch)
     */
    async commitTransaction(batch: any): Promise<void> {
        await batch.commit();
    }

    /**
     * Rollback a transaction
     * For WriteBatch, we just discard it.
     */
    async rollbackTransaction(batch: any): Promise<void> {
        // No-op for batch, just don't commit.
    }
}

export function createFirebaseAdapter(config: FirebaseConfig): FirebaseAdapter {
    return new FirebaseAdapter(config);
}
