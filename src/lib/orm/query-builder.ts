
'use client';
import { DocumentData } from 'firebase/firestore';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/app/actions';

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

  async getDocuments(...fields: string[]): Promise<DocumentData[]> {
    return getDocuments(this.collectionName, {
      filters: this.filters,
      limit: this.limitCount,
      offset: this.offsetCount,
      sortBy: this.sorting,
      fields,
    });
  }

  async add(data: DocumentData) {
    return addDocument(this.collectionName, data);
  }

  async update(docId: string, data: DocumentData) {
    return updateDocument(this.collectionName, docId, data);
  }

  async delete(docId: string) {
    return deleteDocument(this.collectionName, docId);
  }
}
