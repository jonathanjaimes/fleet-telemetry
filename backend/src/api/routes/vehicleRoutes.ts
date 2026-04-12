import { Router } from 'express'
import type { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { PgVehicleRepository } from '../../infrastructure/db/PgVehicleRepository'
import { PgAlertRepository } from '../../infrastructure/db/PgAlertRepository'
import { DeleteVehicleUseCase } from '../../application/delete-vehicle/DeleteVehicleUseCase'
import { emitAlert, emitVehicleStatus, emitVehicleDeleted } from '../../infrastructure/websocket/socketServer'
import { setManualStop, clearManualStop, clearDeletedFlag, clearStoppedSince } from '../../infrastructure/cache/redisClient'

export const vehicleRouter = Router()

const vehicleRepo = new PgVehicleRepository()
const alertRepo   = new PgAlertRepository()
const deleteVehicleUseCase = new DeleteVehicleUseCase(vehicleRepo)

vehicleRouter.get('/', async (_req: Request, res: Response) => {
  const vehicles = await vehicleRepo.findAll()
  res.json(vehicles)
})

vehicleRouter.post('/:id/start', async (req: Request, res: Response) => {
  const vehicle_id = String(req.params.id)
  await clearManualStop(vehicle_id)
  await clearDeletedFlag(vehicle_id)
  await clearStoppedSince(vehicle_id)

  // Si el vehículo existe en DB, resetearlo a 'moving' para que el nuevo
  // viaje no herede un estado de alerta o detenido previo
  const existing = await vehicleRepo.findById(vehicle_id)
  if (existing) {
    await vehicleRepo.upsert({ ...existing, status: 'moving' })
    emitVehicleStatus(vehicle_id, 'moving')
  }

  res.json({ message: 'Vehicle trip started' })
})

vehicleRouter.post('/:id/stop', async (req: Request, res: Response) => {
  const vehicle_id = String(req.params.id)
  const existing = await vehicleRepo.findById(vehicle_id)
  if (!existing) {
    res.status(404).json({ error: 'Vehicle not found' })
    return
  }
  await vehicleRepo.upsert({ ...existing, status: 'stopped' })
  await setManualStop(vehicle_id)
  emitVehicleStatus(vehicle_id, 'stopped')
  res.json({ message: 'Vehicle marked as stopped' })
})

vehicleRouter.post('/:id/panic', async (req: Request, res: Response) => {
  const vehicle_id = String(req.params.id)
  const alert = {
    id: uuidv4(),
    vehicle_id,
    type: 'PANIC_BUTTON' as const,
    message: '🚨 Botón de pánico activado por el conductor',
    timestamp: new Date(),
  }
  await alertRepo.save(alert)
  await vehicleRepo.upsert({ id: vehicle_id, status: 'alert', lat: req.body.lat ?? 0, lng: req.body.lng ?? 0, lastSeen: new Date() })
  emitAlert(alert)
  emitVehicleStatus(vehicle_id, 'alert')
  res.status(201).json({ message: 'Panic alert registered' })
})

vehicleRouter.delete('/:id', async (req: Request, res: Response) => {
  const vehicle_id = String(req.params.id)
  const { deleted } = await deleteVehicleUseCase.execute(vehicle_id)
  if (!deleted) {
    res.status(404).json({ error: 'Vehicle not found' })
    return
  }
  emitVehicleDeleted(vehicle_id)
  res.json({ message: 'Vehicle deleted successfully' })
})
