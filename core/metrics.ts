import { Registry, Counter, collectDefaultMetrics } from 'prom-client'
import { RedisClientType } from 'redis'

const KEY_FOR_TIMESTAMP = '!TIMESTAMP'
const KEY_FOR_COUNTER = '!COUNTER'
const KEY_FOR_PAYMENTS = '!PAYMENTS'

export class MetricsService {
  private readonly registry: Registry

  public readonly replyCounter: Counter

  public readonly cacheCounter: Counter

  public readonly teamsCacheCounter: Counter

  public readonly newTeamsCounter: Counter

  public readonly deletedTeamsCounter: Counter

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    measureDefaultMetrics = false
  ) {
    console.log('[LAUNCH] Metrics service started')

    this.registry = new Registry()

    this.replyCounter = new Counter({
      name: 'allbot_replies_counter',
      help: 'The number of total replies of bot',
    })
    this.registry.registerMetric(this.replyCounter)

    this.cacheCounter = new Counter({
      name: 'allbot_users_cache',
      help: 'The number of total users in cache right now',
    })
    this.registry.registerMetric(this.cacheCounter)

    this.teamsCacheCounter = new Counter({
      name: 'allbot_teams_cache',
      help: 'The number of total teams in cache right now',
    })
    this.registry.registerMetric(this.teamsCacheCounter)

    this.newTeamsCounter = new Counter({
      name: 'allbot_add_team',
      help: 'The number of new added teams',
    })
    this.registry.registerMetric(this.newTeamsCounter)

    this.deletedTeamsCounter = new Counter({
      name: 'allbot_delete_team',
      help: 'The number of teams bot deleted from',
    })
    this.registry.registerMetric(this.deletedTeamsCounter)

    if (!measureDefaultMetrics) return

    collectDefaultMetrics({
      register: this.registry,
    })
  }

  public updateLatestUsage(key: string): void {
    const date = new Date()

    this.db
      .hSet(KEY_FOR_TIMESTAMP, {
        [key]: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
      })
      .catch(console.error)

    this.db.hIncrBy(KEY_FOR_COUNTER, key, 1).catch(console.error)
  }

  public updateLatestPaymentsCall(key: string): void {
    this.db.hIncrBy(KEY_FOR_PAYMENTS, key, 1).catch(console.error)
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
