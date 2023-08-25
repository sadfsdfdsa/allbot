import { RedisClientType } from 'redis'
import { Chat, User } from 'telegraf/types'

export class UserRepository {
  constructor(private readonly db: RedisClientType<any, any, any>) {
    console.log('Init User repository')
  }

  public async addUsers(chatId: Chat['id'], users: User[]): Promise<void> {
    const usernamesById: Record<string, string> = {}
    users.forEach((user) => {
      if (!user.username || user.is_bot) return

      usernamesById[this.convertId(user.id)] = user.username
    })

    const timeMark = `Add users ${JSON.stringify(usernamesById)}`
    console.time(timeMark)

    await this.db.hSet(this.convertId(chatId), usernamesById)

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
