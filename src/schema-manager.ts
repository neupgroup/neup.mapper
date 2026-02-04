
import { Connections } from './connections.js';
import type { DbAdapter, QueryOptions } from './orm/index.js';
import { Field, SchemaDef, ColumnType } from './types-core.js';
import {
  AdapterMissingError,
  DocumentMissingIdError,
  SchemaConfigurationError,
  SchemaExistingError,
  SchemaMissingError,
  UpdatePayloadMissingError,
} from './errors.js';

function parseFieldRule(field: Field, rule: any) {
  if (Array.isArray(rule)) {
    // Enum or options
    field.enumValues = rule;
    field.type = 'string'; // Usually enums are strings
    return;
  }
  if (typeof rule !== 'string') return;

  if (rule === 'auto-increment') field.autoIncrement = true;
  if (rule === 'unique') field.isUnique = true;
  if (rule.startsWith('max.')) { /* Validation ref */ }
  if (rule === 'enum') { /* marker */ }

  if (rule === 'default_current_datetime' || rule === 'default.currentDatetime') {
    field.defaultValue = 'NOW()';
  }
  if (rule.startsWith('default.value')) {
    // Handling 'default.value', 'actualValue' pattern
  }

  // Foreign key: 'foreignKey.tableName.fieldName'
  if (rule.startsWith('foreignKey.')) {
    field.isForeignKey = true;
    field.foreignRef = rule.replace('foreignKey.', '');
  }
}

export function parseDescriptorStructure(struct: Record<string, string | any[]>): { fields: Field[]; allowUndefinedFields: boolean } {
  let allowUndefinedFields = false;
  const fields: Field[] = [];

  for (const [key, descriptor] of Object.entries(struct)) {
    if (key === '?field') {
      allowUndefinedFields = true;
      continue;
    }

    const field: Field = {
      name: key,
      type: 'string', // default
      config: Array.isArray(descriptor) ? descriptor : [descriptor]
    };

    const rules = Array.isArray(descriptor) ? descriptor : (descriptor as string).split(/\s+/);

    // First item is typically type if strictly following example ['integer', ...]
    if (rules.length > 0 && typeof rules[0] === 'string') {
      const t = rules[0].toLowerCase();
      if (['string', 'integer', 'number', 'boolean', 'datetime', 'date', 'int'].includes(t)) {
        field.type = (t === 'integer' ? 'int' : t === 'datetime' ? 'date' : t) as ColumnType;
      }
    }

    for (let i = 0; i < rules.length; i++) {
      const rule = rules[i];
      if (rule === 'default.value' && i + 1 < rules.length) {
        field.defaultValue = rules[i + 1];
        i++; // Skip next
      } else {
        parseFieldRule(field, rule);
      }
    }

    fields.push(field);
  }
  return { fields, allowUndefinedFields };
}

export class SchemaBuilder {
  private connectionName?: string;
  private collectionName?: string;
  private fields: Field[] = [];
  private allowUndefinedFields = false;

  // New config
  private insertableFields?: string[];
  private updatableFields?: string[];
  private deleteType: 'softDelete' | 'hardDelete' = 'hardDelete';
  private massDeleteAllowed: boolean = true;
  private massEditAllowed: boolean = true;

  constructor(private manager: SchemaManager, private name: string) { }

  use(options: { connection: string; collection: string }) {
    this.connectionName = options.connection;
    this.collectionName = options.collection;
    return this;
  }

  // New configuration methods
  setOptions(options: {
    insertableFields?: string[],
    updatableFields?: string[],
    deleteType?: 'softDelete' | 'hardDelete',
    massDeleteAllowed?: boolean,
    massEditAllowed?: boolean
  }) {
    if (options.insertableFields) this.insertableFields = options.insertableFields;
    if (options.updatableFields) this.updatableFields = options.updatableFields;
    if (options.deleteType) this.deleteType = options.deleteType;
    if (options.massDeleteAllowed !== undefined) this.massDeleteAllowed = options.massDeleteAllowed;
    if (options.massEditAllowed !== undefined) this.massEditAllowed = options.massEditAllowed;
    return this;
  }

