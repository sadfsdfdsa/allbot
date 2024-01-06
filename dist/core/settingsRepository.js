const map = {
    ccm: 'crudCustomMention',
    uam: 'useAllMention',
    ucm: 'useCustomMention',
};
export class SettingsRepository {
    db;
    metrics;
    constructor(db, metrics) {
        this.db = db;
        this.metrics = metrics;
        console.log('[LAUNCH] Init Settings repository');
    }
    async updateSettings(chatId, setting, value) {
        await this.db.hSet(this.getKey(chatId), map[setting], `${value}`);
        this.metrics.settingsCounter.inc({
            chatId: chatId,
            action: `updateSettings.${map[setting]}`,
        });
        this.metrics.dbOpsCounter.inc({
            action: 'updateSettings#hSet',
        });
    }
    async getSettingsCompressed(chatId) {
        const settings = await this.db.hGetAll(this.getKey(chatId));
        this.metrics.dbOpsCounter.inc({
            action: 'getSettingsCompressed#hGetAll',
        });
        return {
            ccm: settings[map.ccm] === 'true',
            uam: settings[map.uam] === 'true',
            ucm: settings[map.ucm] === 'true',
        };
    }
    async getSettings(chatId) {
        const settings = await this.db.hGetAll(this.getKey(chatId));
        this.metrics.dbOpsCounter.inc({
            action: 'getSettings#hGetAll',
        });
        return {
            [map.ccm]: settings[map.ccm] === 'true',
            [map.uam]: settings[map.uam] === 'true',
            [map.ucm]: settings[map.ucm] === 'true',
        };
    }
    getKey(chatId) {
        return `${chatId}.settings`;
    }
}
