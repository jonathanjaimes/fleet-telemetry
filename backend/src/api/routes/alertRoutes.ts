import { Router } from 'express'
import { PgAlertRepository } from '../../infrastructure/db/PgAlertRepository'
import { PgVehicleRepository } from '../../infrastructure/db/PgVehicleRepository'
import { emitAlertResolved, emitVehicleStatus } from '../../infrastructure/websocket/socketServer'

export const alertRouter = Router()

const alertRepo   = new PgAlertRepository()
const vehicleRepo = new PgVehicleRepository()

alertRouter.get('/', async (_req, res) => {
  try {
    const alerts = await alertRepo.findAll()
    res.json(alerts.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })))
  } catch (err) {
    console.error('[Alerts] Error fetching alerts:', err)
    res.status(500).json({ error: 'Error al obtener alertas' })
  }
})

alertRouter.patch('/:id/resolve', async (req, res) => {
  const { id } = req.params
  try {
    const alerts = await alertRepo.findAll()
    const alert = alerts.find((a) => a.id === id)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada' })
    if (alert.resolved) return res.status(400).json({ error: 'La alerta ya fue resuelta' })

    await alertRepo.resolve(id)

    // Si la alerta era por ausencia de movimiento, el vehículo pasa a inactivo
    if (alert.type === 'VEHICLE_STOPPED') {
      const vehicle = await vehicleRepo.findById(alert.vehicle_id)
      if (vehicle && vehicle.status === 'alert') {
        await vehicleRepo.updateStatus(alert.vehicle_id, 'idle')
        emitVehicleStatus(alert.vehicle_id, 'idle')
      }
    }

    emitAlertResolved(id, alert.vehicle_id, alert.type)
    res.json({ ok: true })
  } catch (err) {
    console.error('[Alerts] Error resolving alert:', err)
    res.status(500).json({ error: 'Error al resolver alerta' })
  }
})
