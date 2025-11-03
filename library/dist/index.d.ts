export type ColumnType = 'string' | 'number' | 'boolean' | 'date';
export interface Field {
    name: string;
    type: ColumnType;
    nullable?: boolean;
    defaultValue?: unknown;
}
export interface Schema {
    name: string;
    fields: Field[];
}
export declare class Mapper {
    private schemas;
    register(schema: Schema): this;
    get(name: string): Schema | undefined;
    list(): Schema[];
}
export default Mapper;
export * from './actions/ai-schema-suggestion';
export * from './actions/ai-operation-suggestion';
export * from './orm';
