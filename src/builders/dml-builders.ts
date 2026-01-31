import { ClauseBuilder } from './clause-builder.js';

export class SelectBuilder extends ClauseBuilder {
    constructor(mapper: any, target: string, public fields: string[] = []) {
        super(mapper, target);
        if (fields.length > 0) {
            this.query.selectFields(fields);
        }
    }

    async get(): Promise<any[]> {
        return this.query.get();
    }

    async getOne(): Promise<any | null> {
        return this.query.getOne();
    }
}

export class InsertBuilder {
    private query: any;

    constructor(private mapper: any, private target: string, private data: any) {
        this.query = mapper.use(target);
        // Ensure we handle auto-registration if needed (legacy behavior support)
        this.ensureSchema(mapper, target);
    }

    private ensureSchema(mapper: any, target: string) {
        try {
            mapper.use(target);
        } catch (e) {
            mapper.getSchemaManager().create(target).use({ connection: 'default', collection: target }).setStructure({});
        }
    }

    async run(): Promise<any> {
        return this.mapper.add(this.target, this.data);
    }
}

export class UpdateBuilder extends ClauseBuilder {
    constructor(mapper: any, target: string, private data: any) {
        super(mapper, target);
        this.query.to(data);
    }

    async run(): Promise<void> {
        return this.query.update();
    }
}

export class DeleteBuilder extends ClauseBuilder {
    constructor(mapper: any, target: string) {
        super(mapper, target);
    }

    async run(): Promise<void> {
        return this.query.delete();
    }
}
