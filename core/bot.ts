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

    this.bot.action('/donate', (ctx) => {
      if (!ctx.chat?.id) return

      const msg = this.handleDonateCommand(ctx.chat?.id, 'donate.btn')

      ctx
        .reply(msg, {
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })

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
👋 Hello everyone!
🤖 This is a bot to improve your experience, just like Slack or other instant messengers. You can mention /all chat participants with one command.
❔ But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write '+' in this chat. Read more with /help.
✍️ You can help to improve the Bot by sending /feedback or /donate for servers.
⚡ Want to see updates first, send feature request to the developers? Join the chat: https://t.me/allsuperior_chat !
`

      ctx
        .reply(msg, {
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
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
      const msg = this.handleDonateCommand(ctx.chat.id)

      ctx
        .reply(msg, {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerFeedbackCommand(): void {
    this.bot.command('feedback', (ctx) => {
      const {
        message: { from, text, message_id: messageId },
        chat: { id: chatId },
      } = ctx

      const feedback = text.split('/feedback')[1] || undefined
      const isCommandWithBotName = feedback
        ?.trim()
        .endsWith(this.bot.botInfo?.username || '')

      if (!feedback || isCommandWithBotName) {
        console.log(
          `[FEEDBACK] Receive empty feedback from user ${from.username} in ${chatId}: ${feedback}`
        )

        this.metricsService.commandsCounter.inc({
          chatId: chatId.toString(),
          command: 'feedback.empty',
        })

        ctx
          .reply(
            `✍️ Add something in your feedback as feature or bug report (or use our chat https://t.me/allsuperior_chat)`,
            {
              reply_to_message_id: messageId,
              parse_mode: 'HTML',
            }
          )
          .catch(this.handleSendMessageError)

        return
      }

      console.log(
        `[FEEDBACK] Receive feedback from user ${from.username} in ${chatId}: ${feedback}`
      )

      this.metricsService.commandsCounter.inc({
        chatId: chatId.toString(),
        command: 'feedback',
      })

      ctx
        .reply(
          `✅ Your review has been successfully registered, we will contact you, thank you!`,
          {
            reply_to_message_id: messageId,
            parse_mode: 'HTML',
          }
        )
        .catch(this.handleSendMessageError)

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
🔐 Are you concerned about your security and personal data? <strong>This is right!</strong>
✅ What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
✅ All data is transmitted only via encrypted channels and is not used for other purposes.
✅ We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
🧑‍💻 You can view the project's codebase using Github -  https://github.com/sadfsdfdsa/allbot (also can Star or Fork the Bot project).
<strong>❗️ Be careful when using unfamiliar bots in your communication, it can be dangerous!</strong>
`

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'privacy',
      })

      ctx
        .reply(message, {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerHelpCommand(): void {
    this.bot.command('help', (ctx) => {
      console.log('[HELP] Send help info')

      const msg = `
<b>❔ How can I mention chat participants?</b>
You can mention all chat participants using "/all" or by mentioning "@all" anywhere in the message.
For example: <i>Wanna play some games @all?</i>

<b>❔ Why does the bot give out so many messages?</b>
Telegram has a limit on mentions - only 5 users receive notifications per message.

<b>❔ Why last message from mentions is not for 5 members?</b>
Because of performance reasons Bot split all your group for 20 chunks (more - Telegram give a timeout and we can not send anything to you), so notifications receive only 5 users of each message

<b>❔ Why doesn't the bot mention me?</b>
Bot can only mention you after your first text message after the bot joins the group.

<b>❔ Why Bot add /donate to message?</b>
You can use bot for Free, but servers are paid, so you can also support project.
Bot adds /donate only for big groups - more than 10 people.

<strong>👀 Commands:</strong>
/donate - help the project pay for the servers 🫰
/feedback - send feature requests or report problems ✍️
/privacy - info about personal data usage and codebase of the Bot 🔐

<strong>💬 Our chat:</strong>
⚡ Group with updates, for sending bug reports or feature requests - https://t.me/allsuperior_chat
`
      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'help',
      })

      ctx
        .reply(msg, {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerHandleMessage(): void {
    this.bot.on(message('text'), async (ctx) => {
      const {
        message: { from, text, message_id: messageId },
        chat: { id: chatId },
      } = ctx

      const START_TIME = Date.now()

      if (!isChatGroup(chatId)) {
        console.log(
          `[DIRECT_MSG] Direct message from ${ctx.message.text}`,
          from.username
        )

        ctx
          .reply(
            `👥 Add me to your group, here is example @all mention for you:`,
            {
              parse_mode: 'HTML',
            }
          )
          .catch(this.handleSendMessageError)

        const startText = `🔊 All from <a href="tg://user?id=${from.id}">${from.username}</a>:`

        ctx
          .reply(`${startText} @${from.username}`, {
            reply_to_message_id: messageId,
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
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
      const usernames = Object.values(chatUsernames).filter(
        (username) => username !== from.username
      )
      // const usernames = new Array<string>(255)
      //   .fill('item')
      //   .map((_, index) => `test${index}`)

      if (!usernames.length) return

      console.log(`[ALL] Start mention`, usernames.length, chatId)

      const includePay = usernames.length >= 10 // Large group members count

      const promises = new Array<Promise<unknown>>()
      const chunkSize = 5 // Telegram limitations for mentions per message
      const chunksCount = 19 // Telegram limitations for messages
      const brokenUsers = new Array<string>()

      for (let i = 0; i < usernames.length; i += chunkSize) {
        const chunk = usernames.slice(i, i + chunkSize)

        const isLastMessage = i >= usernames.length - chunkSize

        const str = '🔊 ' + chunk.map((username) => `@${username}`).join(', ')

        if (!isLastMessage) {
          if (promises.length >= chunksCount) {
            brokenUsers.push(...chunk)
            continue
          }

          const execute = async (): Promise<unknown> => {
            try {
              const sendingResult = await ctx.sendMessage(str, {
                parse_mode: 'HTML',
              })
              return sendingResult
            } catch (error) {
              const response:
                | undefined
                | { error_code: number; parameters: { retry_after: number } } =
                (error as any).response

              if (response?.error_code === 429) {
                console.log(
                  '[ALL] Error with timeout=',
                  response.parameters.retry_after
                )
                return new Promise((resolve) => {
                  setTimeout(async () => {
                    try {
                      await ctx.sendMessage(str, {
                        parse_mode: 'HTML',
                      })
                      resolve(null)
                    } catch (error) {
                      console.log('[ALL] Add users to broken')

                      brokenUsers.push(...chunk)

                      resolve(null)
                    }
                  }, (response.parameters.retry_after + 0.2) * 1000)
                })
              }

              console.log(error)
              return Promise.resolve()
            }
          }
          promises.push(execute())
        } else {
          await Promise.all(
            promises.map((promise) =>
              promise.catch(this.handleSendMessageError)
            )
          ).catch(this.handleSendMessageError)

          const sendLastMsg = async () => {
            return new Promise(async (resolve) => {
              console.log('[ALL] Broken users:', brokenUsers.length)
              let lastStr = str

              if (brokenUsers.length) {
                lastStr =
                  lastStr +
                  ', ' +
                  brokenUsers.map((username) => `@${username}`).join(', ')

                lastStr =
                  lastStr +
                  `\nPlease read /help for your group with size more than 250`
              }

              const inlineKeyboard = [
                includePay
                  ? [
                      {
                        callback_data: '/donate',
                        text: '🫰 Support bot!',
                      },
                    ]
                  : [],
              ]

              try {
                await ctx.reply(lastStr, {
                  reply_to_message_id: messageId,
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: inlineKeyboard,
                  },
                })
                resolve(null)
              } catch (error) {
                const response:
                  | undefined
                  | {
                      error_code: number
                      parameters: { retry_after: number }
                    } = (error as any).response

                if (response?.error_code !== 429) {
                  console.error(error)
                  return resolve(null)
                }

                console.log(
                  '[ALL] Retry last msg',
                  response.parameters.retry_after
                )

                setTimeout(() => {
                  sendLastMsg()
                }, (response.parameters.retry_after + 0.2) * 1000)
              }
            })
          }

          await sendLastMsg()
        }
      }

      const END_TIME = Date.now()

      const EXECUTE_TIME = END_TIME - START_TIME

      console.log(
        `[ALL] Mention with pattern in group for ${usernames.length} people, TIME=${EXECUTE_TIME}, includePay=${includePay}`,
        chatId
      )

      this.metricsService.replyCounter.inc({
        chatId: chatId.toString(),
        withPayments: includePay ? 'true' : 'false',
      })

      this.metricsService.replyUsersCountHistogram.observe(usernames.length)

      this.metricsService.replyUsersTimeHistogram.observe(EXECUTE_TIME)
    })
  }

  private handleDonateCommand(chatId: Chat['id'], command = 'donate'): string {
    console.log('[PAYMENT] Send payments info')

    const message = `
🙌 This bot is free to use, but hosting and database are paid options for project. So, if you have opportunity to support, it will be very helpful! 🙌

1️⃣<strong>Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code></strong>👈

2️⃣<strong>Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code></strong>👈

3️⃣<strong>Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code></strong>👈

Thank you for using and supporting us! ❤️
✍️ Remember, than you can send /feedback with features or problems.
`

    this.metricsService.commandsCounter.inc({
      chatId: chatId.toString(),
      command,
    })

    this.metricsService.updateLatestPaymentsCall(`${chatId}`)

    return message
  }

  private handleAddMembers(chatId: Chat['id'], users: User[]): Promise<void> {
    return this.userRepository.addUsers(chatId, users)
  }

  private handleDelete(chatId: Chat['id'], user: User): Promise<void> {
    return this.userRepository.deleteUser(chatId, user.id)
  }

  private handleSendMessageError(error: unknown): void {
    console.error(error)
  }
}
