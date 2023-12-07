import 'dotenv/config'
import { createDB } from './core/db.js'
import { UserRepository } from './core/repository.js'
import { Bot } from './core/bot.js'
import { MetricsService } from './core/metrics.js'
import { Server } from './core/server.js'
import { CacheService } from './core/cache.js'
import { MentionRepository } from './core/mentionRepository.js'

const main = async (): Promise<void> => {
  const dbClient = await createDB(process.env.REDIS_URI)

  const metricsService = new MetricsService(dbClient)

  const server = new Server(metricsService, process.env.PORT)

  const cache = new CacheService(metricsService, 2000)

  const userRepository = new UserRepository(dbClient, metricsService, cache)

  const mentionRepository = new MentionRepository(
    dbClient,
    metricsService,
    cache
  )

  const bot = new Bot(
    userRepository,
    metricsService,
    mentionRepository,
    process.env.BOT_NAME,
    process.env.TG_TOKEN
  )

  bot.launch()
  server.listen()
}

main()
