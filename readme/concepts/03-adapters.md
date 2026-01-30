# Adapters

Adapters implement backend-specific operations. Shape:

```ts
export interface DbAdapter {
  get?(options: QueryOptions): Promise<any[]>
  getOne?(options: QueryOptions): Promise<any | null>
  getDocuments(options: QueryOptions): Promise<any[]>
  addDocument(collectionName: string, data: Record<string, any>): Promise<string>
  updateDocument(collectionName: string, docId: string, data: Record<string, any>): Promise<void>
  deleteDocument(collectionName: string, docId: string): Promise<void>
}
```

Attach to a connection with `conRegistry.attachAdapter('<name>', adapter)` before querying.
