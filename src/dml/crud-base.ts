import { InitMapper } from '../core/init-mapper.js';
import { Executor } from '../core/executor.js';
import { ensureInitialized } from '../core/initializer.js';

export class CrudBase {
    constructor(private table: string) { }

    // Removed synchronous getUsesConnection() as it cannot handle async init.
    // Connection resolution is moved to builders.

    select(fields: string[] = ['*']): SelectBuilder {
        const builder = new SelectBuilder(this.table, fields);
        return builder;
    }

    insert(data: Record<string, any>): InsertBuilder {
        const builder = new InsertBuilder(this.table, data);
        return builder;
    }

    update(data: Record<string, any>): UpdateBuilder {
        const builder = new UpdateBuilder(this.table, data);
        return builder;
    }

    delete(): DeleteBuilder {
        const builder = new DeleteBuilder(this.table);
        return builder;
    }

    // Direct Access shortcuts (optional, but requested architecture implies strictly builders)
}

/**
 * Base class for query builders to share connection resolution logic.
 */
class BaseBuilder {
    protected _connection: string | null = null;
    protected _transaction: any = null;

    constructor(protected table: string) {}

    protected async resolveConnectionName(): Promise<string> {
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
    private _where: string[] = [];
    private _bindings: any[] = [];
    private _limit: number | null = null;
    private _offset: number | null = null;
    private _select: string;

    constructor(table: string, fields: string[]) {
        super(table);
        this._select = fields.join(', ');
    }

    useTransaction(transaction: any): this {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }

    useConnection(name: string): this {
        this._connection = name;
        return this;
    }

    where(field: string, value: any, operator: string = '='): this {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }

    limit(limit: number): this {
        this._limit = limit;
        return this;
    }

    offset(offset: number): this {
        this._offset = offset;
        return this;
    }

    async get(): Promise<any[]> {
        return this.exec();
    }

    async getOne(): Promise<any> {
        this.limit(1);
        const res = await this.exec();
        return res[0] || null;
    }

    async exec(): Promise<any[]> {
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
    constructor(table: string, private data: Record<string, any>) {
        super(table);
    }

    useConnection(name: string): this {
        this._connection = name;
        return this;
    }

    useTransaction(transaction: any): this {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }

    async exec(): Promise<any> {
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
                        } else {
                            this.data[field.name] = field.defaultValue;
                        }
                    }
                }
            }
        } catch (e) {
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
    private _where: string[] = [];
    private _bindings: any[] = [];

    constructor(table: string, private data: Record<string, any>) {
        super(table);
    }

    useConnection(name: string): this {
        this._connection = name;
        return this;
    }

    useTransaction(transaction: any): this {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }

    where(field: string, value: any, operator: string = '='): this {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }

    async exec(): Promise<any> {
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
    private _where: string[] = [];
    private _bindings: any[] = [];

    constructor(table: string) {
        super(table);
    }

    useConnection(name: string): this {
        this._connection = name;
        return this;
    }

    useTransaction(transaction: any): this {
        this._transaction = transaction;
        if (transaction && transaction.connectionName) {
            this._connection = transaction.connectionName;
        }
        return this;
    }

    where(field: string, value: any, operator: string = '='): this {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }

    async exec(): Promise<any> {
        const connName = await this.resolveConnectionName();
        
        let sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        return new Executor(sql).bind(this._bindings).useConnection(connName).useTransaction(this._transaction).execute();
    }
}