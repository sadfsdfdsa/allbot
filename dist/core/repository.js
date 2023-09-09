export class UserRepository {
    db;
    metrics;
    cache;
    constructor(db, metrics, cache) {
        this.db = db;
        this.metrics = metrics;
        this.cache = cache;
        console.log('Init User repository');
    }
    // TODO improve tests
    async addUsers(chatId, users) {
        const usernamesById = {};
        users.forEach((user) => {
            if (!user.username || user.is_bot || this.cache.isInCache(user.username))
                return;
            this.cache.addToCache(user.username);
            usernamesById[this.convertId(user.id)] = user.username;
        });
        this.cache.tryClearCache();
        if (!Object.keys(usernamesById).length)
            return;
        const timeMark = `Add users ${JSON.stringify(usernamesById)}`;
        console.time(timeMark);
        try {
            await this.db.hSet(this.convertId(chatId), usernamesById);
        }
        catch (err) {
            // In case of [ErrorReply: ERR wrong number of arguments for 'hset' command]
            console.error('Redis error', err, JSON.stringify(usernamesById));
            const chatIdStr = this.convertId(chatId);
            try {
                const promises = Object.entries(usernamesById).map(([id, username]) => this.db.hSet(chatIdStr, id, username));
                await Promise.all(promises);
            }
            catch (err2) {
                console.error('Redis again error', err, JSON.stringify(usernamesById));
            }
        }
        console.timeEnd(timeMark);
    }
    async getUsernamesByChatId(chatId) {
        const timeMark = `Get users ${chatId}`;
        console.time(timeMark);
        const dbKey = this.convertId(chatId);
        const chatUsernames = await this.db.hGetAll(dbKey);
        console.timeEnd(timeMark);
        this.metrics.updateLatestUsage(dbKey);
        return Object.values(chatUsernames);
    }
    async deleteUser(chatId, userId) {
        const timeMark = `Delete user ${chatId} ${userId}`;
        console.time(timeMark);
        await this.db.hDel(this.convertId(chatId), this.convertId(userId));
        console.timeEnd(timeMark);
    }
    convertId(id) {
        return `${id}`;
    }
}
