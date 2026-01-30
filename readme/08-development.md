# Build & Local Development

To build the project:

```bash
npm run build
```

Outputs are generated to `dist/` with type declarations.

## Error Handling & Troubleshooting

- Wrap operations in `try/catch` and handle nulls from `getOne()`.
- Verify credentials and network connectivity for your backend.
- Ensure schema field names and types match your storage engine.
