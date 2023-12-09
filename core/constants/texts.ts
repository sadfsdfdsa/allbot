const EMPTY_TEXT = `⚠️ Error while parsing mention (see all with /mentions). Please use:\n`

export const NEW_MENTION_EXAMPLE = `<code>/add_to NEW_MENTION @user @user2</code>`

export const EMPTY_MENTION_TEXT = `${EMPTY_TEXT}<code>/mention some_existing_mention</code>`

export const EMPTY_DELETE_FROM_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_from MENTION @user @user2</code>`

export const EMPTY_DELETE_MENTION_TEXT = `${EMPTY_TEXT}<code>/delete_mention MENTION</code>`

export const NOT_EXISTED_MENTION_TEXT = `⚠️ Not existed or empty mention.
\nSee all via /mentions or create new one:\n${NEW_MENTION_EXAMPLE}`

export const CLEAN_UP_EMPTY_MENTION_TEXT = `🧹 This is an empty mention. We clean it up.`

export const DONATE_COMMAND_TEXT = `
🙌 This bot is free to use, but hosting and database are paid options for project. So, if you have opportunity to support, it will be very helpful! 🙌

1️⃣<strong>Support via USDT-TRC20: <code>TJyEa6p3HvAHz34gn7hZHYNwY65iHryu3w</code></strong>👈

2️⃣<strong>Support via USDT-ETH: <code>0x7f49e01c13fE782aEB06Dc35a37d357b955b67B0</code></strong>👈

3️⃣<strong>Support via BTC: <code>bc1qgmq6033fnte2ata8ku3zgvj0n302zvr9cexcng</code></strong>👈

Thank you for using and supporting us! ❤️
`

export const PRIVACY_COMMAND_TEXT = `
🔐 Are you concerned about your security and personal data? <strong>This is right!</strong>
✅ What do we use? Identifiers of your groups to store data about participants in them: usernames and identifiers to correctly call all users of the group.
✅ All data is transmitted only via encrypted channels and is not used for other purposes.
✅ We don't read your messages, don't log data about you in public systems and 3th party services except safe hosting and database.
🧑‍💻 You can view the project's codebase using Github -  https://github.com/sadfsdfdsa/allbot (also can Star or Fork the Bot project).
<strong>❗️ Be careful when using unfamiliar bots in your communication, it can be dangerous!</strong>
`

export const HELP_COMMAND_TEXT = `
<b>❔ How can I mention chat participants?</b>
You can mention all chat participants using "/all" or by mentioning "@all" anywhere in the message.
For example: <i>Wanna play some games @all?</i>.
Or you can use custom mentions, see cheat sheet below.

<b>❔ Why does the bot give out so many messages?</b>
Telegram has a limit on mentions - only 5 users receive notifications per message.

<b>❔ Why doesn't the bot mention me?</b>
Bot can only mention you after your first text message after the bot joins the group.

<b>❔ Why Bot add /donate to message?</b>
You can use bot for Free, but servers are paid, so you can also support project.
Bot adds /donate only for big groups - more than 10 people.

<b>❔ How mentions work for members in large (100+) groups?</b>
Telegram restrict messaging for Bots. So we can send only 20 messages at one time per group.
Also Telegram send Push only first 5 mentions in a message. So we must split all your group members by 5 and can send only 20 messages.
There is why we sending 19 messages with 5 mentions and one last big message with all other users. Last message users do not receive Pushes.
Please contact us in chat if you need that functionality.

<b>❔ Why Bot does not work inside Topics group?</b>
You should Promote it and permit "Manage Topics", or use Bot not in "Closed" Topic.

<b>❔ How to buy unlimited custom mentions?</b>
Try to add more than 3 mentions, click to button for pay link, then pay with fill your group name or contact us in chat https://t.me/allsuperior_chat.

<strong>👀 Commands:</strong>
/donate - help the project pay for servers 🫰
/privacy - info about personal data usage and codebase of the Bot 🔐

<strong>👀 Custom mentions cheat sheet:</strong>
<code>/mention TEAM_1</code> - mention part of your group
<code>/add_to TEAM_1 @user @user2</code> - add members to custom mention
<code>/delete_from TEAM_1 @user @user2</code> - delete members from custom mention
<code>/delete_mention TEAM_1</code> - delete entire custom mention
<code>/mentions</code> - see all of your customs mentions

🐛 <strong>Found a bug? Please, report it to us!</strong>

<strong>💬 Our chat:</strong>
⚡ Group with updates, for sending bug reports or feature requests - https://t.me/allsuperior_chat
`

export const ADDED_TO_CHAT_WELCOME_TEXT = `
👋 Hello everyone!
🤖 This is a bot to improve your experience, just like Slack or other instant messengers. 

You can mention /all chat participants with one command. 
Also you can create your own custom mentions and use them. For example <code>/mention frontend_dev</code>
See /help for more info about custom mentions.

❔ But remember that I add each person to the mention only after his first message after I joined, so if you don’t see yourself in my mentions, at least write '+' in this chat. Read more with /help.
✍️ You can help to improve the Bot by /donate for servers.
⚡ Want to see updates first, send feature request to the developers? Join the chat: https://t.me/allsuperior_chat !
`

export const INTRODUCE_CUSTOM_MENTIONS_TEXT = `
💥 <strong>Custom mentions</strong>

<i>Need custom tags for part of group members?</i>
<strong>Now it is available for all!</strong>

You can create up to <strong>3</strong> custom mentions, add and delete users from them (click to example for copying):

<code>/mention TEAM_1</code> - mention part of your group
<code>/add_to TEAM_1 @user @user2</code> - add members to custom mention
<code>/delete_from TEAM_1 @user @user2</code> - delete members from custom mention
<code>/delete_mention TEAM_1</code> - delete entire custom mention
<code>/mentions</code> - see all of your customs mentions

More info in /help and our chat https://t.me/allsuperior_chat. 

😎 <strong>Need more than 3? Unlimited Forever for 5$.</strong>
`
