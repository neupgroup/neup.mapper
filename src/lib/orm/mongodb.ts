'use server';
import { DocumentData } from 'firebase/firestore';
import { getDbConfig } from './config';
import { MongoClient, ObjectId } from 'mongodb';

interface QueryOptions {
  collectionName: string;
  filters: { field: string; operator: any; value: any }[];
  limit: number | null;
  offset: number | null;
  sortBy: { field: string; direction: 'asc' | 'desc' } | null;
  fields: string[];
  connectionName?: string;
}

function parseDbNameFromUri(uri: string | undefined): string | null {
  if (!uri) return null;
  try {
    // Supports mongodb:// and mongodb+srv://
    const parts = uri.split('://');
    if (parts.length < 2) return null;
    const afterProto = parts[1];
    const slashIndex = afterProto.indexOf('/');
    if (slashIndex === -1) return null;
    const pathAndQuery = afterProto.substring(slashIndex + 1);
    const db = pathAndQuery.split('?')[0];
    return db || null;
  } catch {
    return null;
  }
}

async function getClientAndDb(connectionName?: string) {
  const config = getDbConfig(connectionName ?? 'default');
  if (!config || config.dbType !== 'MongoDB') {
    throw new Error('MongoDB is not configured in environment variables.');
  }
  const uri = config.connectionString as string | undefined;
  if (!uri) {
    throw new Error('MONGODB_CONNECTION_STRING is missing.');
  }
  const client = new MongoClient(uri);
  await client.connect();

  const dbName = (config.dbName as string | undefined) || parseDbNameFromUri(uri);
  if (!dbName) {
    await client.close();
    throw new Error('MongoDB database name not found. Provide MONGODB_DB_NAME or include it in the connection string.');
  }
  const db = client.db(dbName);
  return { client, db };
}

function buildMongoFilter(filters: { field: string; operator: any; value: any }[]) {
  if (!filters || filters.length === 0) return {};
  const clauses = filters.map(f => {
    const field = f.field;
    const op = String(f.operator).toLowerCase();
    const val = f.value;
    switch (op) {
      case '==':
      case '=':
      case 'eq':
        return { [field]: { $eq: val } };
      case '!=':
      case '<>':
      case 'ne':
        return { [field]: { $ne: val } };
      case '>':
      case 'gt':
        return { [field]: { $gt: val } };
      case '>=':
      case 'gte':
        return { [field]: { $gte: val } };
      case '<':
      case 'lt':
        return { [field]: { $lt: val } };
      case '<=':
      case 'lte':
        return { [field]: { $lte: val } };
      case 'in':
        return { [field]: { $in: Array.isArray(val) ? val : [val] } };
      case 'nin':
      case 'notin':
        return { [field]: { $nin: Array.isArray(val) ? val : [val] } };
      case 'contains':
      case 'like':
        return { [field]: { $regex: String(val), $options: 'i' } };
      default:
        // fallback to equality
        return { [field]: { $eq: val } };
    }
  });
  return clauses.length === 1 ? clauses[0] : { $and: clauses };
}

export async function getDocuments(options: QueryOptions): Promise<DocumentData[]> {
  const { client, db } = await getClientAndDb(options.connectionName);
  try {
    const { collectionName, filters, limit, offset, sortBy, fields } = options;
    const collection = db.collection(collectionName);
    const query = buildMongoFilter(filters);

    const projection: Record<string, 0 | 1> | undefined = fields.length > 0
      ? fields.reduce((acc, f) => { acc[f] = 1; return acc; }, { _id: 1 } as Record<string, 1>)
      : undefined;

    let cursor = collection.find(query, projection ? { projection } : undefined);

    if (sortBy) {
      cursor = cursor.sort({ [sortBy.field]: sortBy.direction === 'asc' ? 1 : -1 });
    }
    if (offset && offset > 0) {
      cursor = cursor.skip(offset);
    }
    if (limit && limit > 0) {
      cursor = cursor.limit(limit);
    }

    const docs = await cursor.toArray();
    return docs.map(d => {
      const { _id, ...rest } = d as any;
      return { id: _id?.toString?.(), ...rest } as DocumentData;
    });
  } finally {
    await client.close();
  }
}

export async function addDocument(collectionName: string, data: DocumentData, connectionName?: string): Promise<string> {
  const { client, db } = await getClientAndDb(connectionName);
  try {
    const collection = db.collection(collectionName);
    const result = await collection.insertOne(data);
    return result.insertedId.toString();
  } finally {
    await client.close();
  }
}

export async function updateDocument(
  collectionName: string,
  docId: string,
  data: DocumentData,
  connectionName?: string
): Promise<void> {
  const { client, db } = await getClientAndDb(connectionName);
  try {
    const collection = db.collection(collectionName);
    await collection.updateOne({ _id: new ObjectId(docId) }, { $set: data });
  } finally {
    await client.close();
  }
}

export async function deleteDocument(collectionName: string, docId: string, connectionName?: string): Promise<void> {
  const { client, db } = await getClientAndDb(connectionName);
  try {
    const collection = db.collection(collectionName);
    await collection.deleteOne({ _id: new ObjectId(docId) });
  } finally {
    await client.close();
  }
}
