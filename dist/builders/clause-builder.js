export class ClauseBuilder {
    constructor(mapper, target) {
        this.mapper = mapper;
        this.target = target;
        // Initialize the underlying query object from the mapper core
        this.query = mapper.use(target);
    }
    where(field, value, operator) {
        this.query.where(field, value, operator);
        return this;
    }
    whereComplex(raw) {
        this.query.whereComplex(raw);
        return this;
    }
    whereRaw(raw) {
        return this.whereComplex(raw);
    }
    limit(n) {
        this.query.limit(n);
        return this;
    }
    offset(n) {
        this.query.offset(n);
        return this;
    }
}
