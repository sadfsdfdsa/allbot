import { RedisClientType } from 'redis'
import { MetricsService } from './metrics.js'
import { Chat } from 'telegraf/types'
import { PaymentsRepository } from './paymentsRepository.js'

export class MentionRepository {
  private readonly mentionsByChatId: Record<Chat['id'], Set<string>> = {}

  constructor(
    private readonly db: RedisClientType<any, any, any>,
    private readonly metrics: MetricsService,
    private readonly paymentsRepository: PaymentsRepository
  ) {
    console.log('[LAUNCH] Init Mention repository')
  }

  public async loadMentionsForInstantMentions(): Promise<void> {
    const unlimitedChatIds = this.paymentsRepository.getGroupsWithUnlimited()

    const promises = unlimitedChatIds.map(async (chatId) => {
      const mentions = await this.getGroupMentions(chatId)
      this.mentionsByChatId[chatId] = new Set(Object.keys(mentions))
    })

    await Promise.all(promises)

    console.log(
      '[LAUNCH] Mentions loaded for chats',
      Object.keys(this.mentionsByChatId)
    )
  }

  public getMentionForMsg(chatId: Chat['id'], msg: string): string | undefined {
    const mentions = [...this.mentionsByChatId[chatId]]

    return mentions.find((item) => msg.includes(`@${item}`))
  }

  public async checkIfMentionExists(
    chatId: Chat['id'],
    mention: string
  ): Promise<boolean> {
    const key = this.getKeyForMention(chatId)

    const isExists = await this.db.hExists(key, mention)

    this.metrics.dbOpsCounter.inc({
      action: 'checkIfMentionExists#hExists',
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
      const LIMIT = this.paymentsRepository.getLimitByChatId(chatId)
      console.log('[mentionRepository.limit] Check limit', LIMIT, chatId)

      if (LIMIT !== 'unlimited') {
        const count = await this.db.hLen(key)

        this.metrics.dbOpsCounter.inc({
          action: 'addUsersToMention#hLen',
        })

        if (count >= LIMIT) {
          return false
        }
      }
    }

    const newUsers = [...new Set([...alreadyInDb, ...users])]

    await this.db.hSet(key, mention, newUsers.join(' '))

    this.metrics.dbOpsCounter.inc({
      action: 'addUsersToMention#hSet',
    })

    this.mentionsByChatId[chatId].add(mention)

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

    this.mentionsByChatId[chatId].delete(mention)

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
