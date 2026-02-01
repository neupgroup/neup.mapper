# Documentation

Welcome to the documentation for `@neupgroup/mapper`.

## 🚀 Quick Start

The simplest way to get started is using the static fluent API directly:

```typescript
import { Mapper } from '@neupgroup/mapper';

// 1. Discover Connections & Schemas
await Mapper.discover();

// 2. Query seamlessly
const users = await Mapper.base('users')
    .select(['id', 'name'])
    .where('id', 1)
    .get();
```

Please navigate to the [readme](./readme) directory to find detailed guides and chapters on how to use this package.

