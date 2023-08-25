import { Telegraf } from 'telegraf';
export const createBot = (token) => {
    console.log('Starting bot');
    if (!token) {
        throw new Error('No tg token set');
    }
    const bot = new Telegraf(token);
    return bot;
};
