import { Telegraf } from 'telegraf';
import { message } from 'telegraf/filters';
export class Bot {
    userRepository;
    metricsService;
    bot;
    COMMANDS = ['@all', '/all'];
    isListening = false;
    constructor(userRepository, metricsService, botName, token) {
        this.userRepository = userRepository;
        this.metricsService = metricsService;
        if (!token)
            throw new Error('No tg token set');
        if (botName)
            this.COMMANDS.push(botName);
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
        await this.userRepository.addUsers(chatId, [from]);
        const isCallAll = this.COMMANDS.some((command) => text.includes(command));
        console.log(`Message, should reply=${isCallAll}`, text);
        if (!isCallAll)
            return;
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
        console.log('Try add new members', users);
        return this.userRepository.addUsers(chatId, users);
    }
    handleDelete(chatId, user) {
        console.log('Delete user', user.username);
        return this.userRepository.deleteUser(chatId, user.id);
    }
}
