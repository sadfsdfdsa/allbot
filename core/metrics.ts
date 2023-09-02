import { Registry, Counter, collectDefaultMetrics } from 'prom-client'

export class MetricsService {
  private readonly registry: Registry

  private readonly replyCounter: Counter

  constructor(measureDefaultMetrics = true) {
    this.registry = new Registry()

    this.replyCounter = new Counter({
      name: 'allbot_replies_counter',
      help: 'The number of total replies of bot',
    })
    this.registry.registerMetric(this.replyCounter)

    if (!measureDefaultMetrics) return
    collectDefaultMetrics({
      register: this.registry,
    })
  }

  public addReply(): void {
    this.replyCounter.inc()
  }

  public async getMetrics(): Promise<{
    contentType: string
    metrics: string
  }> {
    const metrics = await this.registry.metrics()

    return {
      metrics,
      contentType: this.registry.contentType,
    }
  }
}
