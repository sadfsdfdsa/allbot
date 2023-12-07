import { MessageEntity } from 'telegraf/types'

export const isChatGroup = (chatId: number): boolean => {
  return chatId < 0
}

export const getMentionsFromEntities = (
  text: string,
  entities: MessageEntity[] | undefined
): string[] => {
  const mentions: string[] = []

  entities?.forEach((entity) => {
    if (entity.type !== 'mention') return

    const mention = text.slice(entity.offset + 1, entity.offset + entity.length)

    mentions.push(mention)
  })

  return mentions
}

type MatchedMentionsResult = {
  successIds: string[]
  successMentions: string[]
  missedMentions: string[]
}

export const matchMentionsToUsers = (
  mentions: string[],
  reversedUsers: Record<string, string>
): MatchedMentionsResult => {
  const ids: string[] = []
  const successMentions: string[] = []
  const missedMentions: string[] = []

  mentions.forEach((mention) => {
    if (!reversedUsers[mention]) {
      missedMentions.push('@' + mention)
      return
    }

    ids.push(reversedUsers[mention])
    successMentions.push('@' + mention)
  })

  return {
    successIds: ids,
    successMentions,
    missedMentions,
  }
}
