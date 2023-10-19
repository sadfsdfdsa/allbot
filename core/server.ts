import express from 'express'
import { MetricsService } from './metrics.js'

export class Server {
  private app: ReturnType<typeof express>

  private isListening = false

  constructor(
    private readonly metrics: MetricsService,
    private readonly port: string | undefined
  ) {
    if (!port) throw new Error('Incorrect port')

    this.app = express()

    this.app.get('/health', (req, res) => {
      res.send({
        status: 200,
      })
    })

    this.app.get('/metrics', async (req, res) => {
      const { contentType, metrics: metricsString } =
        await this.metrics.getMetrics()

      res.setHeader('Content-Type', contentType)
      res.send(metricsString)
    })
  }

  public listen(): void {
    if (this.isListening) throw new Error('Double listen')

    this.isListening = true

    this.app.listen(Number(this.port), () => {
      console.log(`[LAUNCH] Server is listening on port ${this.port}`)
    })
  }
}
