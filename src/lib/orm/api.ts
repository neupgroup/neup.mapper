
'use client';
import { DocumentData } from 'firebase/firestore';
import { getDbConfig } from './config';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
}

function getApiSchema(collectionName: string) {
    if (typeof window === 'undefined') return null;
    const schemasStr = localStorage.getItem('collectionSchemas');
    if (schemasStr) {
        const schemas = JSON.parse(schemasStr);
        return schemas[collectionName];
    }
    return null;
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  const { collectionName, filters, limit: limitCount, offset: offsetCount, sortBy, fields } = options;
  const apiConfig = getDbConfig();
  const apiSchema = getApiSchema(collectionName);

  if (!apiConfig || apiConfig.dbType !== 'API' || !apiSchema?.getEndpoint) {
    throw new Error('API is not configured or GET endpoint is missing in schema.');
  }

  const { basePath, apiKey } = apiConfig;
  const { getEndpoint } = apiSchema;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }
  
  const url = new URL(`${basePath}${getEndpoint}`);

  filters.forEach(f => url.searchParams.append(f.field, f.value));

  if (sortBy) {
    url.searchParams.append('_sort', sortBy.field);
    url.searchParams.append('_order', sortBy.direction);
  }

  if (limitCount) {
    url.searchParams.append('_limit', limitCount.toString());
  }

  if (offsetCount && limitCount) {
    url.searchParams.append('_page', (Math.floor(offsetCount / limitCount) + 1).toString());
  }

  const response = await fetch(url.toString(), { headers });
  if (!response.ok) {
    throw new Error(`API request failed: ${response.statusText}`);
  }

  let data = await response.json();

  if (Array.isArray(data) && fields.length > 0) {
    return data.map(item => {
      const selectedData: DocumentData = { id: item.id };
      fields.forEach(field => {
        if (item[field] !== undefined) {
          selectedData[field] = item[field];
        }
      });
      return selectedData;
    });
  }

  return Array.isArray(data) ? data : [data];
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
    const apiConfig = getDbConfig();
    const apiSchema = getApiSchema(collectionName);

    if (!apiConfig || apiConfig.dbType !== 'API' || !apiSchema?.createEndpoint) {
        throw new Error('API is not configured or CREATE endpoint is missing in schema.');
    }
    
    const { basePath, apiKey } = apiConfig;
    const { createEndpoint } = apiSchema;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const response = await fetch(`${basePath}${createEndpoint}`, {
       method: 'POST',
       headers,
       body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API create failed: ${response.statusText}`);
    const result = await response.json();
    return result.id;
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
    const apiConfig = getDbConfig();
    const apiSchema = getApiSchema(collectionName);
    
    if (!apiConfig || apiConfig.dbType !== 'API' || !apiSchema?.updateEndpoint) {
        throw new Error('API is not configured or UPDATE endpoint is missing in schema.');
    }
    
    const { basePath, apiKey } = apiConfig;
    const { updateEndpoint } = apiSchema;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const url = `${basePath}${updateEndpoint.replace('{id}', docId)}`;
    
    const response = await fetch(url, {
       method: 'PUT', // or PATCH
       headers,
       body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error(`API update failed: ${response.statusText}`);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
    const apiConfig = getDbConfig();
    const apiSchema = getApiSchema(collectionName);

    if (!apiConfig || apiConfig.dbType !== 'API' || !apiSchema?.deleteEndpoint) {
        throw new Error('API is not configured or DELETE endpoint is missing in schema.');
    }
    
    const { basePath, apiKey } = apiConfig;
    const { deleteEndpoint } = apiSchema;

    const headers: Record<string, string> = {};
    if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`;
    
    const url = `${basePath}${deleteEndpoint.replace('{id}', docId)}`;
    
    const response = await fetch(url, { method: 'DELETE', headers });
    if (!response.ok) throw new Error(`API delete failed: ${response.statusText}`);
}
