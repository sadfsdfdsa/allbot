/**
 * Service to preserve high load to Redis database
 */
export class CacheService {
    metricsService;
    MAX_CACHE_SIZE;
    cachedUsernames = new Set();
    constructor(metricsService, MAX_CACHE_SIZE) {
        this.metricsService = metricsService;
        this.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
        console.log('Init Cache service');
    }
    isInCache(username) {
        return this.cachedUsernames.has(username);
    }
    addToCache(usernames) {
        usernames.forEach(this.addToCacheSingle.bind(this));
        return this.cachedUsernames.size;
    }
    tryClearCache() {
        if (this.cachedUsernames.size <= this.MAX_CACHE_SIZE)
            return;
        this.cachedUsernames.clear();
        this.metricsService.cacheCounter.reset();
        console.log('Remove users from cache', this.MAX_CACHE_SIZE);
    }
    addToCacheSingle(username) {
        if (this.isInCache(username))
            return;
        this.metricsService.cacheCounter.inc();
        if (this.cachedUsernames.size % 10 === 0) {
            console.log('Cache size increased', this.cachedUsernames.size);
        }
        this.cachedUsernames.add(username);
    }
}
