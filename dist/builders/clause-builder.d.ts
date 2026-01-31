export declare class ClauseBuilder {
    protected mapper: any;
    protected target: string;
    protected query: any;
    constructor(mapper: any, target: string);
    where(field: string, value: any, operator?: string): this;
    whereComplex(raw: string): this;
    whereRaw(raw: string): this;
    limit(n: number): this;
    offset(n: number): this;
}
