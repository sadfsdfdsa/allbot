import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { isChatGroup } from './utils/utils.js';
export class Bot {
    userRepository;
    metricsService;
    bot;
    MENTION_COMMANDS = ['@all', '/all'];
    CHRISTMAS_EMOJI = ['🎄', '❄️', '🎅', '🎁', '☃️', '🦌'];
    DONATE_LINK = 'https://www.buymeacoffee.com/karanarqq';
    DONATE_URL_BUTTON = {
        url: this.DONATE_LINK,
        text: '☕️ Buy me a coffee',
    };
    isListening = false;
    activeQuery = new Set();
    constructor(userRepository, metricsService, botName, token) {
        this.userRepository = userRepository;
        this.metricsService = metricsService;
        if (!token)
            throw new Error('No tg token set');
        if (botName)
            this.MENTION_COMMANDS.push(botName);
        this.bot = new Telegraf(token, {
            handlerTimeout: Number.POSITIVE_INFINITY,
        });
        this.bot.telegram.setMyCommands([
            {
                command: 'all',
                description: 'Mention all users in a group',
            },
            {
                command: 'donate',
                description: 'Support the project to pay for servers and new features',
            },
            {
                command: 'help',
                description: 'Help information',
            },
            {
                command: 'privacy',
                description: 'How the Bot takes care of your personal data',
            },
        ]);
        this.registerDonateCommand();
        this.registerPrivacyCommand();
        this.registerHelpCommand();
        // Should be last for not overriding commands below
        this.registerHandleMessage();
        this.bot.action('/donate', (ctx) => {
            if (!ctx.chat?.id)
                return;
            const msg = this.handleDonateCommand(ctx.chat?.id, 'donate.btn');
            ctx
                .reply(msg, {
                parse_mode: 'HTML',
            })
                .catch(this.handleSendMessageError);
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
✍️ You can help to improve the Bot by /donate for servers.
⚡ Want to see updates first, send feature request to the developers? Join the chat: https://t.me/allsuperior_chat !
`;
            ctx
                .reply(msg, {
                parse_mode: 'HTML',
            })
                .catch(this.handleSendMessageError);
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
            const inlineKeyboard = [[this.DONATE_URL_BUTTON]];
            ctx
                .reply(msg, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
                reply_markup: {
                    inline_keyboard: inlineKeyboard,
                },
            })
                .catch(this.handleSendMessageError);
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
            ctx
                .reply(message, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            })
                .catch(this.handleSendMessageError);
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

<b>❔ How mentions work for members in large (100+) groups?</b>
Telegram restrict messaging for Bots. So we can send only 20 messages at one time per group.
Also Telegram send Push only first 5 mentions in a message. So we must split all your group members by 5 and can send only 20 messages.
There is why we sending 19 messages with 5 mentions and one last big message with all other users. Last message users do not receive Pushes.
Please contact us in chat if you need that functionality.

<strong>👀 Commands:</strong>
/donate - help the project pay for the servers 🫰
/privacy - info about personal data usage and codebase of the Bot 🔐

<strong>💬 Our chat:</strong>
⚡ Group with updates, for sending bug reports or feature requests - https://t.me/allsuperior_chat
`;
            this.metricsService.commandsCounter.inc({
                chatId: ctx.chat.id.toString(),
                command: 'help',
            });
            ctx
                .reply(msg, {
                reply_to_message_id: ctx.message.message_id,
                parse_mode: 'HTML',
            })
                .catch(this.handleSendMessageError);
        });
    }
    registerHandleMessage() {
        this.bot.on(message('text'), async (ctx) => {
            const { message: { from, text, message_id: messageId }, chat: { id: chatId }, } = ctx;
            const START_TIME = Date.now();
            if (!isChatGroup(chatId)) {
                console.log(`[DIRECT_MSG] Direct message from ${ctx.message.text}`, from.username);
                await ctx
                    .reply(`👥 Add me to your group, here is example @all mention for you:`, {
                    parse_mode: 'HTML',
                })
                    .catch(this.handleSendMessageError);
                const startText = `🔊 All from <a href="tg://user?id=${from.id}">${from.username}</a>:`;
                ctx
                    .reply(`${startText} @${from.username}`, {
                    reply_to_message_id: messageId,
                    parse_mode: 'HTML',
                })
                    .catch(this.handleSendMessageError);
                return;
            }
            await this.userRepository.addUsers(chatId, [from]);
            const isCallAll = this.MENTION_COMMANDS.some((command) => text.includes(command));
            if (!isCallAll)
                return;
            const chatUsernames = await this.userRepository.getUsernamesByChatId(chatId);
            const usernames = Object.values(chatUsernames).filter((username) => username !== from.username);
            // const usernames = new Array<string>(255)
            //   .fill('item')
            //   .map((_, index) => `test${index}`)
            if (!usernames.length)
                return;
            if (this.activeQuery.has(chatId)) {
                console.log('[ALL] Block spam', chatId);
                return;
            }
            console.log(`[ALL] Start mention`, usernames.length, chatId);
            this.activeQuery.add(chatId);
            const includePay = usernames.length >= 10; // Large group members count
            const promises = new Array();
            const chunkSize = 5; // Telegram limitations for mentions per message
            const chunksCount = 19; // Telegram limitations for messages
            const brokenUsers = new Array();
            for (let i = 0; i < usernames.length; i += chunkSize) {
                const chunk = usernames.slice(i, i + chunkSize);
                const isLastMessage = i >= usernames.length - chunkSize;
                const emoji = this.CHRISTMAS_EMOJI[Math.floor(Math.random() * this.CHRISTMAS_EMOJI.length)] ?? '🔊';
                const str = `${emoji} ` + chunk.map((username) => `@${username}`).join(', ');
                if (!isLastMessage) {
                    if (promises.length >= chunksCount) {
                        brokenUsers.push(...chunk);
                        continue;
                    }
                    const execute = async () => {
                        try {
                            const sendingResult = await ctx.sendMessage(str, {
                                parse_mode: 'HTML',
                            });
                            return sendingResult;
                        }
                        catch (error) {
                            const response = error.response;
                            if (response?.error_code === 429) {
                                console.log('[ALL] Error with timeout=', response.parameters.retry_after);
                                return new Promise((resolve) => {
                                    setTimeout(async () => {
                                        try {
                                            await ctx.sendMessage(str, {
                                                parse_mode: 'HTML',
                                            });
                                            resolve(null);
                                        }
                                        catch (error) {
                                            console.log('[ALL] Add users to broken');
                                            brokenUsers.push(...chunk);
                                            resolve(null);
                                        }
                                    }, (response.parameters.retry_after + 0.2) * 1000);
                                });
                            }
                            console.log(error);
                            return Promise.resolve();
                        }
                    };
                    promises.push(execute());
                }
                else {
                    await Promise.all(promises.map((promise) => promise.catch(this.handleSendMessageError))).catch(this.handleSendMessageError);
                    const sendLastMsg = async () => {
                        return new Promise(async (resolve) => {
                            console.log('[ALL] Broken users:', brokenUsers.length);
                            let lastStr = str;
                            if (brokenUsers.length) {
                                lastStr =
                                    lastStr +
                                        ', ' +
                                        brokenUsers.map((username) => `@${username}`).join(', ');
                                if (usernames.length > 100) {
                                    lastStr =
                                        lastStr +
                                            `\nPlease read /help for your group with size more than 100`;
                                }
                            }
                            const inlineKeyboard = [
                                includePay ? [this.DONATE_URL_BUTTON] : [],
                            ];
                            try {
                                await ctx.reply(lastStr, {
                                    reply_to_message_id: messageId,
                                    parse_mode: 'HTML',
                                    reply_markup: {
                                        inline_keyboard: inlineKeyboard,
                                    },
                                });
                                resolve(null);
                            }
                            catch (error) {
                                const response = error.response;
                                if (response?.error_code !== 429) {
                                    console.error(error);
                                    return resolve(null);
                                }
                                console.log('[ALL] Retry last msg', response.parameters.retry_after);
                                setTimeout(() => {
                                    sendLastMsg();
                                }, (response.parameters.retry_after + 0.2) * 1000);
                            }
                            finally {
                                this.activeQuery.delete(chatId);
                            }
                        });
                    };
                    await sendLastMsg();
                }
            }
            const END_TIME = Date.now();
            const EXECUTE_TIME = END_TIME - START_TIME;
            console.log(`[ALL] Mention with pattern in group for ${usernames.length} people, TIME=${EXECUTE_TIME}, includePay=${includePay}`, chatId);
            this.metricsService.replyCounter.inc({
                chatId: chatId.toString(),
                withPayments: includePay ? 'true' : 'false',
            });
            this.metricsService.replyUsersCountHistogram.observe(usernames.length);
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
    handleSendMessageError(error) {
        console.error(error);
    }
}
