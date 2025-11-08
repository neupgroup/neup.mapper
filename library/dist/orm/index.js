export function createOrm(adapter) {
    return {
        async get(options) {
            if (adapter.get)
                return adapter.get(options);
            return adapter.getDocuments(options);
        },
        async getOne(options) {
            var _a;
            if (adapter.getOne)
                return adapter.getOne(options);
            const arr = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
            return (_a = arr[0]) !== null && _a !== void 0 ? _a : null;
        },
        async getDocuments(options) {
            return adapter.getDocuments(options);
        },
        async addDocument(collectionName, data) {
            return adapter.addDocument(collectionName, data);
        },
        async updateDocument(collectionName, docId, data) {
            return adapter.updateDocument(collectionName, docId, data);
        },
        async deleteDocument(collectionName, docId) {
            return adapter.deleteDocument(collectionName, docId);
        },
    };
}
