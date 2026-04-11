import { Router } from 'express'
import type { Request, Response } from 'express'
import { validateGpsReading } from '../middleware/validateGpsReading'
import { getBreaker } from '../../infrastructure/circuit-breaker/gpsCircuitBreaker'
import type { GpsReading } from '../../domain/entities/GpsReading'

export const gpsRouter = Router()

gpsRouter.post('/ingest', validateGpsReading, async (req: Request, res: Response) => {
  const reading: GpsReading = {
    vehicle_id: req.body.vehicle_id,
    lat: req.body.lat,
    lng: req.body.lng,
    timestamp: new Date(req.body.timestamp),
  }

  const breaker = getBreaker()
  if (!breaker) {
    res.status(503).json({ error: 'Service not initialized' })
    return
  }

  const result = await breaker.fire(reading) as { status: string }

  if (result.status === 'duplicate') {
    res.status(409).json({ message: 'Duplicate reading ignored' })
    return
  }

  res.status(201).json({ message: 'Reading accepted', status: result.status })
})
