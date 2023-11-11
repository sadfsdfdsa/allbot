import { Registry, Counter, collectDefaultMetrics, Histogram } from 'prom-client'
import { RedisClientType } from 'redis'

const KEY_FOR_TIMESTAMP = '!TIMESTAMP'
const KEY_FOR_COUNTER = '!COUNTER'
const KEY_FOR_PAYMENTS = '!PAYMENTS'

export class MetricsService {
  private readonly registry: Registry

  public readonly replyCounter: Counter

  public readonly cacheCounter: Counter

  public readonly cacheClearingCounter: Counter

  public readonly groupsCounter: Counter

  public readonly commandsCounter: Counter

  public readonly dbOpsCounter: Counter

  public readonly replyUsersHistogram: Histogram

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    measureDefaultMetrics = false,
  ) {
    console.log('[LAUNCH] Metrics service started')

    this.registry = new Registry()

    this.replyCounter = new Counter({
      name: 'allbot_replies_counter',
      help: 'The number of total replies of bot',
      labelNames: ['chatId', 'withPayments'],
    })
    this.registry.registerMetric(this.replyCounter)

    this.replyUsersHistogram = new Histogram({
      name: 'allbot_replies_histogram',
      help: 'The number of total replies of bot',
      buckets: [1, 5, 10, 25, 50, 100]
    })
    this.registry.registerMetric(this.replyUsersHistogram)

    this.cacheClearingCounter = new Counter({
      name: 'allbot_cache_clearing',
      help: 'The number of total replies of bot',
      labelNames: ['time'],
    })
    this.registry.registerMetric(this.cacheClearingCounter)

    this.cacheCounter = new Counter({
      name: 'allbot_users_cache',
      help: 'The number of total users in cache right now',
      labelNames: ['chatId'],
    })
    this.registry.registerMetric(this.cacheCounter)

    this.groupsCounter = new Counter({
      name: 'allbot_groups',
      help: 'The number of new added/deleted groups',
      labelNames: ['action', 'chatId', 'time'],
    })
    this.registry.registerMetric(this.groupsCounter)

    this.commandsCounter = new Counter({
      name: 'allbot_command_call',
      help: 'The number of calls of commands',
      labelNames: ['command', 'chatId'],
    })
    this.registry.registerMetric(this.commandsCounter)

    this.dbOpsCounter = new Counter({
      name: 'allbot_database_operations',
      help: 'The number of calls of database calls',
      labelNames: ['action'],
    })
    this.registry.registerMetric(this.dbOpsCounter)

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
