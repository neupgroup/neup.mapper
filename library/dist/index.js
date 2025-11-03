export class Mapper {
    constructor() {
        this.schemas = new Map();
    }
    register(schema) {
        this.schemas.set(schema.name, schema);
        return this;
    }
    get(name) {
        return this.schemas.get(name);
    }
    list() {
        return Array.from(this.schemas.values());
    }
}
export default Mapper;
export * from './actions/ai-schema-suggestion';
export * from './actions/ai-operation-suggestion';
export * from './orm';
