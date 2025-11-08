# Neup.Mapper

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

## Configuration Guide

Neup.Mapper uses a centralized config system that prefers environment variables, supports programmatic overrides, and (optionally) runtime overrides from the Configure UI. Choose the approach that fits your environment and security posture.

### 1) Environment Variables (Recommended)

- Add a `.env` file with `DB_TYPE` and the credentials for your selected backend.
- Supported `DB_TYPE` values: `MongoDB`, `Firestore`, `SQL`, `API`.

Examples:

- MongoDB
  - `DB_TYPE=MongoDB`
  - `MONGODB_CONNECTION_STRING=mongodb+srv://user:pass@host/dbname?options`
  - Optional: `MONGODB_DB_NAME=dbname` (if not present in the URI)

- Firestore
  - `DB_TYPE=Firestore`
  - `FIRESTORE_API_KEY=...`
  - `FIRESTORE_AUTH_DOMAIN=...`
  - `FIRESTORE_PROJECT_ID=...`
  - `FIRESTORE_STORAGE_BUCKET=...`
  - `FIRESTORE_MESSAGING_SENDER_ID=...`
  - `FIRESTORE_APP_ID=...`

- SQL
  - `DB_TYPE=SQL`
  - `SQL_HOST=localhost`
  - `SQL_PORT=3306`
  - `SQL_USER=root`
  - `SQL_PASSWORD=`
  - `SQL_DATABASE=app`

- API
  - `DB_TYPE=API`
  - `API_BASE_PATH=https://api.example.com/v1`
  - Optional: `API_KEY=Bearer <token>`
  - Optional global headers:
    - `API_HEADER_1_KEY=X-API-Key`
    - `API_HEADER_1_VALUE=secret`
    - up to 3 headers supported

Behavior:
- The server loads config from `.env` via `getDbConfig()`.
- Adapters use this config for all CRUD operations.
- This is the preferred, secure method for production.

### 2) Hardcoded Overrides (Not Recommended)

You can programmatically override the config at runtime. This is useful for tests or demos but should be avoided for production.

- Server-side override via action:
  - `await setRuntimeDbConfig({ dbType: 'MongoDB', connectionString: 'mongodb+srv://...' });`
  - Available in `src/app/actions.ts`.
- Global override in code:
  - `import { setDbConfig } from '@/lib/orm/config';`
  - `setDbConfig({ dbType: 'SQL', host: 'localhost', port: 3306, user: 'root', password: '', database: 'app' });`

Notes:
- Overrides take precedence over `.env` until cleared.
- Reset with `clearDbConfig()` if needed.
- Do not commit hardcoded secrets.

### 3) Runtime Overrides from the Configure UI (Only for Dev/Test)

The Configure page can apply the current form as a runtime config for the session. This bypasses `.env` and is intended for secure local testing only.

- Navigate to `/configure`.
- Select your DB type and enter credentials.
- Use “Apply Runtime Config” to set the config for this session.
- Use “Generate .env Content” to produce the recommended `.env` file and download it.

Notes:
- Runtime overrides are ephemeral and should not be used in production.
- Prefer `.env` for production; this UI feature is for developer convenience.

## Adapters and ORM

- Adapters live under `src/lib/orm/` and are selected based on `DB_TYPE`.
- MongoDB adapter supports filters (`==`, `!=`, `>`, `>=`, `<`, `<=`, `in`, `nin`, `contains`, `like`), projection (selected fields), sorting, limit, and offset.
- Firestore, SQL, and API adapters have parity for CRUD operations.

## Troubleshooting

- Ensure `DB_TYPE` is set and matches the intended adapter.
- For MongoDB, include the database name in the connection string or set `MONGODB_DB_NAME`.
- If using runtime overrides, verify they were applied and not cleared.
