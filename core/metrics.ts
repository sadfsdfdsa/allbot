import { Registry, Counter, collectDefaultMetrics } from 'prom-client'
import { RedisClientType } from 'redis'

const KEY_FOR_TIMESTAMP = 'TIMESTAMP'

export class MetricsService {
  private readonly registry: Registry

  private readonly replyCounter: Counter

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    measureDefaultMetrics = true
  ) {
    console.log('Metrics service started')

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

  public updateLatestUsage(key: string): void {
    const date = new Date()

    this.db.hSet(KEY_FOR_TIMESTAMP, {
      [key]: date.toLocaleString('ru-RU', {timeZone: 'Asia/Yekaterinburg'})
    }).catch(console.error)
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
