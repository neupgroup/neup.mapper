export declare const test_users: {
    fields: ({
        name: string;
        type: string;
        isPrimary: boolean;
        autoIncrement: boolean;
    } | {
        name: string;
        type: string;
        isPrimary?: undefined;
        autoIncrement?: undefined;
    })[];
    insertableFields: string[];
    updatableFields: string[];
    massUpdateable: boolean;
    massDeletable: boolean;
    usesConnection: string;
};
