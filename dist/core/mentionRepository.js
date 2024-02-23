export class MentionRepository {
    db;
    metrics;
    paymentsRepository;
    mentionsByChatId = {};
    constructor(db, metrics, paymentsRepository) {
        this.db = db;
        this.metrics = metrics;
        this.paymentsRepository = paymentsRepository;
        console.log('[LAUNCH] Init Mention repository');
    }
    async loadMentionsForInstantMentions() {
        const unlimitedChatIds = this.paymentsRepository.getGroupsWithUnlimited();
        const promises = unlimitedChatIds.map(async (chatId) => {
            const mentions = await this.getGroupMentions(chatId);
            this.mentionsByChatId[chatId] = new Set(Object.keys(mentions));
        });
        await Promise.all(promises);
        console.log('[LAUNCH] Mentions loaded for chats', Object.keys(this.mentionsByChatId));
    }
    getMentionForMsg(chatId, msg) {
        if (!this.mentionsByChatId[chatId])
            return undefined;
        const mentions = [...this.mentionsByChatId[chatId]];
        return mentions.find((item) => msg.includes(`@${item}`));
    }
    async checkIfMentionExists(chatId, mention) {
        const key = this.getKeyForMention(chatId);
        const isExists = await this.db.hExists(key, mention);
        this.metrics.dbOpsCounter.inc({
            action: 'checkIfMentionExists#hExists',
        });
        return isExists;
    }
    async addUsersToMention(chatId, mention, users) {
        const key = this.getKeyForMention(chatId);
        const alreadyInDb = await this.getUsersIdsByMention(chatId, mention);
        if (!alreadyInDb.length) {
            const LIMIT = this.paymentsRepository.getLimitByChatId(chatId);
            console.log('[mentionRepository.limit] Check limit', LIMIT, chatId);
            if (LIMIT !== 'unlimited') {
                const count = await this.db.hLen(key);
                this.metrics.dbOpsCounter.inc({
                    action: 'addUsersToMention#hLen',
                });
                if (count >= LIMIT) {
                    return false;
                }
            }
        }
        const newUsers = [...new Set([...alreadyInDb, ...users])];
        await this.db.hSet(key, mention, newUsers.join(' '));
        this.metrics.dbOpsCounter.inc({
            action: 'addUsersToMention#hSet',
        });
        this.mentionsByChatId[chatId].add(mention);
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
        this.mentionsByChatId[chatId].delete(mention);
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
