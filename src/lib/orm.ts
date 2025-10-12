
'use client';

import { QueryBuilder } from './orm/query-builder';

// --- TOP-LEVEL API ---

export const Database = {
  collection: (collectionName: string) => {
    return new QueryBuilder(collectionName);
  },
};
