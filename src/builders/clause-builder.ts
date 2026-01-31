export class ClauseBuilder {
    protected query: any;

    constructor(protected mapper: any, protected target: string) {
        // Initialize the underlying query object from the mapper core
        this.query = mapper.use(target);
    }

    where(field: string, value: any, operator?: string): this {
        this.query.where(field, value, operator);
        return this;
    }

    whereComplex(raw: string): this {
        this.query.whereComplex(raw);
        return this;
    }

    whereRaw(raw: string): this {
        return this.whereComplex(raw);
    }

    limit(n: number): this {
        this.query.limit(n);
        return this;
    }

    offset(n: number): this {
        this.query.offset(n);
        return this;
    }
}
