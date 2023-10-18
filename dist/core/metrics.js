import { Registry, Counter, collectDefaultMetrics } from 'prom-client';
const KEY_FOR_TIMESTAMP = '!TIMESTAMP';
const KEY_FOR_COUNTER = '!COUNTER';
const KEY_FOR_PAYMENTS = '!PAYMENTS';
export class MetricsService {
    db;
    registry;
    replyCounter;
    cacheCounter;
    teamsCacheCounter;
    constructor(db, measureDefaultMetrics = true) {
        this.db = db;
        console.log('Metrics service started');
        this.registry = new Registry();
        this.replyCounter = new Counter({
            name: 'allbot_replies_counter',
            help: 'The number of total replies of bot',
        });
        this.registry.registerMetric(this.replyCounter);
        this.cacheCounter = new Counter({
            name: 'allbot_replies_cache',
            help: 'The number of total users in cache right now',
        });
        this.registry.registerMetric(this.cacheCounter);
        this.teamsCacheCounter = new Counter({
            name: 'allbot_replies_team_cache',
            help: 'The number of total teams in cache right now',
        });
        this.registry.registerMetric(this.teamsCacheCounter);
        if (!measureDefaultMetrics)
            return;
        collectDefaultMetrics({
            register: this.registry,
        });
    }
    updateLatestUsage(key) {
        const date = new Date();
        this.db
            .hSet(KEY_FOR_TIMESTAMP, {
            [key]: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
        })
            .catch(console.error);
        this.db.hIncrBy(KEY_FOR_COUNTER, key, 1).catch(console.error);
    }
    updateLatestPaymentsCall(key) {
        this.db.hIncrBy(KEY_FOR_PAYMENTS, key, 1).catch(console.error);
    }
    async getMetrics() {
        const metrics = await this.registry.metrics();
        return {
            metrics,
            contentType: this.registry.contentType,
        };
    }
}
