import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js';
const LIMITS_TABLE_NAME = 'SYSTEM_GROUPS_LIMITS';
export class PaymentsRepository {
    db;
    metrics;
    mentionsLimitsPerGroup = {};
    LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT;
    constructor(db, metrics) {
        this.db = db;
        this.metrics = metrics;
        console.log('[LAUNCH] Init payments repository');
    }
    async loadLimits() {
        const parsed = await this.db.hGetAll(LIMITS_TABLE_NAME);
        this.metrics.dbOpsCounter.inc({
            action: 'payments.loadLimits',
        });
        Object.entries(parsed).forEach(([chatId, limit]) => {
            const finalLimit = limit === 'unlimited' ? limit : Number(limit);
            this.mentionsLimitsPerGroup[Number(chatId)] = finalLimit;
        });
        console.log('[LAUNCH] Init payments limits for groups', this.mentionsLimitsPerGroup);
    }
    async setGroupLimit(chatId, limit) {
        await this.db.hSet(LIMITS_TABLE_NAME, chatId.toString(), limit.toString());
        this.mentionsLimitsPerGroup[chatId] = limit;
        this.metrics.dbOpsCounter.inc({
            action: 'payments.setGroupLimit',
        });
    }
    getPayloadForInvoice(chatId) {
        return `invoice:${chatId}`;
    }
    getParsedChatFromInvoicePayload(payload) {
        const [, chatId] = payload.split(':');
        return Number.parseInt(chatId);
    }
    getHasGroupUnlimited(chatId) {
        return this.mentionsLimitsPerGroup[chatId] === 'unlimited';
    }
    getLimitByChatId(chatId) {
        return this.mentionsLimitsPerGroup[chatId] ?? this.LIMIT_FOR_GROUP;
    }
    getGroupsWithUnlimited() {
        return Object.keys(this.mentionsLimitsPerGroup).map(Number);
    }
}
