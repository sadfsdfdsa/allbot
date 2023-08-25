import { Telegraf } from 'telegraf'

export const createBot = (token?: string) => {
  console.log('Starting bot')

  if (!token) {
    throw new Error('No tg token set')
  }
  const bot = new Telegraf(token)

  return bot
}
