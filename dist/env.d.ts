import { ConnectionType } from './index.js';
export type EnvDslConnections = Record<string, Record<string, string>>;
/**
 * Parse a simple DSL of the form:
 * connections = [
 *   connectionName = [
 *     key: value,
 *     key2: "value2",
 *   ],
 *   other = [
 *     type: SQL,
 *     host: localhost,
 *   ]
 * ]
 */
export declare function parseConnectionsDsl(text: string): EnvDslConnections;
export type NormalizedConnection = {
    name: string;
    type: ConnectionType;
    key: Record<string, any>;
};
/**
 * Convert DSL map to normalized connections compatible with library Connections.
 * If no explicit type is provided, defaults to 'api'.
 */
export declare function toNormalizedConnections(map: EnvDslConnections): NormalizedConnection[];
