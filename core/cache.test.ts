import { mock } from 'jest-mock-extended'
import { CacheService } from './cache'
import { MetricsService } from './metrics'
import { createDB } from './db'

const clientMock = mock<Awaited<ReturnType<typeof createDB>>>()

const metricsService = new MetricsService(clientMock, false)

describe('CacheService', () => {
  describe('#addToCache', () => {
    test('should correct add unique values', async () => {
      const instance = new CacheService(metricsService, 10)

      const first = instance.addToCache(['test'])
      const second = instance.addToCache(['test'])

      expect(first).toBe(1)
      expect(second).toBe(1)
    })
  })

  describe('#isInCache', () => {
    test('should correct check is in cache', async () => {
      const instance = new CacheService(metricsService, 10)

      instance.addToCache(['test', 'test2', 'test'])

      const res1 = instance.isInCache('test')
      const res2 = instance.isInCache('test2')
      const res3 = instance.isInCache('test3')

      expect(res1).toBe(true)
      expect(res2).toBe(true)
      expect(res3).toBe(false)
    })
  })

  describe('#tryClearCache', () => {
    test('should clear cache if size more than MAX_CACHE_SIZE', async () => {
      const instance = new CacheService(metricsService, 2)

      instance.addToCache(['test', 'test2', 'test3'])

      instance.tryClearCache()

      const res1 = instance.isInCache('test')
      const res2 = instance.isInCache('test2')
      const res3 = instance.isInCache('test3')

      expect(res1).toBe(false)
      expect(res2).toBe(false)
      expect(res3).toBe(false)
    })
  })
})
