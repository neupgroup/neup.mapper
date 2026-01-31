import { Connections, SchemaManager, type SchemaDef, ConnectionType } from './index.js';
import { createMapper } from './mapper.js';
import { TableMigrator } from './migrator.js';

// Import segregated builders
import { BaseDispatcher } from './builders/base-dispatcher.js';
import { RawBuilder } from './builders/raw-builder.js';
import { SchemaDispatcher } from './builders/schema-builders.js';

// Re-export for external usage
export { BaseDispatcher, RawBuilder, SchemaDispatcher };
export * from './builders/dml-builders.js';
export * from './builders/schema-builders.js';
export * from './builders/raw-builder.js';
export * from './builders/clause-builder.js';

// =========================================================================================
// CONNECTION & MAPPER WRAPPERS
// =========================================================================================

export class FluentConnectionBuilder {
  private mapper: any;
  constructor(mapper: any, private name: string, private type: ConnectionType, config: Record<string, any>) {
    this.mapper = mapper;
    this.mapper.connect(name, type, config);
  }

  base(target: string): BaseDispatcher {
    return new BaseDispatcher(this.mapper, target);
  }

  query(target: string): BaseDispatcher {
    return this.base(target);
  }
}

export class FluentConnectionSelector {
  constructor(private mapper: any, private name: string) { }

  base(target: string): BaseDispatcher {
    // Determine how to pass context? BaseDispatcher usually gets just mapper and target.
    // If we need specific connection, we might need to assume 'useConnection' behavior.
    // For now, simple forwarding.
    return new BaseDispatcher(this.mapper, target);
  }

  query(target: string): BaseDispatcher {
    return this.base(target);
  }
}

export class FluentMapper {
  constructor(private mapper: any) { }

  // Entry Point: BASE (DML)
  base(target: string): BaseDispatcher {
    return new BaseDispatcher(this.mapper, target);
  }

  // Entry Point: QUERY (Alias for Base)
  query(target: string): BaseDispatcher {
    return this.base(target);
  }

  // Entry Point: SCHEMA (DDL)
  schema(name: string): SchemaDispatcher {
    return new SchemaDispatcher(this.mapper, name);
  }

  // Entry Point: RAW
  raw(sql: string): RawBuilder {
    return new RawBuilder(this.mapper, sql);
  }

  // Connection Management
  makeConnection(name: string, type: ConnectionType, config: Record<string, any>): FluentConnectionBuilder {
    return new FluentConnectionBuilder(this.mapper, name, type, config);
  }

  connection(configOrName: string | any): FluentConnectionSelector {
    if (typeof configOrName === 'string') return new FluentConnectionSelector(this.mapper, configOrName);
    // Temp connection logic could go here
    return new FluentConnectionSelector(this.mapper, 'default');
  }

  // Direct shortcuts (Legacy support maintenance)
  async get(target: string): Promise<any> { return this.base(target).select().get(); }
  async add(target: string, data: any): Promise<any> { return this.base(target).insert(data).run(); }
  async update(target: string, filter: any, data: any): Promise<any> {
    let b = this.base(target).update(data);
    Object.keys(filter).forEach(k => b.where(k, filter[k]));
    return b.run();
  }
  async delete(target: string, filter: any): Promise<any> {
    let b = this.base(target).delete();
    Object.keys(filter).forEach(k => b.where(k, filter[k]));
    return b.run();
  }
}

export class StaticMapper {
  private static instance: FluentMapper;
  private static getFluentMapper(): FluentMapper {
    if (!StaticMapper.instance) {
      StaticMapper.instance = new FluentMapper(createMapper());
    }
    return StaticMapper.instance;
  }

  static base(target: string): BaseDispatcher { return StaticMapper.getFluentMapper().base(target); }
  static query(target: string): BaseDispatcher { return StaticMapper.getFluentMapper().query(target); }
  static schema(name: string): SchemaDispatcher { return StaticMapper.getFluentMapper().schema(name); }
  static raw(sql: string): RawBuilder { return StaticMapper.getFluentMapper().raw(sql); }

  static connection(arg: any) { return StaticMapper.getFluentMapper().connection(arg); }
  static makeConnection(n: string, t: ConnectionType, c: any) { return StaticMapper.getFluentMapper().makeConnection(n, t, c); }

  static async discover() {
    const { discover } = await import('./discovery.js');
    return discover();
  }

  // Helpers for simple usage
  static async get(t: string) { return StaticMapper.getFluentMapper().get(t); }
  static async add(t: string, d: any) { return StaticMapper.getFluentMapper().add(t, d); }
}

export const Mapper = StaticMapper;
export default Mapper;