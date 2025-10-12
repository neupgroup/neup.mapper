
'use server';

import { DocumentData } from 'firebase/firestore';
import { 
    getDocuments as getDocumentsOrm,
    addDocument as addDocumentOrm,
    updateDocument as updateDocumentOrm,
    deleteDocument as deleteDocumentOrm,
} from '@/lib/orm';

export async function getDocuments(
  collectionName: string,
  options: {
    filters: any[];
    limit: number | null;
    offset: number | null;
    sortBy: any | null;
    fields: string[];
  }
): Promise<DocumentData[]> {
    return getDocumentsOrm(collectionName, options);
}

export async function addDocument(collectionName: string, data: DocumentData): Promise<string> {
    return addDocumentOrm(collectionName, data);
}

export async function updateDocument(collectionName: string, docId: string, data: DocumentData): Promise<void> {
    return updateDocumentOrm(collectionName, docId, data);
}

export async function deleteDocument(collectionName: string, docId: string): Promise<void> {
    return deleteDocumentOrm(collectionName, docId);
}
