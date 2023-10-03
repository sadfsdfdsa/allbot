import { User } from 'telegraf/types'

type EnsuredUsername = NonNullable<User['username']>

export class CacheService {
  private readonly cachedUsernames = new Array<EnsuredUsername>()

  constructor(private readonly MAX_CACHE_SIZE = 1000) {
    console.log('Init Cache service')
  }

  public isInCache(username: EnsuredUsername): boolean {
    return this.cachedUsernames.includes(username)
  }

  public addToCache(usernames: EnsuredUsername[]): number {
    usernames.forEach(this.addToCacheSingle.bind(this))

    return this.cachedUsernames.length
  }

  public tryClearCache(): void {
    if (this.cachedUsernames.length <= this.MAX_CACHE_SIZE) return

    const needToRemove = this.cachedUsernames.length - this.MAX_CACHE_SIZE
    const removed = this.cachedUsernames.splice(0, needToRemove)
    console.log('Remove users from cache', needToRemove, removed)
  }

  private addToCacheSingle(username: EnsuredUsername): void {
    if (this.isInCache(username)) return

    console.log('Add to cache', username, this.cachedUsernames.length)
    this.cachedUsernames.push(username)
  }
}
