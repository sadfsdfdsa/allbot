import type { RedisClientType } from 'redis'
import type { Chat, User } from 'telegraf/types'
import { MetricsService } from './metrics.js'
import { CacheService } from './cache.js'

export class UserRepository {
  constructor(
    private readonly db: RedisClientType<any, any, any>,
    private readonly metrics: MetricsService,
    private readonly cache: CacheService
  ) {
    console.log('[LAUNCH] Init User repository')
  }

  public async addUsers(chatId: Chat['id'], users: User[]): Promise<void> {
    const usernamesById: Record<string, string> = {}
    users.forEach((user) => {
      if (
        !user.username ||
        user.is_bot ||
        this.cache.isInCache(chatId, user.username)
      )
        return

      this.cache.addToCache(chatId, [user.username])
      usernamesById[this.convertId(user.id)] = user.username
    })

    this.cache.tryClearCache()

    if (!Object.keys(usernamesById).length) return

    const timeMark = `Add users ${JSON.stringify(usernamesById)}`
    console.time(timeMark)

    try {
      await this.db.hSet(this.convertId(chatId), usernamesById)
      this.metrics.dbOpsCounter.inc({
        action: 'addUsers',
      })
    } catch (err) {
      // In case of [ErrorReply: ERR wrong number of arguments for 'hset' command]
      console.error('Redis error', err, JSON.stringify(usernamesById))

      const chatIdStr = this.convertId(chatId)

      try {
        const promises = Object.entries(usernamesById).map(([id, username]) => {
          this.metrics.dbOpsCounter.inc({
            action: 'addUsersSingle',
          })

          return this.db.hSet(chatIdStr, id, username)
        })

        await Promise.all(promises)
      } catch (err2) {
        console.error('Redis again error', err, JSON.stringify(usernamesById))
      }
    }

    console.timeEnd(timeMark)
  }

  public async getUsersUsernamesByIdInChat(
    chatId: Chat['id']
  ): Promise<Record<string, string>> {
    const timeMark = `Get users ${chatId}`
    console.time(timeMark)

    const dbKey = this.convertId(chatId)
    const chatUsernamesById = await this.db.hGetAll(dbKey)
    this.metrics.dbOpsCounter.inc({
      action: 'getUsersUsernamesByIdInChat',
    })

    console.timeEnd(timeMark)

    return chatUsernamesById
  }

  public async getUsersIdsByUsernamesInChat(
    chatId: Chat['id']
  ): Promise<Record<string, string>> {
    const timeMark = `Get users ${chatId}`
    console.time(timeMark)

    const dbKey = this.convertId(chatId)
    const chatUsernamesById = await this.db.hGetAll(dbKey)
    this.metrics.dbOpsCounter.inc({
      action: 'getUsersIdsByUsernamesInChat',
    })

    console.timeEnd(timeMark)

    const reversedUsers = Object.entries(chatUsernamesById).reduce<
      Record<string, string>
    >((ret, entry) => {
      const [key, value] = entry
      ret[value] = key
      return ret
    }, {})

    return reversedUsers
  }

  public async getUsernamesByChatId(chatId: Chat['id']): Promise<string[]> {
    const timeMark = `Get users ${chatId}`
    console.time(timeMark)

    const dbKey = this.convertId(chatId)
    const chatUsernamesById = await this.db.hGetAll(dbKey)
    this.metrics.dbOpsCounter.inc({
      action: 'getUsernamesByChatId',
    })

    console.timeEnd(timeMark)

    this.metrics.updateLatestUsage(dbKey)

    const usernames = Object.values(chatUsernamesById)

    this.cache.addToCache(chatId, usernames)

    return usernames
  }

  public async deleteUser(
    chatId: Chat['id'],
    userId: User['id']
  ): Promise<void> {
    const timeMark = `Delete user ${chatId} ${userId}`
    console.time(timeMark)

    await this.db.hDel(this.convertId(chatId), this.convertId(userId))
    this.metrics.dbOpsCounter.inc({
      action: 'deleteUser',
    })

    console.timeEnd(timeMark)
  }

  public removeTeam(chatId: Chat['id']): void {
    this.cache.removeFromCache(chatId)
  }

  private convertId(id: number): string {
    return `${id}`
  }
}
