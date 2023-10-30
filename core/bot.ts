import { Telegraf } from 'telegraf'
import { UserRepository } from './repository.js'
import { MetricsService } from './metrics.js'
import { message } from 'telegraf/filters'
import { Chat, User } from 'telegraf/types'
import { isChatGroup } from './utils/utils.js'

export class Bot {
  private bot: Telegraf

  private readonly MENTION_COMMANDS = ['@all', '/all']

  private readonly ADMIN_ID: number | undefined

  private isListening = false

  constructor(
    private readonly userRepository: UserRepository,
    private readonly metricsService: MetricsService,
    botName: string | undefined,
    adminId: number | undefined,
    token: string | undefined
  ) {
    if (!token) throw new Error('No tg token set')

    if (botName) this.MENTION_COMMANDS.push(botName)

    this.ADMIN_ID = adminId

    this.bot = new Telegraf(token)

    this.bot.telegram.setMyCommands([
      {
        command: 'all',
        description: 'Mention all users in a group',
      },
      {
        command: 'donate',
        description: 'Get crypto payments accounts for supporting the project',
      },
      {
        command: 'help',
        description: 'Help information',
      },
      {
        command: 'feedback',
        description: 'Send feedback or bug reports (English please)',
      },
      {
        command: 'privacy',
        description: 'How the Bot takes care of your personal data',
      },
    ])

    this.registerDonateCommand()
    this.registerFeedbackCommand()
    this.registerPrivacyCommand()
    this.registerHelpCommand()

    // Should be last for not overriding commands below
    this.registerHandleMessage()

    this.bot.on(message('new_chat_members'), (ctx) => {
      const { chat, message } = ctx
      this.handleAddMembers(chat.id, message.new_chat_members)

      const isNewGroup = this.tryDetectBotAddOrDelete(
        chat.id,
        message.new_chat_members,
        'add'
      )
      if (!isNewGroup) return

      const msg = `
Hello everyone!
This is a bot to improve your experience, just like Slack or other instant messengers. You can mention /all chat participants with one command.
But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write '+' in this chat.
You can help to improve the Bot by sending /feedback or /donate for servers.
`

      ctx.reply(msg, {
        parse_mode: 'HTML',
      })
    })

    this.bot.on(message('left_chat_member'), ({ chat, message }) => {
      this.handleDelete(chat.id, message.left_chat_member)

      this.tryDetectBotAddOrDelete(
        chat.id,
        [message.left_chat_member],
        'delete'
      )
    })
  }

  public async launch(): Promise<void> {
    if (this.isListening) throw new Error('Bot already listening')

    this.bot.botInfo = await this.bot.telegram.getMe()
    console.log('[LAUNCH] Bot info: ', this.bot.botInfo)

    console.log('[LAUNCH] Bot starting')

    this.isListening = true

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

    this.bot.launch()
  }

  private tryDetectBotAddOrDelete(
    chatId: Chat['id'],
    members: User[],
    action: 'add' | 'delete'
  ): boolean {
    const thisBot = members.find((user) => user.id === this.bot.botInfo?.id)
    if (!thisBot) return false

    const date = new Date()

    this.metricsService.groupsCounter.inc({
      action,
      chatId,
      time: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
    })

    console.log(`[TEAM_CHANGE] Bot ${action} in ${chatId}`)

    if (action === 'delete') {
      this.userRepository.removeTeam(chatId)
    }

    return true
  }

