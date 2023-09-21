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
    addToCache(usernames) {
        usernames.forEach(this.addToCacheSingle.bind(this));
        return this.cachedUsernames.length;
    }
    tryClearCache() {
        if (this.cachedUsernames.length <= this.MAX_CACHE_SIZE)
            return;
        const needToRemove = this.cachedUsernames.length - this.MAX_CACHE_SIZE;
        const removed = this.cachedUsernames.splice(0, needToRemove);
        console.log('Remove users from cache', needToRemove, removed);
    }
    addToCacheSingle(username) {
        if (this.isInCache(username))
            return;
        console.log('Add to cache', username, this.cachedUsernames.length);
        this.cachedUsernames.push(username);
    }
}
