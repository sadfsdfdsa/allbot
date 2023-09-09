const MAX_CACHE_SIZE = 1000;
const KEY_FOR_TIMESTAMP = 'TIMESTAMP';
export class UserRepository {
    db;
    cachedUsernames = new Array();
    constructor(db) {
        this.db = db;
        console.log('Init User repository');
    }
    // TODO improve tests
    async addUsers(chatId, users) {
        const usernamesById = {};
        users.forEach((user) => {
            if (!user.username || user.is_bot || this.cachedUsernames.includes(user.username))
                return;
            this.cachedUsernames.push(user.username);
            usernamesById[this.convertId(user.id)] = user.username;
        });
        if (this.cachedUsernames.length > MAX_CACHE_SIZE) {
            const needToRemove = MAX_CACHE_SIZE - this.cachedUsernames.length;
            const removed = this.cachedUsernames.splice(0, needToRemove);
            console.log('Remove users from cache', needToRemove, removed);
        }
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
        const chatUsernames = await this.db.hGetAll(this.convertId(chatId));
        console.timeEnd(timeMark);
        const date = new Date();
        this.db.hSet(KEY_FOR_TIMESTAMP, {
            [this.convertId(chatId)]: date.toLocaleString('ru-RU')
        }).catch(console.error);
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
