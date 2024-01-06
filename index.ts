import 'dotenv/config'
import { createDB } from './core/db.js'
import { UserRepository } from './core/userRepository.js'
import { Bot } from './core/bot.js'
import { MetricsService } from './core/metrics.js'
import { Server } from './core/server.js'
import { CacheService } from './core/cache.js'
import { MentionRepository } from './core/mentionRepository.js'
import { PaymentsRepository } from './core/paymentsRepository.js'
import { SettingsRepository } from './core/settingsRepository.js'

const main = async (): Promise<void> => {
  const paymentsRepository = new PaymentsRepository(process.env.MENTIONS_LIMIT)

  const dbClient = await createDB(process.env.REDIS_URI)

  const metricsService = new MetricsService(dbClient)

  const server = new Server(metricsService, process.env.PORT)

  const cache = new CacheService(metricsService, 2000)

  const settingsRepository = new SettingsRepository(dbClient, metricsService)

  const userRepository = new UserRepository(dbClient, metricsService, cache)

  const mentionRepository = new MentionRepository(
    dbClient,
    metricsService,
    paymentsRepository
  )

  const bot = new Bot(
    userRepository,
    metricsService,
    mentionRepository,
    paymentsRepository,
    settingsRepository,
    process.env.BOT_NAME,
    process.env.TG_TOKEN
  )

  bot.launch()
  server.listen()
}

main()
