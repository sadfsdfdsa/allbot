import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { isChatGroup } from './utils/utils.js';
export class Bot {
    userRepository;
    metricsService;
    bot;
    MENTION_COMMANDS = ['@all', '/all'];
    ADMIN_ID;
    isListening = false;
    constructor(userRepository, metricsService, botName, adminId, token) {
        this.userRepository = userRepository;
        this.metricsService = metricsService;
        if (!token)
            throw new Error('No tg token set');
        if (botName)
            this.MENTION_COMMANDS.push(botName);
        this.ADMIN_ID = adminId;
        this.bot = new Telegraf(token);
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
                command: 'feedback',
                description: 'Send feedback or bug reports (English please)',
            },
            {
                command: 'code',
                description: 'Get link for bot opensource code',
            },
            {
                command: 'privacy',
                description: 'How the Bot takes care of your personal data',
            },
        ]);
        this.registerDonateCommand();
        this.registerFeedbackCommand();
        this.registerPrivacyCommand();
        this.registerCodeCommand();
        // Should be last for not overriding commands below
        this.registerHandleMessage();
        this.bot.on(message('new_chat_members'), ({ message, chat }) => {
            this.handleAddMembers(chat.id, message.new_chat_members);
            this.tryDetectBotAddOrDelete(chat.id, message.new_chat_members, 'add');
        });
        this.bot.on(message('left_chat_member'), ({ chat, message }) => {
            this.handleDelete(chat.id, message.left_chat_member);
            this.tryDetectBotAddOrDelete(chat.id, [message.left_chat_member], 'delete');
        });
    }
    async launch() {
        if (this.isListening)
            throw new Error('Bot already listening');
        this.bot.botInfo = await this.bot.telegram.getMe();
        console.log('[LAUNCH] Bot info: ', this.bot.botInfo);
        console.log('[LAUNCH] Bot starting');
        this.isListening = true;
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        this.bot.launch();
    }
    tryDetectBotAddOrDelete(chatId, members, action) {
        const thisBot = members.find((user) => user.id === this.bot.botInfo?.id);
        if (!thisBot)
            return;
        this.metricsService.groupsCounter.inc({
            action: action,
        });
        console.log(`[TEAM_CHANGE] Bot ${action} in ${chatId}`);
    }
    registerDonateCommand() {
        this.bot.command('donate', (ctx) => {
            console.log('[PAYMENT] Send payments info');
            const message = `
      This bot is free to use, but host and database are paid options for project.
So, if you have opportunity to support, it will be very helpful!
Every 1$ can help to improve features, performance and availability for the bot. 
Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code>
Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code>
Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code>
Thank you for using and help!
Note, than you can send /feedback with features or problems.
      `;
            this.metricsService.commandsCounter.inc({
                chatId: ctx.chat.id.toString(),
                command: 'donate',
            });
            this.metricsService.updateLatestPaymentsCall(`${ctx.chat.id}`);
            ctx.reply(message, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            });
        });
    }
    registerFeedbackCommand() {
        this.bot.command('feedback', (ctx) => {
            const { message: { from, text, message_id: messageId }, chat: { id: chatId }, } = ctx;
            const feedback = text.split('/feedback')[1] || undefined;
            if (!feedback) {
                console.log(`[FEEDBACK] Receive empty feedback from user ${from.username} in ${chatId}: ${feedback}`);
                this.metricsService.commandsCounter.inc({
                    chatId: chatId.toString(),
                    command: 'feedback.empty',
                });
                ctx.reply(`Add something in your feedback as feature or bug report`, {
                    reply_to_message_id: messageId,
                });
                return;
            }
            console.log(`[FEEDBACK] Receive feedback from user ${from.username} in ${chatId}: ${feedback}`);
            this.metricsService.commandsCounter.inc({
                chatId: chatId.toString(),
                command: 'feedback',
            });
            ctx.reply(`Your review has been successfully registered, we will contact you, thank you!`, {
                reply_to_message_id: messageId,
            });
            if (!this.ADMIN_ID)
                return;
            this.bot.telegram.sendMessage(this.ADMIN_ID, `There is a new feedback from @${from.username} in chat group ${chatId}:\n${feedback}`);
        });
    }
    registerPrivacyCommand() {
        this.bot.command('privacy', (ctx) => {
            console.log('[PRIVACY] Send privacy policy');
            const message = `
      Are you concerned about your security and personal data? This is right!
What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
All data is transmitted only via encrypted channels and is not used for other purposes.
We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
You can view the project's codebase using /code.
Be careful when using unfamiliar bots in your communication, it can be dangerous!
      `;
            this.metricsService.commandsCounter.inc({
                chatId: ctx.chat.id.toString(),
                command: 'privacy',
            });
            ctx.reply(message, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            });
        });
    }
    registerCodeCommand() {
        this.bot.command('code', (ctx) => {
            console.log('[CODE] Send code info');
            this.metricsService.commandsCounter.inc({
                chatId: ctx.chat.id.toString(),
                command: 'code',
            });
            ctx.reply(`I am an opensource project, feel free to reuse code or make bot better via /feedback.\nGithub link: https://github.com/sadfsdfdsa/allbot`, {
                reply_to_message_id: ctx.message.message_id,
            });
        });
    }
    registerHandleMessage() {
        this.bot.on(message('text'), async (ctx) => {
            const { message: { from, text, message_id: messageId }, chat: { id: chatId }, } = ctx;
            if (!isChatGroup(chatId)) {
                console.log(`[DIRECT_MSG] Direct message from ${ctx.message.text}`, from.username);
                ctx.reply(`Add me to your group, here is example @all mention for you:`);
                ctx.reply(`All from ${from.username}: @${from.username}`, {
                    reply_to_message_id: messageId,
                });
                return;
            }
            await this.userRepository.addUsers(chatId, [from]);
            const isCallAll = this.MENTION_COMMANDS.some((command) => text.includes(command));
            if (!isCallAll)
                return;
            const chatUsernames = await this.userRepository.getUsernamesByChatId(chatId);
            const usernames = Object.values(chatUsernames);
            if (!usernames.length)
                return;
            const includePay = usernames.length >= 10;
            console.log(`[ALL] Mention with pattern in group for ${usernames.length} people, includePay=${includePay}`, chatId);
            const str = usernames.map((username) => `@${username} `);
            let msg = `All from ${from.username}: ${str}`;
            if (includePay) {
                msg =
                    msg +
                        `
        \nSupport bot: /donate`;
            }
            this.metricsService.replyCounter.inc({
                chatId: chatId.toString(),
                withPayments: String(includePay),
            });
            ctx.reply(msg, {
                reply_to_message_id: messageId,
            });
        });
    }
    handleAddMembers(chatId, users) {
        return this.userRepository.addUsers(chatId, users);
    }
    handleDelete(chatId, user) {
        return this.userRepository.deleteUser(chatId, user.id);
    }
}