  setStructure(structure: Record<string, any> | Field[]) {
    if (Array.isArray(structure)) {
      this.fields = structure;
      this.allowUndefinedFields = false;
    } else {
      const parsed = parseDescriptorStructure(structure);
      this.fields = parsed.fields;
      this.allowUndefinedFields = parsed.allowUndefinedFields;
    }
    // Finalize schema registration
    if (!this.connectionName || !this.collectionName) {
      // Fallback or error?
    }

    const fieldsMap = new Map<string, Field>();
    this.fields.forEach(f => fieldsMap.set(f.name, f));

    this.manager.register({
      name: this.name,
      connectionName: this.connectionName!, // Assuming set
      collectionName: this.collectionName!,
      fields: this.fields,
      fieldsMap,
      allowUndefinedFields: this.allowUndefinedFields,
      insertableFields: this.insertableFields,
      updatableFields: this.updatableFields,
      deleteType: this.deleteType,
      massDeleteAllowed: this.massDeleteAllowed,
      massEditAllowed: this.massEditAllowed
    });
    return this.manager;
  }
}

export class SchemaQuery {
  private filters: { field: string; operator: string; value: any }[] = [];
  private rawWhere: string | null = null;
  private pendingUpdate: Record<string, any> | null = null;
  private cachedAdapter: DbAdapter | null = null;
  private cachedFieldNames: string[];
  private allowedFields: Set<string>;

  private _limit: number | null = null;
  private _offset: number | null = null;

  constructor(private manager: SchemaManager, private def: SchemaDef) {
    this.cachedFieldNames = this.def.fields.map(f => f.name);
    this.allowedFields = new Set(this.cachedFieldNames);
  }

  limit(n: number) {
    this._limit = n;
    return this;
  }

  offset(n: number) {
    this._offset = n;
    return this;
  }

  selectFields(fields: string[]) {
    this.cachedFieldNames = fields;
    return this;
  }

  where(fieldOrPair: string | [string, any] | Record<string, any>, value?: any, operator?: string) {
    if (Array.isArray(fieldOrPair)) {
      const [field, v] = fieldOrPair;
      this.filters.push({ field, operator: '=', value: v });
    } else if (typeof fieldOrPair === 'object' && fieldOrPair !== null) {
      // Support object style where({ a: 1, b: 2 })
      Object.entries(fieldOrPair).forEach(([field, v]) => {
         this.filters.push({ field, operator: '=', value: v });
      });
    } else {
      const field = fieldOrPair as string;
      this.filters.push({ field, operator: operator ?? '=', value });
    }
    return this;
  }

  whereComplex(raw: string) {
    this.rawWhere = raw;
    return this;
  }

  private buildOptions(): QueryOptions {
    return {
      collectionName: this.def.collectionName,
      filters: this.filters,
      limit: this._limit,
      offset: this._offset,
      sortBy: null,
      fields: this.cachedFieldNames,
      rawWhere: this.rawWhere,
    } as any;
  }

  private getAdapter(): DbAdapter {
    if (this.cachedAdapter) return this.cachedAdapter;
    const adapter = this.manager.getAdapter(this.def.connectionName);
    if (!adapter) throw new AdapterMissingError(this.def.connectionName);
    this.cachedAdapter = adapter;
    return adapter;
  }

  set(update: Record<string, any>) {
    this.pendingUpdate = update;
    return this;
  }

  // Deprecated alias kept for backward compatibility if needed, or remove if strictly following request
  to(update: Record<string, any>) {
      return this.set(update);
  }

  async get(): Promise<Record<string, any>[]> {
    const adapter = this.getAdapter();
    const options = this.buildOptions();
    const docs = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return docs as any;
  }

