function stripComments(input) {
    return input
        .split(/\r?\n/)
        .map(line => line.replace(/#.*$/, ''))
        .join('\n');
}
function unquote(val) {
    const trimmed = val.trim();
    if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
        return trimmed.slice(1, -1);
    }
    return trimmed;
}
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
export function parseConnectionsDsl(text) {
    const cleaned = stripComments(text);
    const result = {};
    // Find the connections block
    const match = cleaned.match(/connections\s*=\s*\[/i);
    if (!match)
        return result;
    // Extract everything after 'connections = [' and before the final ']'
    const start = match.index + match[0].length;
    const after = cleaned.slice(start);
    // naive bracket balance to find end of top-level list
    let depth = 1;
    let endIndex = -1;
    for (let i = 0; i < after.length; i++) {
        const ch = after[i];
        if (ch === '[')
            depth++;
        else if (ch === ']') {
            depth--;
            if (depth === 0) {
                endIndex = i;
                break;
            }
        }
    }
    const inner = endIndex >= 0 ? after.slice(0, endIndex) : after;
    // Split by connection assignments at top level: name = [ ... ]
    const connBlocks = inner.split(/\],?/).map(s => s.trim()).filter(Boolean);
    for (const block of connBlocks) {
        const assign = block.match(/^(\w[\w-]*)\s*=\s*\[/);
        if (!assign)
            continue;
        const name = assign[1];
        const content = block.slice(assign[0].length); // inside the [ ...
        const lines = content.split(/\r?\n|,/).map(l => l.trim()).filter(l => l.length);
        const map = {};
        for (const line of lines) {
            const kv = line.match(/^(\w[\w-]*)\s*:\s*(.+)$/);
            if (!kv)
                continue;
            const key = kv[1];
            const value = unquote(kv[2].replace(/,\s*$/, ''));
            map[key] = value;
        }
        result[name] = map;
    }
    return result;
}
/**
 * Convert DSL map to normalized connections compatible with library Connections.
 * If no explicit type is provided, defaults to 'api'.
 */
export function toNormalizedConnections(map) {
    const conns = [];
    for (const [name, kv] of Object.entries(map)) {
        const rawType = (kv['type'] || kv['dbType'] || '').toLowerCase();
        const type = ['mysql', 'sql', 'firestore', 'mongodb', 'postgres', 'api', 'sqlite'].includes(rawType) ? rawType : 'api';
        const { type: _omitType, dbType: _omitDbType, ...rest } = kv;
        conns.push({ name, type, key: rest });
    }
    return conns;
}
