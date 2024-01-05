import { CUSTOM_MENTIONS_PER_GROUP_LIMIT } from './constants/limits.js';
export class PaymentsRepository {
    mentionsLimitsPerGroup = {};
    LIMIT_FOR_GROUP = CUSTOM_MENTIONS_PER_GROUP_LIMIT;
    constructor(envString) {
        if (!envString)
            return;
        const parsed = envString.split(';');
        parsed.forEach((teamWithLimit) => {
            const [groupId, limit] = teamWithLimit.split('=');
            const finalLimit = limit === 'unlimited' ? limit : Number(limit);
            this.mentionsLimitsPerGroup[Number(groupId)] = finalLimit;
        });
        console.log('[LAUNCH] Init payments repository', this.mentionsLimitsPerGroup);
    }
    getHasGroupUnlimited(chatId) {
        return this.mentionsLimitsPerGroup[chatId.toString()] === 'unlimited';
    }
    getLimitByChatId(chatId) {
        return (this.mentionsLimitsPerGroup[chatId.toString()] ?? this.LIMIT_FOR_GROUP);
    }
}
