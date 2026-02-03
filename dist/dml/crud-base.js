import { InitMapper } from '../core/init-mapper.js';
import { Executor } from '../core/executor.js';
export class CrudBase {
    constructor(table) {
        this.table = table;
    }
    getUsesConnection() {
        try {
            // Access InitMapper to get schema definition if available
            // Note: SchemaManager in core is mainly for fluent schema definition at runtime.
            // But we can check if there's a registered schema for this table.
            // AND we also need to support the generated 'schemas.ts' file if it's not registered in SchemaManager.
            // Current flow: 
            // 1. InitMapper has SchemaManager.
            // 2. SchemaManager has schemas map.
            // 3. But who registers schemas into SchemaManager?
            //    - Fluent API users do `Mapper.schema('users')...`
            //    - Generated schema file users (via create-schemas) usually import `schemas` and usage depends on how they use it.
            //    - If they use `Mapper.base('users')`, we are here.
            // If the user hasn't registered 'users' schema in InitMapper/SchemaManager, we don't know about it here.
            // However, the user said "running the coomand the code from that schema will run from the defined connection".
            // This implies that `Mapper.base('users')` should magically know about the generated schema.
            // But `Mapper` class doesn't automatically load `src/mapper/schemas.ts`.
            // BUT, wait! `Mapper.migrator` and `create-schemas` logic deals with `src/mapper/schemas.ts`.
            // `Mapper.base` (CRUD) is decoupled.
            // Unless... we try to dynamically import the schema? No, that's async and messy in constructor/methods.
            // OR, the user is expected to register generated schemas at startup?
            // "Mapper.init().loadSchemas(schemas)"?
            // Let's assume for this task that we need to provide a way to set connection, OR try to find it.
            // The prompt says "update the saving methods".
            // Maybe `Executor` should just support connection switching.
            // To fulfill the requirement "code from that schema will run from the defined connection",
            // we probably need to check if there is a global schemas object or similar.
            // Let's try to check `(global as any).schemas?.[this.table]?.usesConnection`.
            // Or better, check if we can access the generated schemas via `InitMapper` if we add a registry there.
            // Let's modify InitMapper to allow registering the generated schemas object.
            // Then CrudBase can query InitMapper.
            const schemaDef = InitMapper.getInstance().getSchemaDef(this.table);
            if (schemaDef && schemaDef.usesConnection) {
                return schemaDef.usesConnection;
            }
            return 'default';
        }
        catch (e) {
            return 'default';
        }
    }
    select(fields = ['*']) {
        const builder = new SelectBuilder(this.table, fields);
        builder.useConnection(this.getUsesConnection());
        return builder;
    }
    insert(data) {
        const builder = new InsertBuilder(this.table, data);
        builder.useConnection(this.getUsesConnection());
        return builder;
    }
    update(data) {
        const builder = new UpdateBuilder(this.table, data);
        builder.useConnection(this.getUsesConnection());
        return builder;
    }
    delete() {
        const builder = new DeleteBuilder(this.table);
        builder.useConnection(this.getUsesConnection());
        return builder;
    }
}
export class SelectBuilder {
    constructor(table, fields) {
        this.table = table;
        this._where = [];
        this._bindings = [];
        this._limit = null;
        this._offset = null;
        this._connection = 'default';
        this._select = fields.join(', ');
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    where(field, value, operator = '=') {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }
    limit(limit) {
        this._limit = limit;
        return this;
    }
    offset(offset) {
        this._offset = offset;
        return this;
    }
    async get() {
        return this.exec();
    }
    async getOne() {
        this.limit(1);
        const res = await this.exec();
        return res[0] || null;
    }
    async exec() {
        let sql = `SELECT ${this._select} FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        if (this._limit) {
            sql += ` LIMIT ${this._limit}`;
        }
        if (this._offset) {
            sql += ` OFFSET ${this._offset}`;
        }
        return new Executor(sql).bind(this._bindings).useConnection(this._connection).execute();
    }
}
export class InsertBuilder {
    constructor(table, data) {
        this.table = table;
        this.data = data;
        this._connection = 'default';
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    async exec() {
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return new Executor(sql).bind(values).useConnection(this._connection).execute();
    }
}
export class UpdateBuilder {
    constructor(table, data) {
        this.table = table;
        this.data = data;
        this._where = [];
        this._bindings = [];
        this._connection = 'default';
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    where(field, value, operator = '=') {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }
    async exec() {
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        let sql = `UPDATE ${this.table} SET ${setClause}`;
        const allBindings = [...values];
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
            allBindings.push(...this._bindings);
        }
        return new Executor(sql).bind(allBindings).useConnection(this._connection).execute();
    }
}
export class DeleteBuilder {
    constructor(table) {
        this.table = table;
        this._where = [];
        this._bindings = [];
        this._connection = 'default';
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    where(field, value, operator = '=') {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }
    async exec() {
        let sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        return new Executor(sql).bind(this._bindings).useConnection(this._connection).execute();
    }
}
