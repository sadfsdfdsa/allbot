export class CacheService {
    MAX_CACHE_SIZE;
    cachedUsernames = new Array();
    constructor(MAX_CACHE_SIZE = 1000) {
        this.MAX_CACHE_SIZE = MAX_CACHE_SIZE;
        console.log('Init Cache service');
    }
    isInCache(username) {
        return this.cachedUsernames.includes(username);
    }
    addToCache(username) {
        if (this.isInCache(username))
            return this.cachedUsernames.length;
        console.log('Add to cache', username);
        return this.cachedUsernames.push(username);
    }
    tryClearCache() {
        if (this.cachedUsernames.length <= this.MAX_CACHE_SIZE)
            return;
        const needToRemove = this.cachedUsernames.length - this.MAX_CACHE_SIZE;
        const removed = this.cachedUsernames.splice(0, needToRemove);
        console.log('Remove users from cache', needToRemove, removed);
    }
}
