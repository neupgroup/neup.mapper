// Use a generic document data type instead of Firebase-specific type
export type DocumentData = Record<string, any>;

export interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
  rawWhere?: string | null;
}

export interface DbAdapter {
  // New optional methods: prefer these over getDocuments when available
  get?(options: QueryOptions): Promise<DocumentData[]>;
  getOne?(options: QueryOptions): Promise<DocumentData | null>;
  getDocuments(options: QueryOptions): Promise<DocumentData[]>;
  addDocument(collectionName: string, data: DocumentData): Promise<string>;
  updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void>;
  deleteDocument(collectionName: string, docId: string): Promise<void>;
  raw(query: string, params?: any[]): Promise<any>;
}

