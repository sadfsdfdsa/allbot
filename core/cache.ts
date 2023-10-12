import { User } from 'telegraf/types'
import { MetricsService } from './metrics.js'

type EnsuredUsername = NonNullable<User['username']>

/**
 * Service to preserve high load to Redis database
 */
export class CacheService {
  private cachedUsernames = new Set<EnsuredUsername>()

  constructor(
    private readonly metricsService: MetricsService,
    private readonly MAX_CACHE_SIZE: number
    ) {
    console.log('Init Cache service')
  }

  public isInCache(username: EnsuredUsername): boolean {
    return this.cachedUsernames.has(username)
  }

  public addToCache(usernames: EnsuredUsername[]): number {
    usernames.forEach(this.addToCacheSingle.bind(this))

    return this.cachedUsernames.size
  }

  public tryClearCache(): void {
    if (this.cachedUsernames.size <= this.MAX_CACHE_SIZE) return

    this.cachedUsernames.clear()
    this.metricsService.cacheCounter.reset()

    console.log('Remove users from cache', this.MAX_CACHE_SIZE)
  }

  private addToCacheSingle(username: EnsuredUsername): void {
    if (this.isInCache(username)) return

    this.metricsService.cacheCounter.inc()

    if (this.cachedUsernames.size % 10 === 0) {
      console.log('Cache size increased', this.cachedUsernames.size)
    }

    this.cachedUsernames.add(username)
  }
}
