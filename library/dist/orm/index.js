export function createOrm(adapter) {
    return {
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
