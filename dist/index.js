import 'dotenv/config';
import { createDB } from './core/db.js';
import { UserRepository } from './core/repository.js';
import { Bot } from './core/bot.js';
import { MetricsService } from './core/metrics.js';
import { Server } from './core/server.js';
const main = async () => {
    const metricsService = new MetricsService();
    const server = new Server(metricsService, process.env.PORT);
    const dbClient = await createDB(process.env.REDIS_URI);
    const userRepository = new UserRepository(dbClient);
    const bot = new Bot(userRepository, metricsService, process.env.BOT_NAME, process.env.TG_TOKEN);
    bot.launch();
    server.listen();
};
main();
