
'use client';
import { DocumentData } from 'firebase/firestore';
import { getDbConfig } from './config';
import * as firestoreAdapter from './firestore';
import * as apiAdapter from './api';

export class QueryBuilder {
  private collectionName: string;
  private filters: any[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private sorting: any | null = null;

  constructor(collectionName: string) {
    this.collectionName = collectionName;
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

  private getAdapter() {
    const config = getDbConfig();
    if (!config) {
      throw new Error('Database not configured');
    }
    switch (config.dbType) {
      case 'Firestore':
        return firestoreAdapter;
      case 'API':
        return apiAdapter;
      case 'MongoDB':
        throw new Error('MongoDB not yet implemented.');
      case 'SQL':
        throw new Error('SQL not yet implemented.');
      default:
        throw new Error(`Unsupported database type: ${config.dbType}`);
    }
  }

  async getDocuments(...fields: string[]): Promise<DocumentData[]> {
    const adapter = this.getAdapter();
    return adapter.getDocuments({
      collectionName: this.collectionName,
      filters: this.filters,
      limit: this.limitCount,
      offset: this.offsetCount,
      sortBy: this.sorting,
      fields,
    });
  }

  async add(data: DocumentData) {
    const adapter = this.getAdapter();
    return adapter.addDocument(this.collectionName, data);
  }

  async update(docId: string, data: DocumentData) {
    const adapter = this.getAdapter();
    return adapter.updateDocument(this.collectionName, docId, data);
  }

  async delete(docId: string) {
    const adapter = this.getAdapter();
    return adapter.deleteDocument(this.collectionName, docId);
  }
}
