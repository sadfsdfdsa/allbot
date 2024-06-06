import { Chat } from 'telegraf/types'
import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js'
import { RedisClientType } from 'redis'
import { MetricsService } from './metrics.js'

type ChatId = Chat['id']
type Limit = number | 'unlimited'

const LIMITS_TABLE_NAME = 'SYSTEM_GROUPS_LIMITS'

export class PaymentsRepository {
  private readonly mentionsLimitsPerGroup: Record<ChatId, Limit> = {}

  private readonly LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    private readonly metrics: MetricsService
  ) {
    console.log('[LAUNCH] Init payments repository')
  }

  public async loadLimits(): Promise<void> {
    const parsed = await this.db.hGetAll(LIMITS_TABLE_NAME)

    this.metrics.dbOpsCounter.inc({
      action: 'payments.loadLimits',
    })

    Object.entries(parsed).forEach(([chatId, limit]) => {
      const finalLimit = limit === 'unlimited' ? limit : Number(limit)

      this.mentionsLimitsPerGroup[Number(chatId)] = finalLimit
    })

    console.log(
      '[LAUNCH] Init payments limits for groups',
      this.mentionsLimitsPerGroup
    )
  }

  public async setGroupLimit(chatId: Chat['id'], limit: Limit): Promise<void> {
    await this.db.hSet(LIMITS_TABLE_NAME, chatId.toString(), limit.toString())

    this.mentionsLimitsPerGroup[chatId] = limit

    this.metrics.dbOpsCounter.inc({
      action: 'payments.setGroupLimit',
    })

    console.log('[paymentsRepository] set limit for chat', limit, chatId)
  }

  public getPayloadForInvoice(chatId: Chat['id']): string {
    return `invoice:${chatId}`
  }

  public getParsedChatFromInvoicePayload(
    payload: string
  ): Chat['id'] | undefined {
    const [, chatId] = payload.split(':')

    return Number.parseInt(chatId)
  }

  public getHasGroupUnlimited(chatId: Chat['id']): boolean {
    return this.mentionsLimitsPerGroup[chatId] === 'unlimited'
  }

  public getLimitByChatId(chatId: Chat['id']): Limit {
    return this.mentionsLimitsPerGroup[chatId] ?? this.LIMIT_FOR_GROUP
  }

  public getGroupsWithUnlimited(): ChatId[] {
    return Object.keys(this.mentionsLimitsPerGroup).map(Number)
  }
}
