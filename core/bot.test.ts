import { Telegraf } from 'telegraf'
import { createBot } from './bot.js'

describe('bot', () => {
  describe('#createBot', () => {
    test('should throw error if not token passed', () => {
      expect(() => createBot(undefined)).toThrow()
    })

    test('should return instance of bot', () => {
      expect(createBot('123') instanceof Telegraf).toBeTruthy()
    })
  })
})
