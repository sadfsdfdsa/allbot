const EMPTY_TEXT = `⚠️ Error while parsing mention (see all with /mention). Please use:\n`;
export const NEW_MENTION_EXAMPLE = `<code>/add_to NEW_MENTION @user @user2</code>`;
export const EMPTY_MENTION_TEXT = `${EMPTY_TEXT}<code>/mention some_existing_mention</code>`;
export const EMPTY_DELETE_FROM_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_from MENTION @user @user2</code>`;
export const EMPTY_DELETE_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_mention MENTION</code>`;
export const NOT_EXISTED_MENTION_TEXT = `⚠️ Not existed or empty mention.
\nSee all via /mention or create new one:\n${NEW_MENTION_EXAMPLE}`;
export const CLEAN_UP_EMPTY_MENTION_TEXT = `🧹 This is an empty mention. We clean it up.`;
export const DONATE_COMMAND_TEXT = `
🙌 This bot is free to use, but hosting and database are paid options for project. So, if you have opportunity to support, it will be very helpful! 🙌

1️⃣<strong>Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code></strong>👈

2️⃣<strong>Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code></strong>👈

3️⃣<strong>Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code></strong>👈

Thank you for using and supporting us! ❤️
`;
export const PRIVACY_COMMAND_TEXT = `
🔐 Are you concerned about your security and personal data? <strong>This is right!</strong>
✅ What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
✅ All data is transmitted only via encrypted channels and is not used for other purposes.
✅ We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
🧑‍💻 You can view the project's codebase using Github -  https://github.com/sadfsdfdsa/allbot (also can Star or Fork the Bot project).
<strong>❗️ Be careful when using unfamiliar bots in your communication, it can be dangerous!</strong>
`;
const CUSTOM_MENTIONS_CHEATSHEET = `<code>/add_to TEAM_1 @user @user2</code> - add members to custom mention
<code>Your message @TEAM_1</code> - instant tag without any commands inside the text
<code>/mention TEAM_1</code> - mention part of your group
<code>/mention</code> - see all of your custom mentions
<code>/delete_from TEAM_1 @user @user2</code> - delete members from custom mention
<code>/delete_mention TEAM_1</code> - delete entire custom mention`;
export const HELP_COMMAND_TEXT = `
<b>❔ How can I mention chat participants?</b>
You can mention all chat participants using /all or by mentioning <code>@all</code> anywhere in the message.
For example: <i>Wanna play some games @all?</i>.
Or you can use <u>custom mentions</u>, see cheat sheet below.

<b>❔ Why does the bot give out so many messages?</b>
Telegram has a limit on mentions - only 5 users receive notifications per message.

<b>❔ Why doesn't the bot mention me?</b>
Bot can only mention you after your first text message after the bot joins the group.

<b>❔ Why Bot does not work inside Topics group?</b>
You should Promote it and permit "Manage Topics", or use Bot not in "Closed" Topic.

<b>❔ How to buy unlimited custom mentions?</b>
Try to add more than 3 mentions, click to button for pay link, then pay with fill your group name or contact us in chat https://t.me/allsuperior_chat.

<strong>👀 Commands:</strong>
/settings - change settings to enable/disable mentions for users without administrator rights ⚙️
/donate - help the project pay for servers 🫰
/privacy - info about personal data usage and codebase of the Bot 🔐

<strong>👀 Custom mentions cheat sheet:</strong>
${CUSTOM_MENTIONS_CHEATSHEET}

🐛 <strong>Found a bug? Please, report it to us!</strong>

<strong>💬 Our chat:</strong>
⚡ Group with updates, for sending bug reports or feature requests - https://t.me/allsuperior_chat
`;
export const ADDED_TO_CHAT_WELCOME_TEXT = `
👋 Hello everyone!
🤖 This is a bot to improve your chatting experience, just like Slack or other team messengers. 

1. You can mention /all (or tag <code>@all</code>) chat participants with one command. 
2. Also you can create your own custom mentions and use them. For example <code>Hello, @frontend_dev</code>

❗️ But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write <code>+</code> in this chat. Read more with /help.

⚡ Want to see updates first or send feature request to the developers? Join the chat: https://t.me/allsuperior_chat !
`;
export const INTRODUCE_CUSTOM_MENTIONS_TEXT = `
💥 <strong>Custom mentions</strong>

<i>Need custom tags for part of group members?</i>
<strong>Now it is available for all!</strong>

You can create up to <strong>3</strong> custom mentions, add and delete users from them (click to example for copying):

${CUSTOM_MENTIONS_CHEATSHEET}

More info in /help and our chat https://t.me/allsuperior_chat. 
`;
export const ALREADY_UNLIMITED = `
😎 <strong>You have unlimited mentions, thank you for buying!</strong>
`;
export const NEED_TO_BUY_UNLIMITED = `
😎 <strong>Need more than 3? Unlimited Forever for 5$.</strong>
`;
export const SETTINGS_TEXT = `⚙️ <strong>Settings (can be edited only by group admins):</strong>`;
export const ONLY_ADMIN_SETTINGS_TEXT = '🛑 Only admins';
export const ALL_MEMBERS_SETTINGS_TEXT = '✅ All members';
export const ONLY_ADMIN_ACTION_TEXT = `
<strong>🛑 Action can be performed only by admins</strong> (/settings for changing)
`;
export const GET_MENTIONS_TEXT = `🫂 Custom mentions in the group:

⚡ Now you can write like this: <code>Hi @custom_mention!</code>`;
