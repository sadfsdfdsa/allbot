/**
 * Service to preserve high load to Redis database
 */
export class CacheService {
    metricsService;
    MAX_CACHE_SIZE;
    cachedChats = new Map();
    constructor(metricsService, MAX_CACHE_SIZE) {
        this.metricsService = metricsService;
        this.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
        console.log('[LAUNCH] Init Cache service');
    }
    isInCache(chatId, username) {
        return Boolean(this.cachedChats.get(chatId)?.has(username));
    }
    /**
     * @returns cache size for chat
     */
    addToCache(chatId, usernames) {
        usernames.forEach((username) => {
            this.addToCacheSingle(chatId, username);
        });
        return this.cachedChats.get(chatId)?.size ?? 0;
    }
    tryClearCache() {
        const arr = [...this.cachedChats.values()].map((set) => [...set]).flat();
        if (arr.length < this.MAX_CACHE_SIZE)
            return;
        this.metricsService.cacheCounter.reset();
        this.metricsService.teamsCacheCounter.reset();
        this.cachedChats.clear();
        console.log('[CACHE] Remove users from cache', this.MAX_CACHE_SIZE);
    }
    addToCacheSingle(chatId, username) {
        if (this.isInCache(chatId, username))
            return;
        this.metricsService.cacheCounter.inc({
            chatId: chatId.toString(),
        });
        if (!this.cachedChats.has(chatId)) {
            this.cachedChats.set(chatId, new Set());
            this.metricsService.teamsCacheCounter.inc();
        }
        this.cachedChats.get(chatId)?.add(username);
        const size = this.cachedChats.get(chatId)?.size ?? 0;
        if (size % 10 === 0) {
            console.log(`[CACHE] Cache size increased for chatId ${chatId}`, size);
        }
    }
}
