import { ALL_MEMBERS_SETTINGS_TEXT, ONLY_ADMIN_SETTINGS_TEXT, } from '../constants/texts.js';
export const isChatGroup = (chatId) => {
    return chatId < 0;
};
export const getMentionsFromEntities = (text, entities) => {
    const mentions = [];
    entities?.forEach((entity) => {
        if (entity.type !== 'mention')
            return;
        const mention = text.slice(entity.offset + 1, entity.offset + entity.length);
        mentions.push(mention);
    });
    return mentions;
};
export const matchMentionsToUsers = (mentions, reversedUsers) => {
    const ids = [];
    const successMentions = [];
    const missedMentions = [];
    mentions.forEach((mention) => {
        if (!reversedUsers[mention]) {
            missedMentions.push('@' + mention);
            return;
        }
        ids.push(reversedUsers[mention]);
        successMentions.push('@' + mention);
    });
    return {
        successIds: ids,
        successMentions,
        missedMentions,
    };
};
export const createSettingsKeyboard = (settings) => {
    const ucm = {
        ...settings,
        s: 'ucm',
    };
    const customMentionBtn = {
        callback_data: `/settings_${JSON.stringify(ucm)}`,
        text: `Use custom mentions: ${settings.ucm ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT} `,
    };
    const ccm = {
        ...settings,
        s: 'ccm',
    };
    const crudCustomMentionBtn = {
        callback_data: `/settings_${JSON.stringify(ccm)}`,
        text: `Edit/create/delete custom mentions: ${settings.ccm ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT} `,
    };
    const uam = {
        ...settings,
        s: 'uam',
    };
    const allMentionBtn = {
        callback_data: `/settings_${JSON.stringify(uam)}`,
        text: `Use mention @all: ${settings.uam ? ONLY_ADMIN_SETTINGS_TEXT : ALL_MEMBERS_SETTINGS_TEXT} `,
    };
    return [[allMentionBtn], [customMentionBtn], [crudCustomMentionBtn]];
};
