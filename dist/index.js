import { message } from 'telegraf/filters';
import 'dotenv/config';
import { createDB } from './core/db.js';
import { UserRepository } from './core/repository.js';
import { createBot } from './core/bot.js';
const NAME = process.env.BOT_NAME;
const ALL_COMMANDS = ['@all', '/all'];
if (NAME)
    ALL_COMMANDS.push(NAME);
const HEALTH_PROBE = '/health';
const main = async () => {
    const client = await createDB(process.env.REDIS_URI);
    const repository = new UserRepository(client);
    const bot = createBot(process.env.TG_TOKEN);
    bot.on(message('text'), async (ctx) => {
        const { message: { from, text, message_id }, chat: { id }, } = ctx;
        // Health check
        if (text === HEALTH_PROBE) {
            ctx.reply(JSON.stringify({ status: 200 }), {
                reply_to_message_id: message_id,
            });
            return;
        }
        await repository.addUsers(id, [from]);
        const isCallAll = ALL_COMMANDS.some((command) => text.includes(command));
        console.log(`Message, should reply=${isCallAll}`, text);
        if (!isCallAll)
            return;
        const chatUsernames = await repository.getUsernamesByChatId(id);
        if (!Object.values(chatUsernames).length)
            return;
        const str = Object.values(chatUsernames).map((username) => `@${username} `);
        ctx.reply(`All from ${from.username}: ${str}`, {
            reply_to_message_id: message_id,
        });
    });
    bot.on(message('new_chat_members'), async ({ message, chat: { id } }) => {
        console.log('Try add new members', message.new_chat_members);
        await repository.addUsers(id, message.new_chat_members);
    });
    bot.on(message('left_chat_member'), async (ctx) => {
        console.log('Delete user', ctx.message.left_chat_member.username);
        await client.hDel(`${ctx.chat.id}`, `${ctx.message.left_chat_member.id}`);
    });
    bot.launch();
    // Enable graceful stop
    process.once('SIGINT', () => bot.stop('SIGINT'));
    process.once('SIGTERM', () => bot.stop('SIGTERM'));
};
main();
