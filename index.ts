import { Telegraf } from 'telegraf'
import { message } from 'telegraf/filters'
import { createClient } from 'redis'
import 'dotenv/config'

if (!process.env.REDIS_URI) {
  throw new Error('No redis URI set')
}

console.log('Starting redis')

const client = createClient({
  url: process.env.REDIS_URI,
})

client.on('error', function (err) {
  throw err
})

await client.connect()

console.log('Starting bot')

if (!process.env.TG_TOKEN) {
  throw new Error('No tg token set')
}
const bot = new Telegraf(process.env.TG_TOKEN)

const NAME = '@allsuperior_bot'
const ALL_COMMANDS = ['@all', '/all', NAME]

bot.on(message('text'), async (ctx) => {
  const fromUsername = ctx.message.from.username

  if (fromUsername && !ctx.message.from.is_bot) {
    await client.hSet(`${ctx.chat.id}`, {
      [ctx.message.from.id]: fromUsername,
    })
  }

  const isCallAll = ALL_COMMANDS.some((command) =>
    ctx.message.text.includes(command)
  )

  console.log(`Message, should reply=${isCallAll}`, ctx.message)

  if (!isCallAll) return

  const chatUsernames = await client.hGetAll(`${ctx.chat.id}`)
  if (!Object.values(chatUsernames).length) return

  const str = Object.values(chatUsernames).map((username) => `@${username} `)

  ctx.reply(`All from ${fromUsername}: ${str}`, {
    reply_to_message_id: ctx.message.message_id,
  })
})

bot.on(message('new_chat_members'), async (ctx) => {
  const usernames: Record<number, string> = {}

  ctx.message.new_chat_members.forEach((user) => {
    if (!user.username || user.is_bot) return

    usernames[`${user.id}`] = user.username
  })

  console.log('Add users', usernames)

  await client.hSet(`${ctx.chat.id}`, usernames)
})

bot.on(message('left_chat_member'), async (ctx) => {
  console.log('Delete user', ctx.message.left_chat_member.username)

  await client.hDel(`${ctx.chat.id}`, `${ctx.message.left_chat_member.id}`)
})

bot.launch()

// Enable graceful stop
process.once('SIGINT', () => bot.stop('SIGINT'))
process.once('SIGTERM', () => bot.stop('SIGTERM'))
