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

export class SelectBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];
    private _limit: number | null = null;
    private _offset: number | null = null;
    private _select: string;
    private _connection: string | null = null;
    private _transaction: any = null;

    constructor(private table: string, fields: string[]) {
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
        await ensureInitialized();

        // Resolve Connection
        let connName = this._connection;
        if (!connName) {
            const schemaDef = InitMapper.getInstance().getSchemaDef(this.table);
            if (schemaDef && schemaDef.usesConnection) {
                connName = schemaDef.usesConnection;
            } else {
                const defaultConn = InitMapper.getInstance().getDefaultConnection();
                connName = defaultConn ? defaultConn.name : 'default';
            }
        }

        if (!connName) connName = 'default';

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

export class InsertBuilder {
    private _connection: string | null = null;
    private _transaction: any = null;
    constructor(private table: string, private data: Record<string, any>) { }

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
        await ensureInitialized();

        // Resolve Connection
        let connName = this._connection;
        if (!connName) {
            const schemaDef = InitMapper.getInstance().getSchemaDef(this.table);
            if (schemaDef && schemaDef.usesConnection) {
                connName = schemaDef.usesConnection;
            } else {
                const defaultConn = InitMapper.getInstance().getDefaultConnection();
                connName = defaultConn ? defaultConn.name : 'default';
            }
        }

        if (!connName) connName = 'default';

        // Apply default values from schema definition
        const schemaManager = InitMapper.getInstance().getSchemaManager();
        try {
            // Try to get schema definition to apply defaults
            const schemas = schemaManager.list();
            const schemaDef = schemas.find(s => s.collectionName === this.table || s.name === this.table);

            if (schemaDef && schemaDef.fields) {
                // Apply defaults for missing fields
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
            // Schema not found or error accessing it, continue without defaults
        }

        // Convert Date objects to ISO strings for database compatibility
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

export class UpdateBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];
    private _connection: string | null = null;
    private _transaction: any = null;

    constructor(private table: string, private data: Record<string, any>) { }

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
        await ensureInitialized();

        // Resolve Connection
        let connName = this._connection;
        if (!connName) {
            const schemaDef = InitMapper.getInstance().getSchemaDef(this.table);
            if (schemaDef && schemaDef.usesConnection) {
                connName = schemaDef.usesConnection;
            } else {
                const defaultConn = InitMapper.getInstance().getDefaultConnection();
                connName = defaultConn ? defaultConn.name : 'default';
            }
        }

        if (!connName) connName = 'default';

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

export class DeleteBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];
    private _connection: string | null = null;
    private _transaction: any = null;

    constructor(private table: string) { }

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
        await ensureInitialized();

        // Resolve Connection
        let connName = this._connection;
        if (!connName) {
            const schemaDef = InitMapper.getInstance().getSchemaDef(this.table);
            if (schemaDef && schemaDef.usesConnection) {
                connName = schemaDef.usesConnection;
            } else {
                const defaultConn = InitMapper.getInstance().getDefaultConnection();
                connName = defaultConn ? defaultConn.name : 'default';
            }
        }

        if (!connName) connName = 'default';

        let sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        return new Executor(sql).bind(this._bindings).useConnection(connName).useTransaction(this._transaction).execute();
    }
}
