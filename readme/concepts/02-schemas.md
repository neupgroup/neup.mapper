# Schemas & Structure

Define schemas with a descriptor object or explicit fields array:

```ts
sm.create('Product')
  .use({ connection: 'mysql_prod', collection: 'products' })
  .setStructure({
    id: 'string',
    title: 'string editable',
    price: 'number',
    createdAt: 'date',
    '?field': 'allow-undefined',
  })
```

Field tokens:
- `type`: one of `string`, `number`, `boolean`, `date`, `int`.
- `editable`: marks commonly modified fields.
- `'?field'`: enables accepting fields not listed in the schema.
