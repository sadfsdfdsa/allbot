import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js';
export class MentionRepository {
    db;
    metrics;
    cache;
    LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT;
    UNLIMITED_CHAT_IDS_ARR = [
    // -4059488811
    ];
    constructor(db, metrics, cache) {
        this.db = db;
        this.metrics = metrics;
        this.cache = cache;
        console.log('[LAUNCH] Init Mention repository', this.cache, this.metrics);
    }
    async checkIfMentionExists(chatId, mention) {
        const key = this.getKeyForMention(chatId);
        const isExists = await this.db.hExists(key, mention);
        this.metrics.dbOpsCounter.inc({
            action: 'checkIfMentionExists#hLen',
        });
        return isExists;
    }
    async addUsersToMention(chatId, mention, users) {
        const key = this.getKeyForMention(chatId);
        const alreadyInDb = await this.getUsersIdsByMention(chatId, mention);
        if (!alreadyInDb.length) {
            if (!this.UNLIMITED_CHAT_IDS_ARR.includes(chatId.toString())) {
                const count = await this.db.hLen(key);
                this.metrics.dbOpsCounter.inc({
                    action: 'addUsersToMention#hLen',
                });
                if (count >= this.LIMIT_FOR_GROUP) {
                    return false;
                }
            }
        }
        const newUsers = [...new Set([...alreadyInDb, ...users])];
        await this.db.hSet(key, mention, newUsers.join(' '));
        this.metrics.dbOpsCounter.inc({
            action: 'addUsersToMention#hSet',
        });
        return true;
    }
    /**
     * @returns true - all mention removed, false - only part
     */
    async deleteUsersFromMention(chatId, mention, usersIdsToDelete) {
        const alreadyInDb = await this.getUsersIdsByMention(chatId, mention);
        const filteredUsers = alreadyInDb.filter((user) => !usersIdsToDelete.includes(user));
        const key = this.getKeyForMention(chatId);
        if (!filteredUsers.length) {
            await this.deleteMention(chatId, mention);
            return true;
        }
        await this.db.hSet(key, mention, filteredUsers.join(' '));
        this.metrics.dbOpsCounter.inc({
            action: 'deleteUsersFromMention',
        });
        return false;
    }
    async deleteMention(chatId, mention) {
        const key = this.getKeyForMention(chatId);
        const deleted = await this.db.hDel(key, mention);
        this.metrics.dbOpsCounter.inc({
            action: 'deleteMention',
        });
        if (!deleted)
            return false;
        return true;
    }
    async getGroupMentions(chatId) {
        const key = this.getKeyForMention(chatId);
        const data = await this.db.hGetAll(key);
        this.metrics.dbOpsCounter.inc({
            action: 'getGroupMentions',
        });
        const newData = {};
        for (const key in data) {
            newData[key] = data[key].split(' ').filter((value) => value.length).length;
        }
        return newData;
    }
    async getUsersIdsByMention(chatId, mention) {
        const str = await this.getUsersUnparsedByMention(chatId, mention);
        const alreadyUsers = str?.split(' ').filter((value) => value.length) ?? [];
        return alreadyUsers;
    }
    getUsersUnparsedByMention(chatId, mention) {
        const key = this.getKeyForMention(chatId);
        this.metrics.dbOpsCounter.inc({
            action: 'getUsersUnparsedByMention',
        });
        return this.db.hGet(key, mention);
    }
    getKeyForMention(chatId) {
        return `${chatId}.mentions`;
    }
}
