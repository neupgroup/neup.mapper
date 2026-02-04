import Mapper from '@neupgroup/mapper';
import { connections } from './connections';

const mapperInit = Mapper.init();
const existingConns = mapperInit.getConnections();

connections.forEach(conn => {
    // Check if connection exists by name
    if (!existingConns.get(conn.name)) {
        console.log(`[Init] Registering connection: ${conn.name}`);
        mapperInit.connect(conn.name, conn.type, conn);
    }
});
