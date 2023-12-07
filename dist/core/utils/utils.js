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