  private registerDonateCommand(): void {
    this.bot.command('donate', (ctx) => {
      console.log('[PAYMENT] Send payments info')

      const message = `
      This bot is free to use, but host and database are paid options for project.
So, if you have opportunity to support, it will be very helpful!
Every 1$ can help to improve features, performance and availability for the bot. 
Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code>
Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code>
Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code>
Thank you for using and help!
Note, than you can send /feedback with features or problems.
      `

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'donate',
      })

      this.metricsService.updateLatestPaymentsCall(`${ctx.chat.id}`)

      ctx.reply(message, {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
      })
    })
  }

  private registerFeedbackCommand(): void {
    this.bot.command('feedback', (ctx) => {
      const {
        message: { from, text, message_id: messageId },
        chat: { id: chatId },
      } = ctx

      const feedback = text.split('/feedback')[1] || undefined
      if (!feedback) {
        console.log(
          `[FEEDBACK] Receive empty feedback from user ${from.username} in ${chatId}: ${feedback}`
        )

        this.metricsService.commandsCounter.inc({
          chatId: chatId.toString(),
          command: 'feedback.empty',
        })

        ctx.reply(`Add something in your feedback as feature or bug report`, {
          reply_to_message_id: messageId,
        })
        return
      }

      console.log(
        `[FEEDBACK] Receive feedback from user ${from.username} in ${chatId}: ${feedback}`
      )

      this.metricsService.commandsCounter.inc({
        chatId: chatId.toString(),
        command: 'feedback',
      })

      ctx.reply(
        `Your review has been successfully registered, we will contact you, thank you!`,
        {
          reply_to_message_id: messageId,
        }
      )

      if (!this.ADMIN_ID) return

      this.bot.telegram.sendMessage(
        this.ADMIN_ID,
        `There is a new feedback from @${from.username} in chat group ${chatId}:\n${feedback}`
      )
    })
  }

  private registerPrivacyCommand(): void {
    this.bot.command('privacy', (ctx) => {
      console.log('[PRIVACY] Send privacy policy')

      const message = `
      Are you concerned about your security and personal data? This is right!
What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
All data is transmitted only via encrypted channels and is not used for other purposes.
We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
You can view the project's codebase using Github -  https://github.com/sadfsdfdsa/allbot (also can Star or Fork the Bot project).
Be careful when using unfamiliar bots in your communication, it can be dangerous!
      `

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'privacy',
      })

      ctx.reply(message, {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
      })
    })
  }

  private registerHelpCommand(): void {
    this.bot.command('help', (ctx) => {
      console.log('[HELP] Send help info')

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'help',
      })

      const msg = `
<strong>How can I mention chat participants?</strong>
You can mention all chat participants using "/all" or by mentioning "@all" anywhere in the message.
For example: 'Wanna play some games @all?'

<strong>Why doesn't the bot mention me?</strong>
Bot can only mention you after your first text message after the bot joins the group.

<strong>Why Bot add /donate to message?</strong>
You can use bot for Free, but servers are paid, so you can also support project.
Bot adds /donate only for big groups - more than 10 people.

Commands:
/donate - help the project pay for the servers
/feedback - send feature requests or report problems
/privacy - info about personal data usage and codebase of the Bot
`

      ctx.reply(msg, {
        reply_to_message_id: ctx.message.message_id,
        parse_mode: 'HTML',
      })
    })
  }

  private registerHandleMessage(): void {
    this.bot.on(message('text'), async (ctx) => {
      const {
        message: { from, text, message_id: messageId },
        chat: { id: chatId },
      } = ctx

      if (!isChatGroup(chatId)) {
        console.log(
          `[DIRECT_MSG] Direct message from ${ctx.message.text}`,
          from.username
        )

        ctx.reply(`Add me to your group, here is example @all mention for you:`)

        ctx.reply(`All from ${from.username}: @${from.username}`, {
          reply_to_message_id: messageId,
        })
        return
      }

      await this.userRepository.addUsers(chatId, [from])

      const isCallAll = this.MENTION_COMMANDS.some((command) =>
        text.includes(command)
      )
      if (!isCallAll) return

      const chatUsernames = await this.userRepository.getUsernamesByChatId(
        chatId
      )
      const usernames = Object.values(chatUsernames)

      if (!usernames.length) return

      const includePay = usernames.length >= 10

      console.log(
        `[ALL] Mention with pattern in group for ${usernames.length} people, includePay=${includePay}`,
        chatId
      )

      const str = usernames
        .filter((username) => username !== from.username)
        .map((username) => `@${username}`)
        .join(', ')

      let msg = `All from ${from.username}: ${str}`

      if (includePay) {
        msg =
          msg +
          `
        \nSupport bot: /donate`
      }

      this.metricsService.replyCounter.inc({
        chatId: chatId.toString(),
        withPayments: String(includePay),
      })

      this.metricsService.replyCounter.inc({
        chatId: 'all_chats',
      })

      ctx.reply(msg, {
        reply_to_message_id: messageId,
      })
    })
  }

  private handleAddMembers(chatId: Chat['id'], users: User[]): Promise<void> {
    return this.userRepository.addUsers(chatId, users)
  }

  private handleDelete(chatId: Chat['id'], user: User): Promise<void> {
    return this.userRepository.deleteUser(chatId, user.id)
  }
}
