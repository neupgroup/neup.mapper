export type ColumnType = 'string' | 'number' | 'boolean' | 'date' | 'int';
export type ConnectionType = 'mysql' | 'sql' | 'firestore' | 'mongodb' | 'postgres' | 'api' | 'sqlite';
export interface Field {
    name: string;
    type: ColumnType;
    editable?: boolean;
    autoIncrement?: boolean;
    nullable?: boolean;
    defaultValue?: any;
    isUnique?: boolean;
    isForeignKey?: boolean;
    foreignRef?: string;
    enumValues?: any[];
    config?: any[];
}
export interface SchemaDef {
    name: string;
    connectionName: string;
    collectionName: string;
    fields: Field[];
    fieldsMap: Map<string, Field>;
    allowUndefinedFields?: boolean;
    insertableFields?: string[];
    updatableFields?: string[];
    deleteType: 'softDelete' | 'hardDelete';
    massDeleteAllowed: boolean;
    massEditAllowed: boolean;
}
