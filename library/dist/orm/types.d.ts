import type { DocumentData } from 'firebase/firestore';
export interface QueryOptions {
    collectionName: string;
    filters: {
        field: string;
        operator: any;
        value: any;
    }[];
    limit: number | null;
    offset: number | null;
    sortBy: {
        field: string;
        direction: 'asc' | 'desc';
    } | null;
    fields: string[];
    rawWhere?: string | null;
}
export interface DbAdapter {
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
}
