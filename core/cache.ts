import { Chat, User } from 'telegraf/types'
import { MetricsService } from './metrics.js'

type EnsuredUsername = NonNullable<User['username']>

/**
 * Service to preserve high load to Redis database
 */
export class CacheService {
  private cachedChats: Map<Chat['id'], Set<EnsuredUsername>> = new Map()

  constructor(
    private readonly metricsService: MetricsService,
    private readonly MAX_CACHE_SIZE: number
  ) {
    console.log('[LAUNCH] Init Cache service')

    const date = new Date()
    this.metricsService.cacheClearingCounter.inc({
      time: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
    })
  }

  public isInCache(chatId: Chat['id'], username: EnsuredUsername): boolean {
    return Boolean(this.cachedChats.get(chatId)?.has(username))
  }

  public removeFromCache(chatId: Chat['id']): boolean {
    // TODO remove metrics also
    return this.cachedChats.delete(chatId)
  }

  /**
   * @returns cache size for chat
   */
  public addToCache(chatId: Chat['id'], usernames: EnsuredUsername[]): number {
    usernames.forEach((username) => {
      this.addToCacheSingle(chatId, username)
    })

    return this.cachedChats.get(chatId)?.size ?? 0
  }

  public tryClearCache(): void {
    const arr = [...this.cachedChats.values()].map((set) => [...set]).flat()
    if (arr.length < this.MAX_CACHE_SIZE) return

    const date = new Date()
    this.metricsService.cacheClearingCounter.inc({
      time: date.toLocaleString('ru-RU', { timeZone: 'Asia/Yekaterinburg' }),
    })
    this.metricsService.cacheCounter.reset()

    this.cachedChats.clear()

    console.log('[CACHE] Remove users from cache', this.MAX_CACHE_SIZE)
  }

  private addToCacheSingle(
    chatId: Chat['id'],
    username: EnsuredUsername
  ): void {
    if (this.isInCache(chatId, username)) return

    this.metricsService.cacheCounter.inc({
      chatId: chatId.toString(),
    })

    if (!this.cachedChats.has(chatId)) {
      this.cachedChats.set(chatId, new Set())
    }

    this.cachedChats.get(chatId)?.add(username)

    const size = this.cachedChats.get(chatId)?.size ?? 0
    if (size % 10 === 0) {
      console.log(`[CACHE] Cache size increased for chatId ${chatId}`, size)
    }
  }
}
