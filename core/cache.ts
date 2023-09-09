import { User } from "telegraf/types";

type EnsuredUsername = NonNullable<User['username']>

export class CacheService {
    private readonly cachedUsernames = new Array<EnsuredUsername>()

    constructor(
        private readonly MAX_CACHE_SIZE = 1000
    ) {
        console.log('Init Cache service')
    }

    public isInCache(username: EnsuredUsername): boolean {
        return this.cachedUsernames.includes(username)
    }

    public addToCache(username: EnsuredUsername): number {
        if (this.isInCache(username)) return this.cachedUsernames.length

        console.log('Add to cache', username)
        return this.cachedUsernames.push(username)
    }

    public tryClearCache(): void {
        if (this.cachedUsernames.length <= this.MAX_CACHE_SIZE) return

        const needToRemove = this.cachedUsernames.length - this.MAX_CACHE_SIZE
        const removed = this.cachedUsernames.splice(0, needToRemove)
        console.log('Remove users from cache', needToRemove, removed)
    }
}