import { CUSTOM_MENTIONS_PER_GROUP_LIMIT, TELEGRAM_STARS_PRICE } from "./limits.js"

const EMPTY_TEXT = `⚠️ Error while parsing mention (see all with /mention). Please use:\n`

export const NEW_MENTION_EXAMPLE = `<code>/add_to NEW_MENTION @user @user2</code>`

export const EMPTY_MENTION_TEXT = `${EMPTY_TEXT}<code>/mention some_existing_mention</code>`

export const EMPTY_DELETE_FROM_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_from MENTION @user @user2</code>`

export const EMPTY_DELETE_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_mention MENTION</code>`

export const NOT_EXISTED_MENTION_TEXT = `⚠️ Not existed or empty mention.
\nSee all via /mention or create new one:\n${NEW_MENTION_EXAMPLE}`

export const CLEAN_UP_EMPTY_MENTION_TEXT = `🧹 This is an empty mention. We clean it up.`

const CUSTOM_MENTIONS_CHEATSHEET = `<code>/add_to TEAM_1 @user @user2</code> - add members to custom mention
<code>Your message @TEAM_1</code> - instant tag without any commands inside the text
<code>/mention TEAM_1</code> - mention part of your group
<code>/mention</code> - see all of your custom mentions
<code>/delete_from TEAM_1 @user @user2</code> - delete members from custom mention
<code>/delete_mention TEAM_1</code> - delete entire custom mention`

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

/settings - change settings to enable/disable mentions for users without administrator rights ⚙️

<strong>👀 Custom mentions cheat sheet:</strong>
${CUSTOM_MENTIONS_CHEATSHEET}

🐛 <strong>Found a bug? Please, report it to us!</strong>

<strong>💬 Our chat:</strong>
⚡ Group with updates, for sending bug reports or feature requests - https://t.me/allsuperior_chat
`

export const ADDED_TO_CHAT_WELCOME_TEXT = `
👋 Hello everyone!
🤖 This is a bot to improve your chatting experience, just like Slack or other team messengers. 

1. You can mention /all (or tag <code>@all</code>) chat participants with one command. 
2. Also you can create your own custom mentions and use them. For example <code>Hello, @frontend_dev</code>

❗️ But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write <code>+</code> in this chat. Read more with /help.

⚡ Want to see updates first or send feature request to the developers? Join the chat: https://t.me/allsuperior_chat !
`

export const INTRODUCE_CUSTOM_MENTIONS_TEXT = `
💥 <strong>Custom mentions</strong>

<i>Need custom tags for part of group members?</i>
<strong>Now it is available for all!</strong>

You can create custom mentions, add and delete users from them (click to example for copying):

${CUSTOM_MENTIONS_CHEATSHEET}

More info in /help and our chat https://t.me/allsuperior_chat. 
`

export const ALREADY_UNLIMITED = `
😎 <strong>You have unlimited mentions, thank you for buying!</strong>
`

export const NEED_TO_BUY_UNLIMITED = `
⭐️ <strong>You can use up to ${CUSTOM_MENTIONS_PER_GROUP_LIMIT}, need more? Buy Unlimited Forever for ${TELEGRAM_STARS_PRICE} Telegram Stars.</strong>
`

export const SETTINGS_TEXT = `⚙️ <strong>Settings (can be edited only by group admins):</strong>`

export const ONLY_ADMIN_SETTINGS_TEXT = '🛑 Only admins'
export const ALL_MEMBERS_SETTINGS_TEXT = '✅ All members'

export const ONLY_ADMIN_ACTION_TEXT = `
<strong>🛑 Action can be performed only by admins</strong> (/settings for changing)
`

export const GET_MENTIONS_TEXT = `🫂 Custom mentions in the group:

⚡ Now you can write like this: <code>Hi @custom_mention!</code>`
