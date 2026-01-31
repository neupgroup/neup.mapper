import type { DbAdapter, QueryOptions, DocumentData } from '../orm/types';

export interface APIAdapterConfig {
    baseUrl: string;
    headers?: Record<string, string>;
    timeout?: number;
    endpoints?: {
        get?: string;      // Default: GET /{collection}
        getOne?: string;   // Default: GET /{collection}/{id}
        create?: string;   // Default: POST /{collection}
        update?: string;   // Default: PUT /{collection}/{id}
        delete?: string;   // Default: DELETE /{collection}/{id}
    };
    queryParamMapping?: {
        filters?: string;  // Default: 'filter'
        limit?: string;    // Default: 'limit'
        offset?: string;   // Default: 'offset'
        sort?: string;     // Default: 'sort'
        fields?: string;   // Default: 'fields'
    };
}

/**
 * REST API Adapter
 * Works with standard REST APIs
 */
export class APIAdapter implements DbAdapter {
    private config: {
        baseUrl: string;
        headers: Record<string, string>;
        timeout: number;
        endpoints: {
            get: string;
            getOne: string;
            create: string;
            update: string;
            delete: string;
        };
        queryParamMapping: {
            filters: string;
            limit: string;
            offset: string;
            sort: string;
            fields: string;
        };
    };

    constructor(config: APIAdapterConfig) {
        this.config = {
            baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
            headers: config.headers || {},
            timeout: config.timeout || 30000,
            endpoints: {
                get: config.endpoints?.get || '/{collection}',
                getOne: config.endpoints?.getOne || '/{collection}/{id}',
                create: config.endpoints?.create || '/{collection}',
                update: config.endpoints?.update || '/{collection}/{id}',
                delete: config.endpoints?.delete || '/{collection}/{id}',
            },
            queryParamMapping: {
                filters: config.queryParamMapping?.filters || 'filter',
                limit: config.queryParamMapping?.limit || 'limit',
                offset: config.queryParamMapping?.offset || 'offset',
                sort: config.queryParamMapping?.sort || 'sort',
                fields: config.queryParamMapping?.fields || 'fields',
            },
        };
    }

    private buildUrl(template: string, params: Record<string, string>): string {
        let url = template;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
        return `${this.config.baseUrl}${url}`;
    }

    private buildQueryParams(options: QueryOptions): URLSearchParams {
        const params = new URLSearchParams();

        // Add filters
        if (options.filters.length > 0) {
            const filterObj: any = {};
            options.filters.forEach(f => {
                filterObj[f.field] = { [f.operator || 'eq']: f.value };
            });
            params.append(this.config.queryParamMapping.filters, JSON.stringify(filterObj));
        }

        // Add raw where if present
        if (options.rawWhere) {
            params.append(this.config.queryParamMapping.filters, options.rawWhere);
        }

        // Add limit
        if (options.limit !== null) {
            params.append(this.config.queryParamMapping.limit, String(options.limit));
        }

        // Add offset
        if (options.offset !== null) {
            params.append(this.config.queryParamMapping.offset, String(options.offset));
        }

        // Add sort
        if (options.sortBy) {
            const sortValue = `${options.sortBy.direction === 'desc' ? '-' : ''}${options.sortBy.field}`;
            params.append(this.config.queryParamMapping.sort, sortValue);
        }

        // Add fields
        if (options.fields.length > 0) {
            params.append(this.config.queryParamMapping.fields, options.fields.join(','));
        }

        return params;
    }

    private async fetch(url: string, options: RequestInit = {}): Promise<any> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

        try {
            const headers = new Headers({
                'Content-Type': 'application/json',
                ...this.config.headers,
            });

            if (options.headers) {
                Object.entries(options.headers).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        value.forEach(v => headers.append(key, v));
                    } else if (value !== undefined) {
                        headers.set(key, value as string);
                    }
                });
            }

            const response = await fetch(url, {
                ...options,
                headers,
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(
                    `API request failed: ${response.status} ${response.statusText}\n${errorText}`
                );
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return await response.text();
        } catch (error: any) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`API request timeout after ${this.config.timeout}ms`);
            }
            throw error;
        }
    }

    async get(options: QueryOptions): Promise<DocumentData[]> {
        const url = this.buildUrl(this.config.endpoints.get, {
            collection: options.collectionName,
        });

        const params = this.buildQueryParams(options);
        const fullUrl = `${url}?${params.toString()}`;

        const response = await this.fetch(fullUrl, { method: 'GET' });

        // Handle different response formats
        if (Array.isArray(response)) {
            return response;
        }
        if (response.data && Array.isArray(response.data)) {
            return response.data;
        }
        if (response.results && Array.isArray(response.results)) {
            return response.results;
        }

        return [response];
    }

    async getOne(options: QueryOptions): Promise<DocumentData | null> {
        const results = await this.get({ ...options, limit: 1 });
        return results[0] || null;
    }

    async getDocuments(options: QueryOptions): Promise<DocumentData[]> {
        return this.get(options);
    }

    async addDocument(collectionName: string, data: DocumentData): Promise<string> {
        const url = this.buildUrl(this.config.endpoints.create, { collection: collectionName });

        const response = await this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });

        // Try to extract ID from response
        return response.id || response._id || response.data?.id || String(Date.now());
    }

    async updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
        const url = this.buildUrl(this.config.endpoints.update, {
            collection: collectionName,
            id: docId,
        });

        await this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async deleteDocument(collectionName: string, docId: string): Promise<void> {
        const url = this.buildUrl(this.config.endpoints.delete, {
            collection: collectionName,
            id: docId,
        });

        await this.fetch(url, { method: 'DELETE' });
    }

    async request(
        method: string,
        endpoint: string,
        data?: any,
        customHeaders?: Record<string, string | string[]>
    ): Promise<any> {
        const url = `${this.config.baseUrl}${endpoint}`;
        return this.fetch(url, {
            method,
            body: data ? JSON.stringify(data) : undefined,
            headers: customHeaders as any,
        });
    }
}

/**
 * Factory function to create API adapter
 */
export function createAPIAdapter(config: APIAdapterConfig): APIAdapter {
    return new APIAdapter(config);
}
