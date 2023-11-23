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
        ]);
        this.registerDonateCommand();
        this.registerFeedbackCommand();
        this.registerPrivacyCommand();
        this.registerHelpCommand();
        // Should be last for not overriding commands below
        this.registerHandleMessage();
        this.bot.action('/donate', (ctx) => {
            if (!ctx.chat?.id)
                return;
            const msg = this.handleDonateCommand(ctx.chat?.id, 'donate.btn');
            ctx.reply(msg, {
                parse_mode: 'HTML',
            });
        });
        this.bot.on(message('new_chat_members'), (ctx) => {
            const { chat, message } = ctx;
            this.handleAddMembers(chat.id, message.new_chat_members);
            const isNewGroup = this.tryDetectBotAddOrDelete(chat.id, message.new_chat_members, 'add');
            if (!isNewGroup)
                return;
            const msg = `
👋 Hello everyone!
🤖 This is a bot to improve your experience, just like Slack or other instant messengers. You can mention /all chat participants with one command.
❔ But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write '+' in this chat. Read more with /help.
✍️ You can help to improve the Bot by sending /feedback or /donate for servers.
`;
            ctx.reply(msg, {
                parse_mode: 'HTML',
            });
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
            return false;
        const date = new Date();
        this.metricsService.groupsCounter.inc({
            action,
            chatId,
            time: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
        });
        console.log(`[TEAM_CHANGE] Bot ${action} in ${chatId}`);
        if (action === 'delete') {
            this.userRepository.removeTeam(chatId);
        }
        return true;
    }
    registerDonateCommand() {
        this.bot.command('donate', (ctx) => {
            const msg = this.handleDonateCommand(ctx.chat.id);
            ctx.reply(msg, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            });
        });
    }
    registerFeedbackCommand() {
        this.bot.command('feedback', (ctx) => {
            const { message: { from, text, message_id: messageId }, chat: { id: chatId }, } = ctx;
            const feedback = text.split('/feedback')[1] || undefined;
            const isCommandWithBotName = feedback
                ?.trim()
                .endsWith(this.bot.botInfo?.username || '');
            if (!feedback || isCommandWithBotName) {
                console.log(`[FEEDBACK] Receive empty feedback from user ${from.username} in ${chatId}: ${feedback}`);
                this.metricsService.commandsCounter.inc({
                    chatId: chatId.toString(),
                    command: 'feedback.empty',
                });
                ctx.reply(`✍️ Add something in your feedback as feature or bug report`, {
                    reply_to_message_id: messageId,
                    parse_mode: 'HTML',
                });
                return;
            }
            console.log(`[FEEDBACK] Receive feedback from user ${from.username} in ${chatId}: ${feedback}`);
            this.metricsService.commandsCounter.inc({
                chatId: chatId.toString(),
                command: 'feedback',
            });
            ctx.reply(`✅ Your review has been successfully registered, we will contact you, thank you!`, {
                reply_to_message_id: messageId,
                parse_mode: 'HTML',
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
🔐 Are you concerned about your security and personal data? <strong>This is right!</strong>
✅ What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
✅ All data is transmitted only via encrypted channels and is not used for other purposes.
✅ We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
🧑‍💻 You can view the project's codebase using Github -  https://github.com/sadfsdfdsa/allbot (also can Star or Fork the Bot project).
<strong>❗️ Be careful when using unfamiliar bots in your communication, it can be dangerous!</strong>
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
    registerHelpCommand() {
        this.bot.command('help', (ctx) => {
            console.log('[HELP] Send help info');
            const msg = `
<b>❔ How can I mention chat participants?</b>
You can mention all chat participants using "/all" or by mentioning "@all" anywhere in the message.
For example: <i>Wanna play some games @all?</i>

<b>❔ Why does the bot give out so many messages?</b>
Telegram has a limit on mentions - only 5 users receive notifications per message.

<b>❔ Why doesn't the bot mention me?</b>
Bot can only mention you after your first text message after the bot joins the group.

<b>❔ Why Bot add /donate to message?</b>
You can use bot for Free, but servers are paid, so you can also support project.
Bot adds /donate only for big groups - more than 10 people.

<strong>👀 Commands:</strong>
/donate - help the project pay for the servers 🫰
/feedback - send feature requests or report problems ✍️
/privacy - info about personal data usage and codebase of the Bot 🔐
`;
            this.metricsService.commandsCounter.inc({
                chatId: ctx.chat.id.toString(),
                command: 'help',
            });
            ctx.reply(msg, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            });
        });
    }
    registerHandleMessage() {
        this.bot.on(message('text'), async (ctx) => {
            const { message: { from, text, message_id: messageId }, chat: { id: chatId }, } = ctx;
            const START_TIME = Date.now();
            if (!isChatGroup(chatId)) {
                console.log(`[DIRECT_MSG] Direct message from ${ctx.message.text}`, from.username);
                ctx.reply(`👥 Add me to your group, here is example @all mention for you:`, {
                    parse_mode: 'HTML',
                });
                const startText = `🔊 All from <a href="tg://user?id=${from.id}">${from.username}</a>:`;
                ctx.reply(`${startText} @${from.username}`, {
                    reply_to_message_id: messageId,
                    parse_mode: 'HTML',
                });
                return;
            }
            await this.userRepository.addUsers(chatId, [from]);
            const isCallAll = this.MENTION_COMMANDS.some((command) => text.includes(command));
            if (!isCallAll)
                return;
            const chatUsernames = await this.userRepository.getUsernamesByChatId(chatId);
            const usernames = Object.values(chatUsernames).filter((username) => username !== from.username);
            if (!usernames.length)
                return;
            const includePay = usernames.length >= 10;
            // 50/50 - random for adding command or button for Donation
            const includeButtonPay = includePay ? Math.random() <= 0.5 : false;
            this.metricsService.replyCounter.inc({
                chatId: chatId.toString(),
                withPayments: includePay
                    ? includeButtonPay
                        ? 'true.btn' // experimental
                        : 'true' // stable
                    : 'false',
            });
            this.metricsService.replyUsersCountHistogram.observe(usernames.length);
            const promises = new Array();
            const chunkSize = 5; // Telegram limitations for mentions per message
            for (let i = 0; i < usernames.length; i += chunkSize) {
                const chunk = usernames.slice(i, i + chunkSize);
                const isLastMessage = i >= usernames.length - chunkSize;
                const str = '🔊 ' + chunk.map((username) => `@${username}`).join(', ');
                if (!isLastMessage) {
                    const res = ctx.sendMessage(str, {
                        parse_mode: 'HTML',
                    });
                    promises.push(res);
                }
                else {
                    let lastStr = str;
                    if (includePay && !includeButtonPay) {
                        lastStr = lastStr + `\n<strong>🫰 Support bot: /donate </strong>`;
                    }
                    const inlineKeyboard = [
                        includePay && includeButtonPay
                            ? [
                                {
                                    callback_data: '/donate',
                                    text: '🫰 Support bot!',
                                },
                            ]
                            : [],
                    ];
                    await Promise.all(promises);
                    await ctx.reply(lastStr, {
                        reply_to_message_id: messageId,
                        parse_mode: 'HTML',
                        reply_markup: {
                            inline_keyboard: inlineKeyboard,
                        },
                    });
                }
            }
            const END_TIME = Date.now();
            const EXECUTE_TIME = END_TIME - START_TIME;
            console.log(`[ALL] Mention with pattern in group for ${usernames.length} people, TIME=${EXECUTE_TIME}, includePay=${includePay}`, chatId);
            this.metricsService.replyUsersTimeHistogram.observe(EXECUTE_TIME);
        });
    }
    handleDonateCommand(chatId, command = 'donate') {
        console.log('[PAYMENT] Send payments info');
        const message = `
🙌 This bot is free to use, but hosting and database are paid options for project. So, if you have opportunity to support, it will be very helpful! 🙌

1️⃣<strong>Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code></strong>👈

2️⃣<strong>Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code></strong>👈

3️⃣<strong>Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code></strong>👈

Thank you for using and supporting us! ❤️
✍️ Remember, than you can send /feedback with features or problems.
`;
        this.metricsService.commandsCounter.inc({
            chatId: chatId.toString(),
            command,
        });
        this.metricsService.updateLatestPaymentsCall(`${chatId}`);
        return message;
    }
    handleAddMembers(chatId, users) {
        return this.userRepository.addUsers(chatId, users);
    }
    handleDelete(chatId, user) {
        return this.userRepository.deleteUser(chatId, user.id);
    }
}
