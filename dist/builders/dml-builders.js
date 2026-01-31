import { ClauseBuilder } from './clause-builder.js';
export class SelectBuilder extends ClauseBuilder {
    constructor(mapper, target, fields = []) {
        super(mapper, target);
        this.fields = fields;
        if (fields.length > 0) {
            this.query.selectFields(fields);
        }
    }
    async get() {
        return this.query.get();
    }
    async getOne() {
        return this.query.getOne();
    }
}
export class InsertBuilder {
    constructor(mapper, target, data) {
        this.mapper = mapper;
        this.target = target;
        this.data = data;
        this.query = mapper.use(target);
        // Ensure we handle auto-registration if needed (legacy behavior support)
        this.ensureSchema(mapper, target);
    }
    ensureSchema(mapper, target) {
        try {
            mapper.use(target);
        }
        catch (e) {
            mapper.getSchemaManager().create(target).use({ connection: 'default', collection: target }).setStructure({});
        }
    }
    async run() {
        return this.mapper.add(this.target, this.data);
    }
}
export class UpdateBuilder extends ClauseBuilder {
    constructor(mapper, target, data) {
        super(mapper, target);
        this.data = data;
        this.query.to(data);
    }
    async run() {
        return this.query.update();
    }
}
export class DeleteBuilder extends ClauseBuilder {
    constructor(mapper, target) {
        super(mapper, target);
    }
    async run() {
        return this.query.delete();
    }
}
