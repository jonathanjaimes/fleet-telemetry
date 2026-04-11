import type { Request, Response, NextFunction } from 'express'
import { isValidGpsReading } from '../../domain/entities/GpsReading'

export function validateGpsReading(req: Request, res: Response, next: NextFunction): void {
  const body = { ...req.body, timestamp: req.body.timestamp ?? new Date().toISOString() }

  if (!isValidGpsReading(body)) {
    res.status(400).json({
      error: 'Invalid GPS payload',
      expected: { vehicle_id: 'string', lat: 'number (-90 to 90)', lng: 'number (-180 to 180)', timestamp: 'ISO string' },
    })
    return
  }

  req.body = body
  next()
}
