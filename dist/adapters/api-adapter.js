/**
 * REST API Adapter
 * Works with standard REST APIs
 */
export class APIAdapter {
    constructor(config) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        this.config = {
            baseUrl: config.baseUrl.replace(/\/$/, ''), // Remove trailing slash
            headers: config.headers || {},
            timeout: config.timeout || 30000,
            endpoints: {
                get: ((_a = config.endpoints) === null || _a === void 0 ? void 0 : _a.get) || '/{collection}',
                getOne: ((_b = config.endpoints) === null || _b === void 0 ? void 0 : _b.getOne) || '/{collection}/{id}',
                create: ((_c = config.endpoints) === null || _c === void 0 ? void 0 : _c.create) || '/{collection}',
                update: ((_d = config.endpoints) === null || _d === void 0 ? void 0 : _d.update) || '/{collection}/{id}',
                delete: ((_e = config.endpoints) === null || _e === void 0 ? void 0 : _e.delete) || '/{collection}/{id}',
            },
            queryParamMapping: {
                filters: ((_f = config.queryParamMapping) === null || _f === void 0 ? void 0 : _f.filters) || 'filter',
                limit: ((_g = config.queryParamMapping) === null || _g === void 0 ? void 0 : _g.limit) || 'limit',
                offset: ((_h = config.queryParamMapping) === null || _h === void 0 ? void 0 : _h.offset) || 'offset',
                sort: ((_j = config.queryParamMapping) === null || _j === void 0 ? void 0 : _j.sort) || 'sort',
                fields: ((_k = config.queryParamMapping) === null || _k === void 0 ? void 0 : _k.fields) || 'fields',
            },
        };
    }
    buildUrl(template, params) {
        let url = template;
        for (const [key, value] of Object.entries(params)) {
            url = url.replace(`{${key}}`, encodeURIComponent(value));
        }
        return `${this.config.baseUrl}${url}`;
    }
    buildQueryParams(options) {
        const params = new URLSearchParams();
        // Add filters
        if (options.filters.length > 0) {
            const filterObj = {};
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
    async fetch(url, options = {}) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...this.config.headers,
                    ...options.headers,
                },
                signal: controller.signal,
            });
            clearTimeout(timeoutId);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`API request failed: ${response.status} ${response.statusText}\n${errorText}`);
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }
            return await response.text();
        }
        catch (error) {
            clearTimeout(timeoutId);
            if (error.name === 'AbortError') {
                throw new Error(`API request timeout after ${this.config.timeout}ms`);
            }
            throw error;
        }
    }
    async get(options) {
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
    async getOne(options) {
        const results = await this.get({ ...options, limit: 1 });
        return results[0] || null;
    }
    async getDocuments(options) {
        return this.get(options);
    }
    async addDocument(collectionName, data) {
        var _a;
        const url = this.buildUrl(this.config.endpoints.create, { collection: collectionName });
        const response = await this.fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
        });
        // Try to extract ID from response
        return response.id || response._id || ((_a = response.data) === null || _a === void 0 ? void 0 : _a.id) || String(Date.now());
    }
    async updateDocument(collectionName, docId, data) {
        const url = this.buildUrl(this.config.endpoints.update, {
            collection: collectionName,
            id: docId,
        });
        await this.fetch(url, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }
    async deleteDocument(collectionName, docId) {
        const url = this.buildUrl(this.config.endpoints.delete, {
            collection: collectionName,
            id: docId,
        });
        await this.fetch(url, { method: 'DELETE' });
    }
    /**
     * Make a custom API request
     */
    async request(method, endpoint, data, customHeaders) {
        const url = `${this.config.baseUrl}${endpoint}`;
        return this.fetch(url, {
            method,
            body: data ? JSON.stringify(data) : undefined,
            headers: customHeaders,
        });
    }
}
/**
 * Factory function to create API adapter
 */
export function createAPIAdapter(config) {
    return new APIAdapter(config);
}
