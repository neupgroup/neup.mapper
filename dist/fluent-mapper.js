import { createMapper } from './mapper.js';
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
    constructor(mapper, name, type, config) {
        this.name = name;
        this.type = type;
        this.mapper = mapper;
        this.mapper.connect(name, type, config);
    }
    base(target) {
        return new BaseDispatcher(this.mapper, target);
    }
    query(target) {
        return this.base(target);
    }
}
export class FluentConnectionSelector {
    constructor(mapper, name) {
        this.mapper = mapper;
        this.name = name;
    }
    base(target) {
        // Determine how to pass context? BaseDispatcher usually gets just mapper and target.
        // If we need specific connection, we might need to assume 'useConnection' behavior.
        // For now, simple forwarding.
        return new BaseDispatcher(this.mapper, target);
    }
    query(target) {
        return this.base(target);
    }
}
export class FluentMapper {
    constructor(mapper) {
        this.mapper = mapper;
    }
    // Entry Point: BASE (DML)
    base(target) {
        return new BaseDispatcher(this.mapper, target);
    }
    // Entry Point: QUERY (Alias for Base)
    query(target) {
        return this.base(target);
    }
    // Entry Point: SCHEMA (DDL)
    schema(name) {
        return new SchemaDispatcher(this.mapper, name);
    }
    // Entry Point: RAW
    raw(sql) {
        return new RawBuilder(this.mapper, sql);
    }
    // Connection Management
    makeConnection(name, type, config) {
        return new FluentConnectionBuilder(this.mapper, name, type, config);
    }
    connection(configOrName) {
        if (typeof configOrName === 'string')
            return new FluentConnectionSelector(this.mapper, configOrName);
        // Temp connection logic could go here
        return new FluentConnectionSelector(this.mapper, 'default');
    }
    // Direct shortcuts (Legacy support maintenance)
    async get(target) { return this.base(target).select().get(); }
    async add(target, data) { return this.base(target).insert(data).run(); }
    async update(target, filter, data) {
        let b = this.base(target).update(data);
        Object.keys(filter).forEach(k => b.where(k, filter[k]));
        return b.run();
    }
    async delete(target, filter) {
        let b = this.base(target).delete();
        Object.keys(filter).forEach(k => b.where(k, filter[k]));
        return b.run();
    }
}
export class StaticMapper {
    static getFluentMapper() {
        if (!StaticMapper.instance) {
            StaticMapper.instance = new FluentMapper(createMapper());
        }
        return StaticMapper.instance;
    }
    static base(target) { return StaticMapper.getFluentMapper().base(target); }
    static query(target) { return StaticMapper.getFluentMapper().query(target); }
    static schema(name) { return StaticMapper.getFluentMapper().schema(name); }
    static raw(sql) { return StaticMapper.getFluentMapper().raw(sql); }
    static connection(arg) { return StaticMapper.getFluentMapper().connection(arg); }
    static makeConnection(n, t, c) { return StaticMapper.getFluentMapper().makeConnection(n, t, c); }
    static async discover() {
        const { discover } = await import('./discovery.js');
        return discover();
    }
    // Helpers for simple usage
    static async get(t) { return StaticMapper.getFluentMapper().get(t); }
    static async add(t, d) { return StaticMapper.getFluentMapper().add(t, d); }
}
export const Mapper = StaticMapper;
export default Mapper;
