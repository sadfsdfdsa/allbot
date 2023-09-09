import { Context, Telegraf } from 'telegraf'
import { UserRepository } from './repository.js'
import { MetricsService } from './metrics.js'
import { message } from 'telegraf/filters'
import { Chat, Message, User } from 'telegraf/types'
import { isChatGroup } from './utils/utils.js'

type HandleMessagePayload = {
  chatId: Chat['id']
  text: string
  from: NonNullable<Message['from']>
  messageId: Message['message_id']
}

export class Bot {
  private bot: Telegraf

  private readonly COMMANDS = ['@all', '/all']

  private isListening = false

  constructor(
    private readonly userRepository: UserRepository,
    private readonly metricsService: MetricsService,
    botName: string | undefined,
    token: string | undefined
  ) {
    if (!token) throw new Error('No tg token set')

    if (botName) this.COMMANDS.push(botName)

    this.bot = new Telegraf(token)

    this.bot.on(message('text'), async (ctx) => {
      const {
        message: { from, text, message_id },
        chat: { id },
      } = ctx

      await this.handleMessage(
        {
          from,
          text,
          messageId: message_id,
          chatId: id,
        },
        (...args: Parameters<Context['sendMessage']>) => ctx.reply(...args)
      )
    })

    this.bot.on(message('new_chat_members'), ({ message, chat }) =>
      this.handleAddMembers(chat.id, message.new_chat_members)
    )

    this.bot.on(message('left_chat_member'), ({ chat, message }) =>
      this.handleDelete(chat.id, message.left_chat_member)
    )
  }

  public launch(): void {
    if (this.isListening) throw new Error('Bot already listening')

    console.log('Bot starting')

    this.isListening = true

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

    this.bot.launch()
  }

  private async handleMessage(
    { from, text, messageId, chatId }: HandleMessagePayload,
    reply: Context['reply']
  ): Promise<void> {
    if (!isChatGroup(chatId)) {
      reply(`Add me to your group, here is example @all mention for you:`)

      reply(`All from ${from.username}: @${from.username}`, {
        reply_to_message_id: messageId,
      })
      return
    }

    await this.userRepository.addUsers(chatId, [from])

    const isCallAll = this.COMMANDS.some((command) => text.includes(command))
    console.log(`Message, should reply=${isCallAll}`, text)
    if (!isCallAll) return

    const chatUsernames = await this.userRepository.getUsernamesByChatId(chatId)
    if (!Object.values(chatUsernames).length) return

    const str = Object.values(chatUsernames).map((username) => `@${username} `)

    this.metricsService.addReply()

    reply(`All from ${from.username}: ${str}`, {
      reply_to_message_id: messageId,
    })
  }

  private handleAddMembers(chatId: Chat['id'], users: User[]): Promise<void> {
    console.log('Try add new members', users)
    return this.userRepository.addUsers(chatId, users)
  }

  private handleDelete(chatId: Chat['id'], user: User): Promise<void> {
    console.log('Delete user', user.username)
    return this.userRepository.deleteUser(chatId, user.id)
  }
}
