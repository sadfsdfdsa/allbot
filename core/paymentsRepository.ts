import { Chat } from 'telegraf/types'
import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js'

type ChatId = string
type Limit = number | 'unlimited'

export class PaymentsRepository {
  private readonly mentionsLimitsPerGroup: Record<ChatId, Limit> = {}

  private readonly LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT

  constructor(envString: string | undefined) {
    if (!envString) return

    const parsed = envString.split(';')
    parsed.forEach((teamWithLimit) => {
      const [groupId, limit] = teamWithLimit.split('=')

      const finalLimit = limit === 'unlimited' ? limit : Number(limit)

      this.mentionsLimitsPerGroup[Number(groupId)] = finalLimit
    })

    console.log(
      '[LAUNCH] Init payments repository',
      this.mentionsLimitsPerGroup
    )
  }

  public getLimitByChatId(chatId: Chat['id']): Limit {
    return (
      this.mentionsLimitsPerGroup[chatId.toString()] ?? this.LIMIT_FOR_GROUP
    )
  }
}
