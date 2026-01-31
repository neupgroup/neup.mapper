import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';
export interface APIAdapterConfig {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    endpoints?: {
        get?: string;
        getOne?: string;
        create?: string;
        update?: string;
        delete?: string;
    };
    queryParamMapping?: {
        filters?: string;
        limit?: string;
        offset?: string;
        sort?: string;
        fields?: string;
    };
}
/**
 * REST API Adapter
 * Works with standard REST APIs
 */
export declare class APIAdapter implements DbAdapter {
    private config;
    constructor(config: APIAdapterConfig);
    private buildUrl;
    private buildQueryParams;
    private fetch;
    get(options: QueryOptions): Promise<DocumentData[]>;
    getOne(options: QueryOptions): Promise<DocumentData | null>;
    getDocuments(options: QueryOptions): Promise<DocumentData[]>;
    addDocument(collectionName: string, data: DocumentData): Promise<string>;
    updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
    deleteDocument(collectionName: string, docId: string): Promise<void>;
    request(method: string, endpoint: string, data?: any, customHeaders?: Record<string, string | string[]>): Promise<any>;
}
/**
 * Factory function to create API adapter
 */
export declare function createAPIAdapter(config: APIAdapterConfig): APIAdapter;
