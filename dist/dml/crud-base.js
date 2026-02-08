import { InitMapper } from '../core/init-mapper.js';
import { Executor } from '../core/executor.js';
import { ensureInitialized } from '../core/initializer.js';
export class CrudBase {
    constructor(table) {
        this.table = table;
    }
    // Removed synchronous getUsesConnection() as it cannot handle async init.
    // Connection resolution is moved to builders.
    select(fields = ['*']) {
        const builder = new SelectBuilder(this.table, fields);
        return builder;
    }
    insert(data) {
        const builder = new InsertBuilder(this.table, data);
        return builder;
    }
    update(data) {
        const builder = new UpdateBuilder(this.table, data);
        return builder;
    }
    delete() {
        const builder = new DeleteBuilder(this.table);
        return builder;
    }
}
/**
 * Base class for query builders to share connection resolution logic.
 */
class BaseBuilder {
    constructor(table) {
        this.table = table;
        this._connection = null;
        this._transaction = null;
    }
    async resolveConnectionName() {
        await ensureInitialized();
        if (this._connection) {
            return this._connection;
        }
        const initMapper = InitMapper.getInstance();
        const schemaDef = initMapper.getSchemaDef(this.table);
        if (schemaDef && schemaDef.usesConnection) {
            return schemaDef.usesConnection;
        }
        const defaultConn = initMapper.getDefaultConnection();
        if (defaultConn) {
            return defaultConn.name;
        }
        throw new Error("No connection specified and no default connection is configured. Set a connection with 'isDefault: true' in your connections file.");
    }
}
export class SelectBuilder extends BaseBuilder {
    constructor(table, fields) {
        super(table);
        this._where = [];
        this._bindings = [];
        this._limit = null;
        this._offset = null;
        this._select = fields.join(', ');
    }
    useTransaction(transaction) {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
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
        const connName = await this.resolveConnectionName();
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
        return new Executor(sql).bind(this._bindings).useConnection(connName).useTransaction(this._transaction).execute();
    }
}
export class InsertBuilder extends BaseBuilder {
    constructor(table, data) {
        super(table);
        this.data = data;
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    useTransaction(transaction) {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }
    async exec() {
        const connName = await this.resolveConnectionName();
        // Apply default values from schema definition
        const schemaManager = InitMapper.getInstance().getSchemaManager();
        try {
            const schemas = schemaManager.list();
            const schemaDef = schemas.find(s => s.collectionName === this.table || s.name === this.table);
            if (schemaDef && schemaDef.fields) {
                for (const field of schemaDef.fields) {
                    if (this.data[field.name] === undefined && field.defaultValue !== undefined) {
                        if (field.defaultValue === 'NOW()') {
                            this.data[field.name] = new Date().toISOString();
                        }
                        else {
                            this.data[field.name] = field.defaultValue;
                        }
                    }
                }
            }
        }
        catch (e) {
            // Schema not found, continue without defaults
        }
        // Convert Date objects to ISO strings
        for (const key in this.data) {
            if (this.data[key] instanceof Date) {
                this.data[key] = this.data[key].toISOString();
            }
        }
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return new Executor(sql).bind(values).useConnection(connName).useTransaction(this._transaction).execute();
    }
}
export class UpdateBuilder extends BaseBuilder {
    constructor(table, data) {
        super(table);
        this.data = data;
        this._where = [];
        this._bindings = [];
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    useTransaction(transaction) {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }
    where(field, value, operator = '=') {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }
    async exec() {
        const connName = await this.resolveConnectionName();
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        let sql = `UPDATE ${this.table} SET ${setClause}`;
        const allBindings = [...values];
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
            allBindings.push(...this._bindings);
        }
        return new Executor(sql).bind(allBindings).useConnection(connName).useTransaction(this._transaction).execute();
    }
}
export class DeleteBuilder extends BaseBuilder {
    constructor(table) {
        super(table);
        this._where = [];
        this._bindings = [];
    }
    useConnection(name) {
        this._connection = name;
        return this;
    }
    useTransaction(transaction) {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }
    where(field, value, operator = '=') {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }
    async exec() {
        const connName = await this.resolveConnectionName();
        let sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        return new Executor(sql).bind(this._bindings).useConnection(connName).useTransaction(this._transaction).execute();
    }
}
