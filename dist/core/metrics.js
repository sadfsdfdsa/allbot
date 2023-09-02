import { Registry, Counter, collectDefaultMetrics } from 'prom-client';
export class MetricsService {
    registry;
    replyCounter;
    constructor(measureDefaultMetrics = true) {
        this.registry = new Registry();
        this.replyCounter = new Counter({
            name: 'allbot_replies_counter',
            help: 'The number of total replies of bot',
        });
        this.registry.registerMetric(this.replyCounter);
        if (!measureDefaultMetrics)
            return;
        collectDefaultMetrics({
            register: this.registry,
        });
    }
    addReply() {
        this.replyCounter.inc();
    }
    async getMetrics() {
        const metrics = await this.registry.metrics();
        return {
            metrics,
            contentType: this.registry.contentType,
        };
    }
}
