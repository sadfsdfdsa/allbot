import { RedisClientType } from 'redis'
import { CacheService } from './cache.js'
import { MetricsService } from './metrics.js'
import { Chat } from 'telegraf/types'
import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js'

export class MentionRepository {
  private readonly LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT

  private readonly UNLIMITED_CHAT_IDS_ARR: string[] = [
    // -4059488811
  ]

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    private readonly metrics: MetricsService,
    private readonly cache: CacheService
  ) {
    console.log('[LAUNCH] Init Mention repository', this.cache, this.metrics)
  }

  public async checkIfMentionExists(
    chatId: Chat['id'],
    mention: string
  ): Promise<boolean> {
    const key = this.getKeyForMention(chatId)

    const isExists = await this.db.hExists(key, mention)

    this.metrics.dbOpsCounter.inc({
      action: 'checkIfMentionExists#hLen',
    })

    return isExists
  }

  public async addUsersToMention(
    chatId: Chat['id'],
    mention: string,
    users: string[]
  ): Promise<boolean> {
    const key = this.getKeyForMention(chatId)

    const alreadyInDb = await this.getUsersIdsByMention(chatId, mention)
    if (!alreadyInDb.length) {
      if (!this.UNLIMITED_CHAT_IDS_ARR.includes(chatId.toString())) {
        const count = await this.db.hLen(key)

        this.metrics.dbOpsCounter.inc({
          action: 'addUsersToMention#hLen',
        })

        if (count >= this.LIMIT_FOR_GROUP) {
          return false
        }
      }
    }

    const newUsers = [...new Set([...alreadyInDb, ...users])]

    await this.db.hSet(key, mention, newUsers.join(' '))

    this.metrics.dbOpsCounter.inc({
      action: 'addUsersToMention#hSet',
    })

    return true
  }

  /**
   * @returns true - all mention removed, false - only part
   */
  public async deleteUsersFromMention(
    chatId: Chat['id'],
    mention: string,
    usersIdsToDelete: string[]
  ): Promise<boolean> {
    const alreadyInDb = await this.getUsersIdsByMention(chatId, mention)

    const filteredUsers = alreadyInDb.filter(
      (user) => !usersIdsToDelete.includes(user)
    )
    const key = this.getKeyForMention(chatId)

    if (!filteredUsers.length) {
      await this.deleteMention(chatId, mention)
      return true
    }

    await this.db.hSet(key, mention, filteredUsers.join(' '))

    this.metrics.dbOpsCounter.inc({
      action: 'deleteUsersFromMention',
    })

    return false
  }

  public async deleteMention(
    chatId: Chat['id'],
    mention: string
  ): Promise<boolean> {
    const key = this.getKeyForMention(chatId)

    const deleted = await this.db.hDel(key, mention)

    this.metrics.dbOpsCounter.inc({
      action: 'deleteMention',
    })

    if (!deleted) return false

    return true
  }

  public async getGroupMentions(
    chatId: Chat['id']
  ): Promise<Record<string, number>> {
    const key = this.getKeyForMention(chatId)

    const data = await this.db.hGetAll(key)

    this.metrics.dbOpsCounter.inc({
      action: 'getGroupMentions',
    })

    const newData: Record<string, number> = {}

    for (const key in data) {
      newData[key] = data[key].split(' ').filter((value) => value.length).length
    }

    return newData
  }

  public async getUsersIdsByMention(
    chatId: Chat['id'],
    mention: string
  ): Promise<string[]> {
    const str = await this.getUsersUnparsedByMention(chatId, mention)

    const alreadyUsers = str?.split(' ').filter((value) => value.length) ?? []

    return alreadyUsers
  }

  private getUsersUnparsedByMention(
    chatId: Chat['id'],
    mention: string
  ): Promise<string | undefined> {
    const key = this.getKeyForMention(chatId)

    this.metrics.dbOpsCounter.inc({
      action: 'getUsersUnparsedByMention',
    })

    return this.db.hGet(key, mention)
  }

  private getKeyForMention(chatId: Chat['id']): string {
    return `${chatId}.mentions`
  }
}
