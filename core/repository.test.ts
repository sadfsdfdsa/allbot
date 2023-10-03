import { mock } from 'jest-mock-extended'
import type { RedisClientType } from 'redis'
import { UserRepository } from './repository.js'
import { User } from 'telegraf/types'
import { CacheService } from './cache.js'
import { MetricsService } from './metrics.js'

describe('repository', () => {
  let dbMock = mock<RedisClientType<any, any, any>>()
  let metricsMock = mock<MetricsService>()
  let cacheMock = mock<CacheService>()

  beforeEach(() => {
    dbMock = mock<RedisClientType<any, any, any>>()
    metricsMock = mock<MetricsService>()
    cacheMock = mock<CacheService>()
  })

  describe('#addUsers', () => {
    test('should add correct users and filter bots', async () => {
      const instance = new UserRepository(dbMock, metricsMock, cacheMock)

      const chatId = 1
      const userOne = mock<User>({
        id: 1,
        username: 'test_username',
        is_bot: false,
      })

      const userTwo = mock<User>({
        id: 2,
        username: 'test_username_2',
        is_bot: false,
      })

      const users: User[] = [
        mock<User>({ username: undefined }),
        mock<User>({ is_bot: true }),
        userOne,
        userTwo,
      ]

      await instance.addUsers(chatId, users)

      expect(dbMock.hSet).toBeCalledWith(chatId.toString(), {
        [userOne.id.toString()]: userOne.username,
        [userTwo.id.toString()]: userTwo.username,
      })
    })
  })

  describe('#getUsernamesByChatId', () => {
    test('should correct call db and return data', async () => {
      const instance = new UserRepository(dbMock, metricsMock, cacheMock)

      const data = {
        id1: 'username1',
        id2: 'username2',
      }
      dbMock.hGetAll.mockResolvedValue(data)
      dbMock.hSet.mockResolvedValue(0)
      const chatId = 1

      const result = await instance.getUsernamesByChatId(chatId)

      expect(dbMock.hGetAll).toBeCalledWith(chatId.toString())
      expect(result).toStrictEqual(Object.values(data))
    })
  })

  describe('#deleteUser', () => {
    test('should correct call db for user removing', async () => {
      const instance = new UserRepository(dbMock, metricsMock, cacheMock)

      const userId = 2
      const chatId = 1

      await instance.deleteUser(chatId, userId)

      expect(dbMock.hDel).toBeCalledWith(chatId.toString(), userId.toString())
    })
  })
})
