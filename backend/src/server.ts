import http from 'http'
import express from 'express'
import { gpsRouter } from './api/routes/gpsRoutes'
import { vehicleRouter } from './api/routes/vehicleRoutes'
import { authRouter } from './api/routes/authRoutes'
import { userRouter } from './api/routes/userRoutes'
import { connectRedis } from './infrastructure/cache/redisClient'
import { runMigrations } from './infrastructure/db/pgClient'
import { initSocketServer } from './infrastructure/websocket/socketServer'
import { createGpsCircuitBreaker } from './infrastructure/circuit-breaker/gpsCircuitBreaker'
import { IngestGpsUseCase } from './application/ingest-gps/IngestGpsUseCase'
import { PgGpsRepository } from './infrastructure/db/PgGpsRepository'
import { PgVehicleRepository } from './infrastructure/db/PgVehicleRepository'
import { PgAlertRepository } from './infrastructure/db/PgAlertRepository'

const PORT = process.env.PORT ?? 3001

async function bootstrap() {
  const app = express()
  app.use(express.json())

  app.use((_req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-user-id')
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS')
    next()
  })

  await connectRedis()
  await runMigrations()
  console.log('[DB] Migrations applied')

  const ingestUseCase = new IngestGpsUseCase(
    new PgGpsRepository(),
    new PgVehicleRepository(),
    new PgAlertRepository(),
  )
  createGpsCircuitBreaker(ingestUseCase)

  app.use('/api/auth', authRouter)
  app.use('/api/users', userRouter)
  app.use('/api/gps', gpsRouter)
  app.use('/api/vehicles', vehicleRouter)
  app.get('/health', (_req, res) => res.json({ status: 'ok' }))

  const httpServer = http.createServer(app)
  initSocketServer(httpServer)

  httpServer.listen(PORT, () => {
    console.log(`[Server] Running on http://localhost:${PORT}`)
  })
}

bootstrap().catch((err) => {
  console.error('[Server] Fatal error during startup:', err)
  process.exit(1)
})
