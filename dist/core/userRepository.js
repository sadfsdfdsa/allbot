export class UserRepository {
    db;
    metrics;
    cache;
    constructor(db, metrics, cache) {
        this.db = db;
        this.metrics = metrics;
        this.cache = cache;
        console.log('[LAUNCH] Init User repository');
    }
    async addUsers(chatId, users) {
        const usernamesById = {};
        users.forEach((user) => {
            if (!user.username ||
                user.is_bot ||
                this.cache.isInCache(chatId, user.username))
                return;
            this.cache.addToCache(chatId, [user.username]);
            usernamesById[this.convertId(user.id)] = user.username;
        });
        this.cache.tryClearCache();
        if (!Object.keys(usernamesById).length)
            return;
        const timeMark = `Add users ${JSON.stringify(usernamesById)}`;
        console.time(timeMark);
        try {
            await this.db.hSet(this.convertId(chatId), usernamesById);
            this.metrics.dbOpsCounter.inc({
                action: 'addUsers',
            });
        }
        catch (err) {
            // In case of [ErrorReply: ERR wrong number of arguments for 'hset' command]
            console.error('Redis error', err, JSON.stringify(usernamesById));
            const chatIdStr = this.convertId(chatId);
            try {
                const promises = Object.entries(usernamesById).map(([id, username]) => {
                    this.metrics.dbOpsCounter.inc({
                        action: 'addUsersSingle',
                    });
                    return this.db.hSet(chatIdStr, id, username);
                });
                await Promise.all(promises);
            }
            catch (err2) {
                console.error('Redis again error', err, JSON.stringify(usernamesById));
            }
        }
        console.timeEnd(timeMark);
    }
    async getUsersUsernamesByIdInChat(chatId) {
        const timeMark = `Get users ${chatId}`;
        console.time(timeMark);
        const dbKey = this.convertId(chatId);
        const chatUsernamesById = await this.db.hGetAll(dbKey);
        this.metrics.dbOpsCounter.inc({
            action: 'getUsersUsernamesByIdInChat',
        });
        console.timeEnd(timeMark);
        return chatUsernamesById;
    }
    async getUsersIdsByUsernamesInChat(chatId) {
        const timeMark = `Get users ${chatId}`;
        console.time(timeMark);
        const dbKey = this.convertId(chatId);
        const chatUsernamesById = await this.db.hGetAll(dbKey);
        this.metrics.dbOpsCounter.inc({
            action: 'getUsersIdsByUsernamesInChat',
        });
        console.timeEnd(timeMark);
        const reversedUsers = Object.entries(chatUsernamesById).reduce((ret, entry) => {
            const [key, value] = entry;
            ret[value] = key;
            return ret;
        }, {});
        return reversedUsers;
    }
    async getUsernamesByChatId(chatId) {
        const timeMark = `Get users ${chatId}`;
        console.time(timeMark);
        const dbKey = this.convertId(chatId);
        const chatUsernamesById = await this.db.hGetAll(dbKey);
        this.metrics.dbOpsCounter.inc({
            action: 'getUsernamesByChatId',
        });
        console.timeEnd(timeMark);
        this.metrics.updateLatestUsage(dbKey);
        const usernames = Object.values(chatUsernamesById);
        this.cache.addToCache(chatId, usernames);
        return usernames;
    }
    async deleteUser(chatId, userId) {
        const timeMark = `Delete user ${chatId} ${userId}`;
        console.time(timeMark);
        await this.db.hDel(this.convertId(chatId), this.convertId(userId));
        this.metrics.dbOpsCounter.inc({
            action: 'deleteUser',
        });
        console.timeEnd(timeMark);
    }
    removeTeam(chatId) {
        this.cache.removeFromCache(chatId);
    }
    convertId(id) {
        return `${id}`;
    }
}
