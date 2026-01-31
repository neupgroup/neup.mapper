import { SelectBuilder, InsertBuilder, UpdateBuilder, DeleteBuilder } from './dml-builders.js';

export class BaseDispatcher {
    constructor(private mapper: any, private target: string) { }

    select(fields: string[] = []): SelectBuilder {
        return new SelectBuilder(this.mapper, this.target, fields);
    }

    insert(data: any): InsertBuilder {
        return new InsertBuilder(this.mapper, this.target, data);
    }

    update(data: any): UpdateBuilder {
        return new UpdateBuilder(this.mapper, this.target, data);
    }

    delete(): DeleteBuilder {
        return new DeleteBuilder(this.mapper, this.target);
    }
}
