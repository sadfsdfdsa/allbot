import { Chat } from 'telegraf/types'
import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js'

type ChatId = Chat['id']
type Limit = number | 'unlimited'

export class PaymentsRepository {
  private readonly mentionsLimitsPerGroup: Record<ChatId, Limit> = {}

  private readonly LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT

  constructor(envString: string | undefined) {
    if (!envString) return

    const parsed = envString.split(';')
    parsed.forEach((teamWithLimit) => {
      const [groupId, limit] = teamWithLimit.split('=')
      if (!groupId) return

      const finalLimit = limit === 'unlimited' ? limit : Number(limit)

      this.mentionsLimitsPerGroup[Number(groupId)] = finalLimit
    })

    console.log(
      '[LAUNCH] Init payments repository',
      this.mentionsLimitsPerGroup
    )
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
