
'use server';
import { DocumentData } from 'firebase/firestore';
import { getDbConfig } from './config';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
  connectionName?: string;
  query?: Record<string, string>;
}

function getHeaders(connectionName?: string): Record<string, string> {
  const apiConfig = getDbConfig(connectionName ?? 'default');
  if (!apiConfig || apiConfig.dbType !== 'API') {
    throw new Error('API is not configured.');
  }

  const { apiKey, headers: globalHeaders } = apiConfig;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (apiKey) {
    headers['Authorization'] = apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`;
  }

  if (globalHeaders && Array.isArray(globalHeaders)) {
    globalHeaders.forEach(header => {
      if (header.key && header.value) {
        headers[header.key] = header.value;
      }
    });
  }
  
  return headers;
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  const { collectionName, filters, limit: limitCount, offset: offsetCount, sortBy, fields } = options;
  const apiConfig = getDbConfig(options.connectionName ?? 'default');

  if (!apiConfig || apiConfig.dbType !== 'API') {
    throw new Error('API is not configured.');
  }

  const { basePath } = apiConfig;
  const getEndpoint = `/${collectionName}`;

  const headers = getHeaders(options.connectionName);
  const url = new URL(`${basePath}${getEndpoint}`);

  filters.forEach(f => url.searchParams.append(f.field, f.value));
  if (options.query) {
    Object.entries(options.query).forEach(([k, v]) => url.searchParams.append(k, v));
  }

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
    const errorBody = await response.text();
    throw new Error(`API request failed: ${response.statusText}. Body: ${errorBody}`);
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

type RequestOptions = { bodyType?: 'json' | 'form' | 'urlencoded'; query?: Record<string, string> };
export async function addDocument(
  collectionName: string,
  data: DocumentData,
  connectionName?: string,
  requestOptions?: RequestOptions
): Promise<string> {
    const apiConfig = getDbConfig(connectionName ?? 'default');
    
    if (!apiConfig || apiConfig.dbType !== 'API') {
        throw new Error('API is not configured.');
    }
    
    const { basePath } = apiConfig;
    const createEndpoint = `/${collectionName}`;
    const headers = getHeaders(connectionName);
    const url = new URL(`${basePath}${createEndpoint}`);
    if (requestOptions?.query) {
      Object.entries(requestOptions.query).forEach(([k, v]) => url.searchParams.append(k, v));
    }
    let body: any;
    const bodyType = requestOptions?.bodyType ?? 'json';
    if (bodyType === 'form') {
      const form = new FormData();
      Object.entries(data || {}).forEach(([k, v]) => form.append(k, String(v)));
      body = form;
      delete (headers as any)['Content-Type'];
    } else if (bodyType === 'urlencoded') {
      const params = new URLSearchParams();
      Object.entries(data || {}).forEach(([k, v]) => params.append(k, String(v)));
      body = params;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(url.toString(), {
       method: 'POST',
        headers,
        body,
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API create failed: ${response.statusText}. Body: ${errorBody}`);
    }
    const result = await response.json();
    return result.id;
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  connectionName?: string,
  requestOptions?: RequestOptions & { method?: 'PUT' | 'PATCH' }
): Promise<void> {
    const apiConfig = getDbConfig(connectionName ?? 'default');
    
    if (!apiConfig || apiConfig.dbType !== 'API') {
        throw new Error('API is not configured.');
    }
    
    const { basePath } = apiConfig;
    const updateEndpoint = `/${collectionName}/{id}`;
    const headers = getHeaders(connectionName);
    const urlObj = new URL(`${basePath}${updateEndpoint.replace('{id}', docId)}`);
    if (requestOptions?.query) {
      Object.entries(requestOptions.query).forEach(([k, v]) => urlObj.searchParams.append(k, v));
    }
    let body: any;
    const bodyType = requestOptions?.bodyType ?? 'json';
    if (bodyType === 'form') {
      const form = new FormData();
      Object.entries(data || {}).forEach(([k, v]) => form.append(k, String(v)));
      body = form;
      delete (headers as any)['Content-Type'];
    } else if (bodyType === 'urlencoded') {
      const params = new URLSearchParams();
      Object.entries(data || {}).forEach(([k, v]) => params.append(k, String(v)));
      body = params;
      headers['Content-Type'] = 'application/x-www-form-urlencoded';
    } else {
      body = JSON.stringify(data);
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(urlObj.toString(), {
       method: requestOptions?.method ?? 'PUT',
       headers,
       body,
    });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API update failed: ${response.statusText}. Body: ${errorBody}`);
    }
}

export async function deleteDocument(
  collectionName: string,
  docId: string,
  connectionName?: string,
  requestOptions?: { query?: Record<string, string> }
): Promise<void> {
    const apiConfig = getDbConfig(connectionName ?? 'default');

    if (!apiConfig || apiConfig.dbType !== 'API') {
        throw new Error('API is not configured.');
    }
    
    const { basePath } = apiConfig;
    const deleteEndpoint = `/${collectionName}/{id}`;
    const headers = getHeaders(connectionName);
    const urlObj = new URL(`${basePath}${deleteEndpoint.replace('{id}', docId)}`);
    if (requestOptions?.query) {
      Object.entries(requestOptions.query).forEach(([k, v]) => urlObj.searchParams.append(k, v));
    }
    const response = await fetch(urlObj.toString(), { method: 'DELETE', headers });
    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`API delete failed: ${response.statusText}. Body: ${errorBody}`);
    }
}

    
