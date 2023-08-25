import { createClient } from 'redis';
export const createDB = async (uri) => {
    console.time('Starting redis');
    if (!uri) {
        throw new Error('No redis URI set');
    }
    const client = createClient({
        url: uri,
    });
    client.on('error', (err) => {
        console.error('Redis error', err);
        if (!client.isOpen) {
            client.connect().catch(console.error);
        }
    });
    await client.connect();
    console.timeEnd('Starting redis');
    return client;
};
