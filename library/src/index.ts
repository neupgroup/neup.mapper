export type ColumnType = 'string' | 'number' | 'boolean' | 'date';

export interface Field {
  name: string;
  type: ColumnType;
  nullable?: boolean;
  defaultValue?: unknown;
}

export interface Schema {
  name: string;
  fields: Field[];
}

export class Mapper {
  private schemas = new Map<string, Schema>();

  register(schema: Schema) {
    this.schemas.set(schema.name, schema);
    return this;
  }

  get(name: string) {
    return this.schemas.get(name);
  }

  list() {
    return Array.from(this.schemas.values());
  }
}

export default Mapper;

export * from './actions/ai-schema-suggestion';
export * from './actions/ai-operation-suggestion';
export * from './orm';
