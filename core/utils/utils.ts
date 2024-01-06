import { InlineKeyboardButton, MessageEntity } from 'telegraf/types'
import {
  ALL_MEMBERS_SETTINGS_TEXT,
  ONLY_ADMIN_SETTINGS_TEXT,
} from '../constants/texts.js'

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

export type SettingsItem = 'ucm' | 'ccm' | 'uam'

export type GroupSettings = {
  [key in SettingsItem]: boolean
}

export type Settings = {
  s: SettingsItem
} & GroupSettings

export const createSettingsKeyboard = (
  settings: GroupSettings
): InlineKeyboardButton[][] => {
  const ucm: Settings = {
    ...settings,
    s: 'ucm',
  }
  const customMentionBtn = {
    callback_data: `/settings_${JSON.stringify(ucm)}`,
    text: `Use custom mentions: ${
      settings.ucm ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT
    } `,
  }

  const ccm: Settings = {
    ...settings,
    s: 'ccm',
  }
  const crudCustomMentionBtn = {
    callback_data: `/settings_${JSON.stringify(ccm)}`,
    text: `Edit/create/delete custom mentions: ${
      settings.ccm ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT
    } `,
  }

  const uam: Settings = {
    ...settings,
    s: 'uam',
  }
  const allMentionBtn = {
    callback_data: `/settings_${JSON.stringify(uam)}`,
    text: `Use mention @all: ${
      settings.uam ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT
    } `,
  }

  return [[allMentionBtn], [customMentionBtn], [crudCustomMentionBtn]]
}
