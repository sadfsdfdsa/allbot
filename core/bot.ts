import { Context, NarrowedContext, Telegraf } from 'telegraf'
import { UserRepository } from './userRepository.js'
import { MetricsService } from './metrics.js'
import { message } from 'telegraf/filters'
import {
  CallbackQuery,
  Chat,
  InlineKeyboardButton,
  InlineKeyboardMarkup,
  Update,
  User,
} from 'telegraf/types'
import {
  matchMentionsToUsers,
  getMentionsFromEntities,
  isChatGroup,
  createSettingsKeyboard,
  Settings,
} from './utils/utils.js'
import { MentionRepository } from './mentionRepository.js'
import {
  ADDED_TO_CHAT_WELCOME_TEXT,
  ALREADY_UNLIMITED,
  CLEAN_UP_EMPTY_MENTION_TEXT,
  EMPTY_DELETE_FROM_MENTION_TEXT,
  EMPTY_DELETE_MENTION_TEXT,
  GET_MENTIONS_TEXT,
  HELP_COMMAND_TEXT,
  INTRODUCE_CUSTOM_MENTIONS_TEXT,
  NEED_TO_BUY_UNLIMITED,
  NEW_MENTION_EXAMPLE,
  NOT_EXISTED_MENTION_TEXT,
  ONLY_ADMIN_ACTION_TEXT,
  SETTINGS_TEXT,
} from './constants/texts.js'
import { LIMITS_MENTION_FOR_ADDING_PAY } from './constants/limits.js'
import { PaymentsRepository } from './paymentsRepository.js'
import { SettingsAction, SettingsRepository } from './settingsRepository.js'
import { BASE_INVOICE } from './constants/const.js'

type UniversalMessageOrActionUpdateCtx = NarrowedContext<
  Context,
  Update.MessageUpdate | Update.CallbackQueryUpdate<CallbackQuery>
>

export class Bot {
  private bot: Telegraf

  private readonly MENTION_COMMANDS = ['@all', '/all']

  private readonly INCLUDE_PAY_LIMIT = LIMITS_MENTION_FOR_ADDING_PAY

  private readonly EMOJI_SET = ['👋', '🫰']

  private readonly EXAMPLES_BUTTON = {
    callback_data: '/examples',
    text: '🤔 Show examples',
  }

  private readonly BUY_MENTIONS_BUTTON = {
    callback_data: '/buy',
    text: ' Buy ⭐️Unlimited using Telegram Stars',
  }

  private isListening = false

  private readonly activeQuery = new Set<Chat['id']>()

