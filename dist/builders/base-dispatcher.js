import { SelectBuilder, InsertBuilder, UpdateBuilder, DeleteBuilder } from './dml-builders.js';
export class BaseDispatcher {
    constructor(mapper, target) {
        this.mapper = mapper;
        this.target = target;
    }
    select(fields = []) {
        return new SelectBuilder(this.mapper, this.target, fields);
    }
    insert(data) {
        return new InsertBuilder(this.mapper, this.target, data);
    }
    update(data) {
        return new UpdateBuilder(this.mapper, this.target, data);
    }
    delete() {
        return new DeleteBuilder(this.mapper, this.target);
    }
}
