import { Executor } from '../core/executor.js';

export class CrudBase {
    constructor(private table: string) {}

    select(fields: string[] = ['*']): SelectBuilder {
        return new SelectBuilder(this.table, fields);
    }

    insert(data: Record<string, any>): InsertBuilder {
        return new InsertBuilder(this.table, data);
    }

    update(data: Record<string, any>): UpdateBuilder {
        return new UpdateBuilder(this.table, data);
    }

    delete(): DeleteBuilder {
        return new DeleteBuilder(this.table);
    }
    
    // Direct Access shortcuts (optional, but requested architecture implies strictly builders)
}

export class SelectBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];
    private _limit: number | null = null;
    private _offset: number | null = null;
    private _select: string;

    constructor(private table: string, fields: string[]) {
        this._select = fields.join(', ');
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
        return new Executor(sql).bind(this._bindings).execute();
    }
}

export class InsertBuilder {
    constructor(private table: string, private data: Record<string, any>) {}

    async exec(): Promise<any> {
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return new Executor(sql).bind(values).execute();
    }
}

export class UpdateBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];

    constructor(private table: string, private data: Record<string, any>) {}

    where(field: string, value: any, operator: string = '='): this {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }

    async exec(): Promise<any> {
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        let sql = `UPDATE ${this.table} SET ${setClause}`;
        
        const allBindings = [...values];
        
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
            allBindings.push(...this._bindings);
        }
        
        return new Executor(sql).bind(allBindings).execute();
    }
}

export class DeleteBuilder {
    private _where: string[] = [];
    private _bindings: any[] = [];

    constructor(private table: string) {}

    where(field: string, value: any, operator: string = '='): this {
        this._where.push(`${field} ${operator} ?`);
        this._bindings.push(value);
        return this;
    }

    async exec(): Promise<any> {
        let sql = `DELETE FROM ${this.table}`;
        if (this._where.length > 0) {
            sql += ` WHERE ${this._where.join(' AND ')}`;
        }
        return new Executor(sql).bind(this._bindings).execute();
    }
}