  async getOne(): Promise<Record<string, any> | null> {
    const adapter = this.getAdapter();
    const options = this.buildOptions();
    options.limit = 1;
    if (adapter.getOne) {
      const one = await adapter.getOne(options);
      return (one as any) ?? null;
    }
    const results = adapter.get ? await adapter.get(options) : await adapter.getDocuments(options);
    return (results as any[])[0] || null;
  }

  async add(data: Record<string, any>) {
    const adapter = this.getAdapter();

    // 1. Filter restricted fields if configured
    if (this.def.insertableFields) {
      const allowed = new Set(this.def.insertableFields);
      data = Object.fromEntries(Object.entries(data).filter(([k]) => allowed.has(k)));
    } else if (!this.def.allowUndefinedFields) {
      data = Object.fromEntries(Object.entries(data).filter(([k]) => this.allowedFields.has(k)));
    }

    // 2. Apply defaults
    for (const field of this.def.fields) {
      if (data[field.name] === undefined && field.defaultValue !== undefined) {
        if (field.defaultValue === 'NOW()') {
          data[field.name] = new Date();
        } else {
          data[field.name] = field.defaultValue;
        }
      }
    }

    return adapter.addDocument(this.def.collectionName, data as any);
  }

  async insert(data: Record<string, any>) {
      return this.add(data);
  }

  async delete() {
    const adapter = this.getAdapter();

    if (!this.def.massDeleteAllowed && this.filters.length === 0 && !this._limit) {
      this._limit = 1;
    }

    if (this.def.deleteType === 'softDelete') {
      return this.set({ deletedOn: new Date() }).update();
    }

    const docs = await this.get();
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('delete');
      await adapter.deleteDocument(this.def.collectionName, id);
    }
  }

  async deleteOne() {
    this._limit = 1;
    return this.delete();
  }

  async update(data?: Record<string, any>) {
    const adapter = this.getAdapter();
    
    // Allow passing data directly to update()
    if (data) {
        this.pendingUpdate = data;
    }

    if (!this.pendingUpdate) throw new UpdatePayloadMissingError();
    let updateData = this.pendingUpdate;

    if (this.def.updatableFields) {
      const allowed = new Set(this.def.updatableFields);
      updateData = Object.fromEntries(Object.entries(updateData).filter(([k]) => allowed.has(k)));
    } else if (!this.def.allowUndefinedFields) {
        // Enforce strict schema if not explicitly allowed undefined fields
        updateData = Object.fromEntries(Object.entries(updateData).filter(([k]) => this.allowedFields.has(k)));
    }

    if (!this.def.massEditAllowed && this.filters.length === 0 && !this._limit) {
      this._limit = 1;
    }

    const docs = await this.get();
    for (const d of docs) {
      const id = (d as any).id;
      if (!id) throw new DocumentMissingIdError('update');
      await adapter.updateDocument(this.def.collectionName, id, updateData as any);
    }
  }

  async updateOne(data?: Record<string, any>) {
    this._limit = 1;
    return this.update(data);
  }
}

export class SchemaManager {
  private schemas = new Map<string, SchemaDef>();
  constructor(private connections: Connections) { }

  create(name: string) {
    if (this.schemas.has(name)) {
      throw new SchemaExistingError(name);
    }
    return new SchemaBuilder(this, name);
  }

  register(def: SchemaDef) {
    this.schemas.set(def.name, def);
    return this;
  }

  use(name: string) {
    const def = this.schemas.get(name);
    if (!def) throw new SchemaMissingError(name);
    return new SchemaQuery(this, def);
  }

  getAdapter(connectionName: string) {
    return this.connections.getAdapter(connectionName);
  }

  list() {
    return Array.from(this.schemas.values());
  }
}

export function schema(conns?: Connections) {
  const ctx = conns || new Connections();
  return new SchemaManager(ctx);
}
