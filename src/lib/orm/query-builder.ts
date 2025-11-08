
'use client';
import { DocumentData } from 'firebase/firestore';
import {
  getDocumentsWithConnection,
  addDocumentWithConnection,
  updateDocumentWithConnection,
  deleteDocumentWithConnection,
} from '@/app/actions';

export class Connection {
  private name?: string;
  constructor(name?: string) {
    this.name = name;
  }
  collection(collectionName: string): QueryBuilder {
    return new QueryBuilder(collectionName, this.name);
  }
}

export class QueryBuilder {
  private collectionName: string;
  private filters: any[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private sorting: any | null = null;
  private connectionName?: string;

  constructor(collectionName: string, connectionName?: string) {
    this.collectionName = collectionName;
    this.connectionName = connectionName;
  }

  where(field: string, operator: any, value: any) {
    this.filters.push({ field, operator, value });
    return this;
  }

  limit(count: number) {
    this.limitCount = count;
    return this;
  }

  offset(count: number) {
    this.offsetCount = count;
    return this;
  }

  sortBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.sorting = { field, direction };
    return this;
  }

  async getDocuments(...fields: string[]): Promise<DocumentData[]> {
    return getDocumentsWithConnection(
      this.collectionName,
      {
        filters: this.filters,
        limit: this.limitCount,
        offset: this.offsetCount,
        sortBy: this.sorting,
        fields,
      },
      this.connectionName
    );
  }

  async add(data: DocumentData) {
    return addDocumentWithConnection(this.collectionName, data, this.connectionName);
  }

  async update(docId: string, data: DocumentData) {
    return updateDocumentWithConnection(this.collectionName, docId, data, this.connectionName);
  }

  async delete(docId: string) {
    return deleteDocumentWithConnection(this.collectionName, docId, this.connectionName);
  }
}