  constructor(
    private readonly userRepository: UserRepository,
    private readonly metricsService: MetricsService,
    private readonly mentionRepository: MentionRepository,
    private readonly paymentsRepository: PaymentsRepository,
    private readonly settingsRepository: SettingsRepository,
    botName: string | undefined,
    token: string | undefined
  ) {
    if (!token) throw new Error('No tg token set')

    if (botName) this.MENTION_COMMANDS.push(botName)

    this.bot = new Telegraf(token, {
      handlerTimeout: 400_000,
    })

    this.bot.telegram.setMyCommands([
      {
        command: 'all',
        description: 'Mention all users in a group',
      },
      {
        command: 'mention',
        description:
          '/mention some_group with additional text or see info about custom mentions in the group',
      },
      {
        command: 'add_to',
        description: '/add_to some_group @user1 @user2',
      },
      {
        command: 'delete_from',
        description: '/delete_from some_group @user1 @user2',
      },
      {
        command: 'delete_mention',
        description: '/delete_mention some_group',
      },
      {
        command: 'settings',
        description: 'Bot settings',
      },
      {
        command: 'help',
        description: 'Help information',
      },
      {
        command: 'buy',
        description: 'Get Unlimited custom mentions. Forever.',
      },
    ])

    this.registerBuyCommandAndActions()
    this.registerHelpCommand()
    this.registerSettingsCommand()
    this.registerMentionCommand()
    this.registerGetAllMentionCommand()
    this.registerAddToMentionCommand()
    this.registerDeleteFromMentionCommand()
    this.registerDeleteMentionCommand()

    // Should be last for not overriding commands below
    this.registerHandleMessage()

    this.registerSettingsChangeAction()

    this.bot.action('/examples', async (ctx) => {
      if (!ctx.chat?.id) return

      await this.sendExamples(ctx)
    })

    this.bot.action(/^[/mention]+(-.+)?$/, (ctx) => {
      if (!ctx.chat?.id) return

      const data = (ctx.update.callback_query as any).data as string
      const field = data.replace('/mention-', '')

      console.log('[mention-action]', field, ctx.chat.id, ctx.from)

      this.sendCustomMention(ctx, field, 'action').catch(
        this.handleSendMessageError
      )
    })

    this.bot.action('/intro_custom_mentions', async (ctx) => {
      if (!ctx.chat?.id) return

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.chat.id.toString(),
        action: 'mention.showIntro',
      })

      const isUnlimitedGroup = this.paymentsRepository.getHasGroupUnlimited(
        ctx.chat.id
      )

      const text = `
${INTRODUCE_CUSTOM_MENTIONS_TEXT}${
        isUnlimitedGroup ? ALREADY_UNLIMITED : NEED_TO_BUY_UNLIMITED
      }
`

      await ctx
        .reply(text, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [
              isUnlimitedGroup ? [] : [this.BUY_MENTIONS_BUTTON],
            ],
          },
        })
        .catch(this.handleSendMessageError)
    })

    this.bot.on(message('new_chat_members'), async (ctx) => {
      const { chat, message } = ctx
      this.handleAddMembers(chat.id, message.new_chat_members)

      const isBotAddingToGroup = this.tryDetectBotAddOrDelete(
        chat.id,
        message.new_chat_members,
        'add'
      )

      if (!isBotAddingToGroup) return

      await ctx
        .reply(ADDED_TO_CHAT_WELCOME_TEXT, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[this.EXAMPLES_BUTTON]],
          },
        })
        .catch(this.handleSendMessageError)

      await this.sendExamples(ctx)
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

    // console.log('To enable unlimited:', await this.bot.telegram.getChat('@chat'))

    this.bot.botInfo = await this.bot.telegram.getMe()
    console.log('[LAUNCH] Bot info: ', this.bot.botInfo)

    console.log('[LAUNCH] Bot starting')

    this.isListening = true

    process.once('SIGINT', () => this.bot.stop('SIGINT'))
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'))

    this.bot.catch((err) => {
      this.handleSendMessageError(err, '[MAIN_CATCH]')
    })

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

  private registerSettingsChangeAction(): void {
    this.bot.action(/^[/settings]+(_.+)?$/, async (ctx) => {
      if (!ctx.chat?.id) return

      const isAllowed = await this.getIsAllowed(
        ctx.chat.id,
        ctx.update.callback_query.from.id
      )
      if (!isAllowed) {
        this.metricsService.restrictedAction.inc({
          chatId: ctx.chat.id,
          action: 'settingsChanged',
        })

        console.log(
          `[settings] Not edited because not ${ctx.update.callback_query.from.username} admin in ${ctx.chat.id}`
        )

        await ctx.reply(`<strong>🛑 Only admins can edit settings</strong>`, {
          parse_mode: 'HTML',
        })
        return
      }

      const data = (ctx.update.callback_query as any).data as string

      const [, jsonData] = data.split('_')

      const { s, ...rest } = JSON.parse(jsonData) as Settings

      const newValue = !rest[s]

      const changedSettings = {
        ...rest,
        [s]: newValue,
      }

      await this.settingsRepository.updateSettings(ctx.chat.id, s, newValue)

      const keyboard = createSettingsKeyboard(changedSettings)

      console.log(`[settings] Edited ${s} with ${newValue} in ${ctx.chat.id}`)

      await ctx.editMessageReplyMarkup({
        inline_keyboard: keyboard,
      })
    })
  }

  private registerSettingsCommand(): void {
    this.bot.command('settings', async (ctx) => {
      const settings = await this.settingsRepository.getSettingsCompressed(
        ctx.chat.id
      )
      const keyboard = createSettingsKeyboard(settings)

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'settings',
      })

      console.log('[settings] Send settings info')

      await ctx
        .reply(SETTINGS_TEXT, {
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: keyboard,
          },
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerMentionCommand(): void {
    this.bot.command('mention', async (ctx) => {
      if (!isChatGroup(ctx.message.chat.id)) {
        await ctx
          .reply(`👥 Only available in groups`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
        return
      }

      const field = ctx.message.text.split(' ')[1]
      if (!field) {
        console.log('[mention] Empty mention', ctx.message.text)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mention.emptyMention',
        })

        const keyboard = await this.getKeyboardWithCustomMentions(
          ctx.message.chat.id
        )

        if (!keyboard) {
          await ctx
            .reply(NOT_EXISTED_MENTION_TEXT, { parse_mode: 'HTML' })
            .catch(this.handleSendMessageError)

          return
        }

        await ctx
          .reply(GET_MENTIONS_TEXT, {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          })
          .catch(this.handleSendMessageError)

        return
      }

      const isExists = await this.mentionRepository.checkIfMentionExists(
        ctx.message.chat.id,
        field
      )
      if (!isExists) {
        console.log('[mention] Not exists', ctx.message.chat.id, field)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mention.notExisted',
        })

        const keyboard = await this.getKeyboardWithCustomMentions(
          ctx.message.chat.id
        )
        if (!keyboard) {
          await ctx
            .reply(NOT_EXISTED_MENTION_TEXT, { parse_mode: 'HTML' })
            .catch(this.handleSendMessageError)

          return
        }

        await ctx
          .reply('⚠️ Not existed mention. All mentions in the group:', {
            parse_mode: 'HTML',
            reply_markup: keyboard,
          })
          .catch(this.handleSendMessageError)

        return
      }

      this.sendCustomMention(ctx, field, 'command')
    })
  }

  private registerGetAllMentionCommand(): void {
    this.bot.command('mentions', async (ctx) => {
      if (!isChatGroup(ctx.message.chat.id)) {
        await ctx
          .reply(`👥 Only available in groups`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
        return
      }

      const keyboard = await this.getKeyboardWithCustomMentions(
        ctx.message.chat.id
      )
      if (!keyboard) {
        console.log('[mentions] No mentions', ctx.message.chat.id)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentions.emptyMentions',
        })

        await ctx
          .reply(
            `0️⃣ There is no custom mentions. Try it out:\n${NEW_MENTION_EXAMPLE}`,
            {
              parse_mode: 'HTML',
            }
          )
          .catch(this.handleSendMessageError)
        return
      }

      console.log('[mentions] Print mentions', ctx.message.chat.id)

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.message.chat.id.toString(),
        action: 'mentions.getAll',
      })

      await ctx
        .reply(GET_MENTIONS_TEXT, {
          parse_mode: 'HTML',
          reply_markup: keyboard,
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerAddToMentionCommand(): void {
    this.bot.command('add_to', async (ctx) => {
      if (!isChatGroup(ctx.message.chat.id)) {
        await ctx
          .reply(`👥 Only available in groups`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
        return
      }

      let field = ctx.message.text.split(' ')[1]
      if (field) {
        field = field.startsWith('@') ? field.slice(1) : field
      }

      if (!field) {
        console.log('[add_to] Empty mention', ctx.message.text)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionAddTo.emptyMention',
        })

        await ctx
          .reply(NOT_EXISTED_MENTION_TEXT, { parse_mode: 'HTML' })
          .catch(this.handleSendMessageError)

        return
      }

      const isAllowed = await this.onlyAdminActionGuard(
        ctx,
        'crudCustomMention'
      )
      if (!isAllowed) return

      const mentions = getMentionsFromEntities(
        ctx.message.text,
        ctx.message.entities
      )

      const reversedUsers =
        await this.userRepository.getUsersIdsByUsernamesInChat(
          ctx.message.chat.id
        )

      const { successIds, successMentions, missedMentions } =
        matchMentionsToUsers(mentions, reversedUsers)

      const unsuccessStr = missedMentions.length
        ? `⚠️ Some users cannot be added: ${missedMentions.join(
            ', '
          )}.\nProbably they are not in the group or did not write anything (see /help for more info or contact us)`
        : ''

      if (!successIds.length) {
        console.log(
          '[add_to] No success',
          ctx.message.chat.id,
          field,
          successIds,
          successMentions,
          missedMentions
        )

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionAddTo.emptyCreating',
        })

        const notCreated = `🚫 <strong>Mention did not created</strong>. Add someone from the group as initial members.`
        await ctx
          .reply(`${notCreated}\n${unsuccessStr}`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)

        return
      }

      const isSuccess = await this.mentionRepository.addUsersToMention(
        ctx.message.chat.id,
        field,
        successIds
      )

      if (!isSuccess) {
        console.log('[add_to] Paid limit', ctx.message.chat.id, field)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionAddTo.limitsReached',
        })

        const inlineKeyboard = [[this.BUY_MENTIONS_BUTTON]]
        await ctx
          .reply(
            `🚫 You have been reached a Free limit.
Need more? Try removing useless mentions using the /mention and /delete_mention commands.
<strong>Or you can buy in our store, this is an unlimited quantity, no subscriptions.</strong>
`,
            {
              parse_mode: 'HTML',
              reply_markup: {
                inline_keyboard: inlineKeyboard,
              },
            }
          )
          .catch(this.handleSendMessageError)

        return
      }

      const successStr = `➕ In mention <strong>${field}</strong> added: ${successMentions.join(
        ', '
      )}
✅ Now you can call them <code>@${field}</code>`

      console.log('[add_to] Created', ctx.message.chat.id, field)

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.message.chat.id.toString(),
        action: 'mentionAddTo.added',
      })

      await ctx
        .reply(`${successStr}\n\n${unsuccessStr}`, {
          disable_notification: true,
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerDeleteFromMentionCommand(): void {
    this.bot.command('delete_from', async (ctx) => {
      if (!isChatGroup(ctx.message.chat.id)) {
        await ctx
          .reply(`👥 Only available in groups`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
        return
      }

      let field = ctx.message.text.split(' ')[1]
      if (field) {
        field = field.startsWith('@') ? field.slice(1) : field
      }
      if (!field) {
        console.log('[delete_from] Empty mention', ctx.message.text)

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionDeleteFrom.emptyMention',
        })

        await ctx
          .reply(EMPTY_DELETE_FROM_MENTION_TEXT, { parse_mode: 'HTML' })
          .catch(this.handleSendMessageError)

        return
      }

      const isAllowed = await this.onlyAdminActionGuard(
        ctx,
        'crudCustomMention'
      )
      if (!isAllowed) return

      const mentions = getMentionsFromEntities(
        ctx.message.text,
        ctx.message.entities
      )

      const reversedUsers =
        await this.userRepository.getUsersIdsByUsernamesInChat(
          ctx.message.chat.id
        )

      const result = matchMentionsToUsers(mentions, reversedUsers)

      const wasRemovedMention =
        await this.mentionRepository.deleteUsersFromMention(
          ctx.message.chat.id,
          field,
          result.successIds
        )

      if (result.successMentions.length) {
        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionDeleteFrom.edited',
        })

        const deletedStr = `✅ Mention <strong>${field}</strong> successfully edited`

        await ctx
          .reply(deletedStr, {
            disable_notification: true,
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)

        console.log(
          '[delete_from] Delete from mention',
          field,
          result.successIds.length,
          ctx.message.chat.id
        )

        if (wasRemovedMention) {
          this.metricsService.customMentionsActionCounter.inc({
            chatId: ctx.message.chat.id.toString(),
            action: 'mentionDeleteFrom.emptyMentionCleaned',
          })
          console.log('[delete_from] Clean mention', field, ctx.message.chat.id)

          await ctx
            .reply(CLEAN_UP_EMPTY_MENTION_TEXT, {
              parse_mode: 'HTML',
            })
            .catch(this.handleSendMessageError)
        }

        return
      }

      console.log('[delete_from] Problem', field, ctx.message.chat.id, result)

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.message.chat.id.toString(),
        action: 'mentionDeleteFrom.problems',
      })

      await ctx
        .reply(
          `⚠️ Looks like something wrong with mention, or it is already deleted.
Contact us via support chat from /help`,
          {
            disable_notification: true,
            parse_mode: 'HTML',
          }
        )
        .catch(this.handleSendMessageError)
    })
  }

  private registerDeleteMentionCommand(): void {
    this.bot.command('delete_mention', async (ctx) => {
      if (!isChatGroup(ctx.message.chat.id)) {
        await ctx
          .reply(`👥 Only available in groups`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)
        return
      }

      let field = ctx.message.text.split(' ')[1]
      if (field) {
        field = field.startsWith('@') ? field.slice(1) : field
      }
      if (!field) {
        console.log('[delete_mention] Empty mention', ctx.message.text)
        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionDelete.emptyMention',
        })

        await ctx
          .reply(EMPTY_DELETE_MENTION_TEXT, { parse_mode: 'HTML' })
          .catch(this.handleSendMessageError)

        return
      }

      const isAllowed = await this.onlyAdminActionGuard(
        ctx,
        'crudCustomMention'
      )
      if (!isAllowed) return

      const wasDeleted = await this.mentionRepository.deleteMention(
        ctx.message.chat.id,
        field
      )

      if (wasDeleted) {
        console.log(
          '[delete_mention] Deleted mention',
          ctx.message.chat.id,
          field
        )

        this.metricsService.customMentionsActionCounter.inc({
          chatId: ctx.message.chat.id.toString(),
          action: 'mentionDelete.deleted',
        })

        await ctx
          .reply(`🗑 Mention <strong>${field}</strong> successfully deleted`, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)

        return
      }

      console.log('[delete_mention] Not deleted', ctx.message.chat.id, field)

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.message.chat.id.toString(),
        action: 'mentionDelete.noMention',
      })

      await ctx
        .reply(
          `🤷‍♂️ There is no mentions with that pattern. Try again or see all your mentions via /mention`,
          {
            parse_mode: 'HTML',
          }
        )
        .catch(this.handleSendMessageError)
    })
  }

  private registerBuyCommandAndActions(): void {
    const sendInvoice = async (
      ctx: UniversalMessageOrActionUpdateCtx
    ): Promise<void> => {
      if (!ctx.chat?.id) return

      const hasUnlimited = this.paymentsRepository.getHasGroupUnlimited(
        ctx.chat.id
      )
      if (hasUnlimited) {
        console.log('[buy] Already unlimited', ctx.chat.id)

        await ctx
          .sendMessage(ALREADY_UNLIMITED, {
            parse_mode: 'HTML',
          })
          .catch(this.handleSendMessageError)

        return
      }

      console.log('[buy] Start buying', ctx.chat.id)
      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'buy',
      })

      await ctx
        .sendInvoice({
          ...BASE_INVOICE,
          payload: this.paymentsRepository.getPayloadForInvoice(ctx.chat.id),
        })
        .catch(this.handleSendMessageError)
    }

    this.bot.command('buy', async (ctx) => {
      await sendInvoice(ctx)
    })

    this.bot.action('/buy', async (ctx) => {
      await sendInvoice(ctx)
    })

    this.bot.on('pre_checkout_query', async (ctx) => {
      console.log('[buy] pre_checkout_query', ctx.from)
      await ctx.answerPreCheckoutQuery(true).catch(this.handleSendMessageError)
    })

    this.bot.on('successful_payment', async (ctx) => {
      const payload = ctx.update.message.successful_payment.invoice_payload
      const chatId =
        this.paymentsRepository.getParsedChatFromInvoicePayload(payload)
      if (!chatId) {
        console.error(
          '[buy] Something wrong with parsed data: ',
          ctx.chat.id,
          ctx.update.message.successful_payment
        )
        return
      }

      console.log('[buy] successful_payment', ctx.chat.id)
      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'successful_payment',
      })

      await this.paymentsRepository.setGroupLimit(chatId, 'unlimited')

      await ctx
        .sendMessage(ALREADY_UNLIMITED, {
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerHelpCommand(): void {
    this.bot.command('help', async (ctx) => {
      console.log('[HELP] Send help info')

      this.metricsService.commandsCounter.inc({
        chatId: ctx.chat.id.toString(),
        command: 'help',
      })

      await ctx
        .reply(HELP_COMMAND_TEXT, {
          reply_to_message_id: ctx.message.message_id,
          parse_mode: 'HTML',
          reply_markup: {
            inline_keyboard: [[this.EXAMPLES_BUTTON]],
          },
        })
        .catch(this.handleSendMessageError)
    })
  }

  private registerHandleMessage(): void {
    this.bot.on(message('text'), async (ctx) => {
      const {
        message: { from, text },
        chat: { id: chatId },
      } = ctx

      const introduceBtn = {
        callback: '/intro_custom_mentions',
        text: '⚡ Introduce @custom_mentions!',
      }

      const reply_markup = {
        inline_keyboard: [
          [
            {
              callback_data: introduceBtn.callback,
              text: introduceBtn.text,
            },
          ],
        ],
      }

      const START_TIME = Date.now()

      if (!isChatGroup(chatId)) {
        await this.handleDirectMessage(
          ctx,
          text,
          ctx.message.text === '/start'
        ).catch(this.handleSendMessageError)

        return
      }

      await this.userRepository.addUsers(chatId, [from])

      const customMention = this.mentionRepository.getMentionForMsg(
        chatId,
        text
      )
      if (customMention) {
        await this.sendCustomMention(ctx, customMention, 'message')
        return
      }

      const isCallAll = this.MENTION_COMMANDS.some((command) =>
        text.includes(command)
      )
      if (!isCallAll) return

      const isAllowed = await this.onlyAdminActionGuard(ctx, 'useAllMention')
      if (!isAllowed) return

      const chatUsernames = await this.userRepository.getUsernamesByChatId(
        chatId
      )
      const usernames = Object.values(chatUsernames).filter(
        (username) => username !== from.username
      )

      if (!usernames.length) {
        console.log('[ALL] Noone to mention', ctx.message.chat.id)
        await ctx
          .reply(
            `🙈 It seems there is no one else here.
Someone should write something (read more /help).
<strong>You also can use our new feature!</strong>
`,
            {
              reply_to_message_id: ctx.message.message_id,
              parse_mode: 'HTML',
              reply_markup,
            }
          )
          .catch(this.handleSendMessageError)
        return
      }

      if (this.activeQuery.has(chatId)) {
        console.log('[ALL] Block spam', chatId)
        return
      }

      console.log(`[ALL] Start mention`, usernames.length, chatId)

      this.activeQuery.add(chatId)

      const includePay = usernames.length >= this.INCLUDE_PAY_LIMIT // Large group members count

      await this.mentionPeople(ctx, usernames, {
        includePay,
        includePromo: introduceBtn,
        afterMessageText: `
\n💡 Try also: <code>@all</code> or <code>@your_custom_mention</code> inside your message`,
      }).catch(this.handleSendMessageError)

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

  private async mentionPeople(
    ctx: UniversalMessageOrActionUpdateCtx,
    usernames: string[],
    options: {
      includePay: boolean
      includeField?: string
      overrideReplyMessageId?: number
      includePromo?: {
        text: string
        callback: string
      }
      afterMessageText?: string
    }
  ): Promise<void> {
    const chatId = ctx.chat?.id
    if (!chatId) return

    const messageId = options.overrideReplyMessageId ?? ctx.message?.message_id
    const prefix = options.includeField ? `${options.includeField}: ` : ''

    const promises = new Array<Promise<unknown>>()
    const chunkSize = 5 // Telegram limitations for mentions per message
    const chunksCount = 19 // Telegram limitations for messages
    const brokenUsers = new Array<string>()

    for (let i = 0; i < usernames.length; i += chunkSize) {
      const chunk = usernames.slice(i, i + chunkSize)

      const isLastMessage = i >= usernames.length - chunkSize

      const emoji =
        this.EMOJI_SET[Math.floor(Math.random() * this.EMOJI_SET.length)] ??
        '🔊'
      const str =
        `${emoji} ${prefix}` +
        chunk
          .map((username) =>
            username.startsWith('@') ? username : `@${username}`
          )
          .join(', ')

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
              | { error_code: number; parameters: { retry_after: number } } = (
              error as any
            ).response

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
          promises.map((promise) => promise.catch(this.handleSendMessageError))
        ).catch(this.handleSendMessageError)

        const sendLastMsg = async (withReply = true): Promise<null> => {
          return new Promise(async (resolve) => {
            console.log('[ALL] Broken users:', brokenUsers.length)
            let lastStr = str

            /**
             * Max Telegram message length - so we need to split this message by chunks
             */
            const MAX_LENGTH = 4096

            if (brokenUsers.length) {
              lastStr =
                lastStr +
                ', ' +
                brokenUsers.map((username) => `@${username}`).join(', ')
            }

            if (options.afterMessageText) {
              lastStr = `${lastStr} ${options.afterMessageText}`
            }

            const buttons: InlineKeyboardButton[] = []

            if (options.includePay) {
              buttons.push(this.BUY_MENTIONS_BUTTON)
            }

            if (options.includePromo) {
              buttons.push({
                text: options.includePromo.text,
                callback_data: options.includePromo.callback,
              })
            }

            const inlineKeyboard: InlineKeyboardMarkup['inline_keyboard'] = [
              buttons,
            ]

            try {
              let arr: string[] = []

              let currentStr = lastStr
              while (currentStr.length >= MAX_LENGTH) {
                const firstPart = currentStr.slice(0, 4000)
                currentStr = currentStr.slice(4000)
                arr.push(firstPart)
              }

              const promises: Promise<unknown>[] = []

              arr.map((str) => {
                return ctx.reply(str, {
                  reply_to_message_id: withReply ? messageId : undefined,
                  parse_mode: 'HTML',
                  reply_markup: {
                    inline_keyboard: inlineKeyboard,
                  },
                })
              })

              await Promise.all(promises)
              resolve(null)
            } catch (error) {
              const response:
                | undefined
                | {
                    error_code: number
                    parameters: { retry_after: number }
                    description: string
                  } = (error as any).response

              if (
                response?.error_code === 400 &&
                response.description ===
                  'Bad Request: message to reply not found'
              ) {
                console.log(
                  '[ALL] Retry because can not reply to not found msg',
                  response
                )

                await sendLastMsg(false)
                return resolve(null)
              }

              if (response?.error_code !== 429) {
                console.error(error)
                return resolve(null)
              }

              console.log(
                '[ALL] Retry last msg',
                response.parameters.retry_after
              )

              setTimeout(() => {
                sendLastMsg(withReply)
              }, (response.parameters.retry_after + 0.2) * 1000)
            } finally {
              this.activeQuery.delete(chatId)
            }
          })
        }

        await sendLastMsg().catch(this.handleSendMessageError)
      }
    }
  }

  private handleAddMembers(chatId: Chat['id'], users: User[]): Promise<void> {
    return this.userRepository.addUsers(chatId, users)
  }

  private handleDelete(chatId: Chat['id'], user: User): Promise<void> {
    return this.userRepository.deleteUser(chatId, user.id)
  }

  private handleSendMessageError(error: unknown, prefix = ''): void {
    console.error(prefix, error)
  }

  private async sendCustomMention(
    ctx: UniversalMessageOrActionUpdateCtx,
    field: string,
    source: 'message' | 'command' | 'action'
  ): Promise<void> {
    if (!ctx.chat?.id) return

    const isAllowed = await this.onlyAdminActionGuard(ctx, 'useCustomMention')
    if (!isAllowed) return

    const ids = await this.mentionRepository.getUsersIdsByMention(
      ctx.chat.id,
      field
    )
    const users = await this.userRepository.getUsersUsernamesByIdInChat(
      ctx.chat.id
    )

    const idsToDelete: string[] = []

    const usernamesToMention = ids.reduce<string[]>((acc, id) => {
      const username = users[id]
      if (!username) {
        idsToDelete.push(id)
        return acc
      }

      acc.push(username)

      return acc
    }, [])

    if (idsToDelete.length) {
      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.chat.id.toString(),
        action: 'mention.deleteBrokeUsers',
      })

      this.mentionRepository.deleteUsersFromMention(
        ctx.chat.id,
        field,
        idsToDelete
      )

      console.log('[mention] Clean up', ctx.chat.id, field, idsToDelete.length)
    }

    if (!usernamesToMention.length) {
      console.log(
        '[mention] Empty usernames to mention',
        ctx.chat.id,
        field,
        usernamesToMention.length
      )

      this.metricsService.customMentionsActionCounter.inc({
        chatId: ctx.chat.id.toString(),
        action: 'mention.deleteMention',
      })

      await this.mentionRepository.deleteMention(ctx.chat.id, field)
      await ctx
        .reply(CLEAN_UP_EMPTY_MENTION_TEXT, {
          parse_mode: 'HTML',
        })
        .catch(this.handleSendMessageError)

      return
    }

    this.metricsService.customMentionsCounter.inc({
      chatId: ctx.chat.id.toString(),
      source,
    })

    console.log(
      '[mention] Mention',
      ctx.chat.id,
      field,
      usernamesToMention.length
    )

    let fieldWithMentioner = `<code>@${field}</code>`
    if (ctx.from) {
      fieldWithMentioner += ` from <a href="tg://user?id=${ctx.from.id}">${ctx.from.username}</a>`
    }

    await this.mentionPeople(ctx, usernamesToMention, {
      includePay: usernamesToMention.length >= this.INCLUDE_PAY_LIMIT,
      includeField: fieldWithMentioner,
    }).catch(this.handleSendMessageError)
  }

  private async onlyAdminActionGuard(
    ctx: UniversalMessageOrActionUpdateCtx,
    action: SettingsAction
  ): Promise<boolean> {
    if (!ctx.chat?.id) return true

    const settings = await this.settingsRepository.getSettings(ctx.chat?.id)

    const isActionOnlyForAdmin = settings[action]

    const isAllowed =
      !isActionOnlyForAdmin ||
      (await this.getIsAllowed(ctx.chat?.id, ctx.from?.id))

    console.log(
      `[admin_guard] Check ${isAllowed} for ${action} admin ${ctx.chat.id} ${ctx.from?.id}`
    )

    if (isAllowed) return true

    this.metricsService.restrictedAction.inc({
      chatId: ctx.chat.id,
      action,
    })

    await ctx
      .reply(ONLY_ADMIN_ACTION_TEXT, {
        parse_mode: 'HTML',
      })
      .catch(this.handleSendMessageError)

    return false
  }

  private async getKeyboardWithCustomMentions(
    chatId: Chat['id']
  ): Promise<InlineKeyboardMarkup | undefined> {
    const data = await this.mentionRepository.getGroupMentions(chatId)
    const entries = Object.entries(data)
    if (!entries.length) {
      return undefined
    }

    const keyboard: InlineKeyboardMarkup = {
      inline_keyboard: [],
    }

    entries.forEach(([key, value]) => {
      keyboard.inline_keyboard.push([
        {
          callback_data: `/mention-${key}`,
          text: `${key}: ${value} member(s)`,
        },
      ])
    })

    return keyboard
  }

  private async getIsAllowed(
    chatId: Chat['id'],
    userId: User['id'] | undefined
  ): Promise<boolean> {
    if (!userId) return true

    const member = await this.bot.telegram.getChatMember(chatId, userId)
    const allowed = [
      'administrator',
      'creator', // disable while debug
    ]

    console.log(`[is_allowed] Check ${member.status} for user ${userId}`)

    return allowed.includes(member.status)
  }

  private async handleDirectMessage(
    ctx: NarrowedContext<Context, Update.MessageUpdate>,
    text: string,
    isStart: boolean
  ): Promise<void> {
    const {
      message: { from },
    } = ctx

    console.log(
      `[DIRECT_MSG] Direct message from ${text}`,
      from.username,
      isStart
    )

    await ctx.reply(
      `👋 Hi!
🤖 This is a bot to improve your chatting experience, just like Slack or other team messengers.

1. You can mention /all (or tag <code>@all</code>) chat participants with one command. 
2. Also you can create your own custom mentions and use them. For example <code>Hello, @frontend_dev</code>

❗️ But remember that I work only in <strong>groups</strong> and <strong>super groups</strong> (with additional permissions)

💫 <strong>Add me to your group and let the magic begin!</strong>`,
      {
        parse_mode: 'HTML',
        reply_markup: {
          inline_keyboard: [isStart ? [] : [this.EXAMPLES_BUTTON]],
        },
      }
    )

    if (!isStart) return

    this.metricsService.commandsCounter.inc({
      command: '/start',
    })

    await this.sendExamples(ctx)
  }

  private async sendExamples(
    ctx: UniversalMessageOrActionUpdateCtx
  ): Promise<void> {
    this.metricsService.commandsCounter.inc({
      command: 'examples',
    })

    await ctx.reply(`👇 Below are some examples for you:`, {
      parse_mode: 'HTML',
    })

    const ctxV3 = await ctx.reply('Hello @all')

    const names = ['@bill', '@ivan', '@kate']
    await this.mentionPeople(ctx, names, {
      includePay: false,
      overrideReplyMessageId: ctxV3.message_id,
    })

    const field = 'friends'

    await ctx.reply(`/add_to ${field} @bill @ivan @kate`, {
      parse_mode: 'HTML',
    })

    const successStr = `➕ In mention <strong>${field}</strong> added: ${names.join(
      ', '
    )}
✅ Now you can call them <code>@${field}</code>`

    await ctx.reply(`${successStr}`, {
      disable_notification: true,
      parse_mode: 'HTML',
    })

    let fieldWithMentioner = `<code>@${field}</code>`
    if (ctx.from) {
      fieldWithMentioner += ` from <a href="tg://user?id=${ctx.from.id}">${ctx.from.username}</a>`
    }

    const ctxV2 = await ctx.reply(`Hello @${field}`)

    await this.mentionPeople(ctx, names, {
      includePay: false,
      includeField: fieldWithMentioner,
      overrideReplyMessageId: ctxV2.message_id,
    })
  }
}
