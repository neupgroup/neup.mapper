import { Executor } from '../core/executor.js';
export class CrudBase {
    constructor(table) {
        this.table = table;
    }
    select(fields = ['*']) {
        return new SelectBuilder(this.table, fields);
    }
    insert(data) {
        return new InsertBuilder(this.table, data);
    }
    update(data) {
        return new UpdateBuilder(this.table, data);
    }
    delete() {
        return new DeleteBuilder(this.table);
    }
}
export class SelectBuilder {
    constructor(table, fields) {
        this.table = table;
        this._where = [];
        this._bindings = [];
        this._limit = null;
        this._offset = null;
        this._select = fields.join(', ');
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
        return new Executor(sql).bind(this._bindings).execute();
    }
}
export class InsertBuilder {
    constructor(table, data) {
        this.table = table;
        this.data = data;
    }
    async exec() {
        const keys = Object.keys(this.data);
        const values = Object.values(this.data);
        const placeholders = keys.map(() => '?').join(', ');
        const sql = `INSERT INTO ${this.table} (${keys.join(', ')}) VALUES (${placeholders})`;
        return new Executor(sql).bind(values).execute();
    }
}
export class UpdateBuilder {
    constructor(table, data) {
        this.table = table;
        this.data = data;
        this._where = [];
        this._bindings = [];
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
        return new Executor(sql).bind(allBindings).execute();
    }
}
export class DeleteBuilder {
    constructor(table) {
        this.table = table;
        this._where = [];
        this._bindings = [];
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
        return new Executor(sql).bind(this._bindings).execute();
    }
}
