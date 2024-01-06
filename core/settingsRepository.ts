import { RedisClientType } from 'redis'
import { Chat } from 'telegraf/types'
import { GroupSettings, SettingsItem } from './utils/utils.js'
import { MetricsService } from './metrics.js'

export type SettingsAction =
  | 'crudCustomMention'
  | 'useAllMention'
  | 'useCustomMention'

const map: Record<SettingsItem, SettingsAction> = {
  ccm: 'crudCustomMention',
  uam: 'useAllMention',
  ucm: 'useCustomMention',
} as const

export class SettingsRepository {
  constructor(
    private readonly db: RedisClientType<any, any, any>,
    private readonly metrics: MetricsService
  ) {
    console.log('[LAUNCH] Init Settings repository')
  }

  public async updateSettings(
    chatId: Chat['id'],
    setting: SettingsItem,
    value: boolean
  ): Promise<void> {
    await this.db.hSet(this.getKey(chatId), map[setting], `${value}`)

    this.metrics.settingsCounter.inc({
      chatId: chatId,
      action: `updateSettings.${map[setting]}`,
    })

    this.metrics.dbOpsCounter.inc({
      action: 'updateSettings#hSet',
    })
  }

  public async getSettingsCompressed(
    chatId: Chat['id']
  ): Promise<GroupSettings> {
    const settings = await this.db.hGetAll(this.getKey(chatId))

    this.metrics.dbOpsCounter.inc({
      action: 'getSettingsCompressed#hGetAll',
    })

    return {
      ccm: settings[map.ccm] === 'true',
      uam: settings[map.uam] === 'true',
      ucm: settings[map.ucm] === 'true',
    }
  }

  public async getSettings(chatId: Chat['id']) {
    const settings = await this.db.hGetAll(this.getKey(chatId))

    this.metrics.dbOpsCounter.inc({
      action: 'getSettings#hGetAll',
    })

    return {
      [map.ccm]: settings[map.ccm] === 'true',
      [map.uam]: settings[map.uam] === 'true',
      [map.ucm]: settings[map.ucm] === 'true',
    }
  }

  private getKey(chatId: Chat['id']): string {
    return `${chatId}.settings`
  }
}
