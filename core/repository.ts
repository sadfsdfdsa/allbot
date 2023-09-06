import type { RedisClientType } from 'redis'
import type { Chat, User } from 'telegraf/types'

const MAX_CACHE_SIZE = 1000

export class UserRepository {

  private readonly cachedUsernames = new Array<NonNullable<User['username']>>()

  constructor(private readonly db: RedisClientType<any, any, any>) {
    console.log('Init User repository')
  }

  // TODO improve tests
  public async addUsers(chatId: Chat['id'], users: User[]): Promise<void> {
    const usernamesById: Record<string, string> = {}
    users.forEach((user) => {
      if (!user.username || user.is_bot || this.cachedUsernames.includes(user.username)) return

      this.cachedUsernames.push(user.username)
      usernamesById[this.convertId(user.id)] = user.username
    })

    if (this.cachedUsernames.length > MAX_CACHE_SIZE) {
      const needToRemove = MAX_CACHE_SIZE - this.cachedUsernames.length
      const removed = this.cachedUsernames.splice(0, needToRemove)
      console.log('Remove users from cache', needToRemove, removed)
    }

    if (!Object.keys(usernamesById).length) return

    const timeMark = `Add users ${JSON.stringify(usernamesById)}`
    console.time(timeMark)

    try {
      await this.db.hSet(this.convertId(chatId), usernamesById)
    } catch (err) {
      // In case of [ErrorReply: ERR wrong number of arguments for 'hset' command]
      console.error('Redis error', err, JSON.stringify(usernamesById))

      const chatIdStr = this.convertId(chatId)

      try {
        const promises = Object.entries(usernamesById).map(([id, username]) => this.db.hSet(chatIdStr, id, username))

        await Promise.all(promises)
      } catch (err2) {
        console.error('Redis again error', err, JSON.stringify(usernamesById))
      }
    }

    console.timeEnd(timeMark)
  }

  public async getUsernamesByChatId(chatId: Chat['id']): Promise<string[]> {
    const timeMark = `Get users ${chatId}`
    console.time(timeMark)

    const chatUsernames = await this.db.hGetAll(this.convertId(chatId))

    console.timeEnd(timeMark)

    return Object.values(chatUsernames)
  }

  public async deleteUser(
    chatId: Chat['id'],
    userId: User['id']
  ): Promise<void> {
    const timeMark = `Delete user ${chatId} ${userId}`
    console.time(timeMark)

    await this.db.hDel(this.convertId(chatId), this.convertId(userId))

    console.timeEnd(timeMark)
  }

  private convertId(id: number): string {
    return `${id}`
  }
}
