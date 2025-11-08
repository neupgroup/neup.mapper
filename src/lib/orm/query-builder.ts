
'use client';
import { DocumentData } from 'firebase/firestore';
import {
  getWithConnection,
  getOneWithConnection,
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
  // alias to allow conn.connection('<endpoint>') chaining for API ergonomics
  connection(resource: string): QueryBuilder {
    return this.collection(resource);
  }
}

export class QueryBuilder {
  private collectionName: string;
  private filters: any[] = [];
  private limitCount: number | null = null;
  private offsetCount: number | null = null;
  private sorting: any | null = null;
  private connectionName?: string;
  private extraQueryParams?: Record<string, string>;
  private bodyKind?: 'json' | 'form' | 'urlencoded';
  private updateMethod?: 'PUT' | 'PATCH';

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

  queryParams(params: Record<string, string>) {
    this.extraQueryParams = params;
    return this;
  }

  bodyType(kind: 'json' | 'form' | 'urlencoded') {
    this.bodyKind = kind;
    return this;
  }

  method(m: 'PUT' | 'PATCH') {
    this.updateMethod = m;
    return this;
  }

  async get(...fields: string[]): Promise<DocumentData[]> {
    return getWithConnection(
      this.collectionName,
      {
        filters: this.filters,
        limit: this.limitCount,
        offset: this.offsetCount,
        sortBy: this.sorting,
        fields,
        query: this.extraQueryParams,
      },
      this.connectionName
    );
  }

  async getOne(...fields: string[]): Promise<DocumentData | null> {
    return getOneWithConnection(
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
    return addDocumentWithConnection(this.collectionName, data, this.connectionName, {
      bodyType: this.bodyKind,
      query: this.extraQueryParams,
    });
  }

  async update(docId: string, data: DocumentData) {
    return updateDocumentWithConnection(this.collectionName, docId, data, this.connectionName, {
      bodyType: this.bodyKind,
      query: this.extraQueryParams,
      method: this.updateMethod,
    });
  }

  async delete(docId: string) {
    return deleteDocumentWithConnection(this.collectionName, docId, this.connectionName, {
      query: this.extraQueryParams,
    });
  }
}
