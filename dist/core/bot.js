import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
import { isChatGroup } from './utils/utils.js';
export class Bot {
    userRepository;
    metricsService;
    bot;
    MENTION_COMMANDS = ['@all', '/all'];
    FEEDBACK_COMMAND = '/feedback';
    CODE_COMMAND = '/code';
    SUPPORT_PAY_COMMAND = '/support';
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
        this.bot.on(message('text'), async (ctx) => {
            const { message: { from, text, message_id }, chat: { id }, } = ctx;
            await this.handleMessage({
                from,
                text,
                messageId: message_id,
                chatId: id,
            }, (...args) => ctx.reply(...args));
        });
        this.bot.on(message('new_chat_members'), ({ message, chat }) => this.handleAddMembers(chat.id, message.new_chat_members));
        this.bot.on(message('left_chat_member'), ({ chat, message }) => this.handleDelete(chat.id, message.left_chat_member));
    }
    launch() {
        if (this.isListening)
            throw new Error('Bot already listening');
        console.log('Bot starting');
        this.isListening = true;
        process.once('SIGINT', () => this.bot.stop('SIGINT'));
        process.once('SIGTERM', () => this.bot.stop('SIGTERM'));
        this.bot.launch();
    }
    async handleMessage({ from, text, messageId, chatId }, reply) {
        if (text.startsWith(this.SUPPORT_PAY_COMMAND)) {
            const message = `
      This bot is free to use, but host and database are paid options for project.
So, if you have opportunity to support, it will be very helpful!
Every 1$ can help to improve features, performance and availability for the bot. 
Support via USDT-TRX: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code>
Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code>
Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code>
Thank you for using and help!
Note, than you can send /feedback with features or problems.
      `;
            reply(message, {
                reply_to_message_id: messageId,
                parse_mode: 'HTML'
            });
            return;
        }
        if (text.startsWith(this.CODE_COMMAND)) {
            reply(`I am an opensource project, feel free to reuse code or make bot better via /feedback.\nGithub link: https://github.com/sadfsdfdsa/allbot`, {
                reply_to_message_id: messageId,
            });
            return;
        }
        if (text.startsWith(this.FEEDBACK_COMMAND)) {
            const feedback = text.split(this.FEEDBACK_COMMAND)[1] || undefined;
            if (!feedback) {
                console.log(`Receive empty feedback from user ${from.username} in ${chatId}: ${feedback}`);
                reply(`Add something in your feedback as feature or bug report`, {
                    reply_to_message_id: messageId,
                });
                return;
            }
            console.log(`Receive feedback from user ${from.username} in ${chatId}: ${feedback}`);
            reply(`Your review has been successfully registered, we will contact you, thank you!`, {
                reply_to_message_id: messageId,
            });
            if (!this.ADMIN_ID)
                return;
            this.bot.telegram.sendMessage(this.ADMIN_ID, `There is a new feedback from @${from.username} in chat group ${chatId}:\n${feedback}`);
            return;
        }
        if (!isChatGroup(chatId)) {
            console.log('Direct message from', from.username);
            reply(`Add me to your group, here is example @all mention for you:`);
            reply(`All from ${from.username}: @${from.username}`, {
                reply_to_message_id: messageId,
            });
            return;
        }
        await this.userRepository.addUsers(chatId, [from]);
        const isCallAll = this.MENTION_COMMANDS.some((command) => text.includes(command));
        if (!isCallAll)
            return;
        console.log(`Mention with pattern in group`, chatId);
        const chatUsernames = await this.userRepository.getUsernamesByChatId(chatId);
        if (!Object.values(chatUsernames).length)
            return;
        const str = Object.values(chatUsernames).map((username) => `@${username} `);
        this.metricsService.addReply();
        reply(`All from ${from.username}: ${str}`, {
            reply_to_message_id: messageId,
        });
    }
    handleAddMembers(chatId, users) {
        console.log('Try add new members', users.map(item => item.username));
        return this.userRepository.addUsers(chatId, users);
    }
    handleDelete(chatId, user) {
        console.log('Delete user', user.username);
        return this.userRepository.deleteUser(chatId, user.id);
    }
}
