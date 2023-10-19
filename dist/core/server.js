import express from 'express';
export class Server {
    metrics;
    port;
    app;
    isListening = false;
    constructor(metrics, port) {
        this.metrics = metrics;
        this.port = port;
        if (!port)
            throw new Error('Incorrect port');
        this.app = express();
        this.app.get('/health', (req, res) => {
            res.send({
                status: 200,
            });
        });
        this.app.get('/metrics', async (req, res) => {
            const { contentType, metrics: metricsString } = await this.metrics.getMetrics();
            res.setHeader('Content-Type', contentType);
            res.send(metricsString);
        });
    }
    listen() {
        if (this.isListening)
            throw new Error('Double listen');
        this.isListening = true;
        this.app.listen(Number(this.port), () => {
            console.log(`[LAUNCH] Server is listening on port ${this.port}`);
        });
    }
}
