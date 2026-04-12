import { Router } from 'express'
import { PgAlertRepository } from '../../infrastructure/db/PgAlertRepository'
import { PgVehicleRepository } from '../../infrastructure/db/PgVehicleRepository'
import { PgUserRepository } from '../../infrastructure/db/PgUserRepository'
import { emitAlertResolved, emitVehicleStatus } from '../../infrastructure/websocket/socketServer'

export const alertRouter = Router()

const alertRepo   = new PgAlertRepository()
const vehicleRepo = new PgVehicleRepository()
const userRepo    = new PgUserRepository()

async function resolveUserAlerts(uniqueId: string) {
  const user = await userRepo.findByUniqueId(uniqueId)
  if (!user) return null
  if (user.role === 'superadmin') {
    return { user, alerts: await alertRepo.findAll() }
  }
  if (user.role === 'fleet') {
    const drivers = await userRepo.findByCreator(user.id)
    const driverIds = drivers.map((d) => d.unique_id)
    return { user, alerts: await alertRepo.findByVehicleIds(driverIds), driverIds }
  }
  return null
}

alertRouter.get('/', async (req, res) => {
  const uniqueId = req.headers['x-user-id'] as string
  if (!uniqueId) return res.status(401).json({ error: 'No autorizado' })

  try {
    const result = await resolveUserAlerts(uniqueId)
    if (!result) return res.status(403).json({ error: 'Acceso no permitido' })
    res.json(result.alerts.map((a) => ({ ...a, timestamp: a.timestamp.toISOString() })))
  } catch (err) {
    console.error('[Alerts] Error fetching alerts:', err)
    res.status(500).json({ error: 'Error al obtener alertas' })
  }
})

alertRouter.patch('/:id/resolve', async (req, res) => {
  const uniqueId = req.headers['x-user-id'] as string
  if (!uniqueId) return res.status(401).json({ error: 'No autorizado' })

  const { id } = req.params
  try {
    const result = await resolveUserAlerts(uniqueId)
    if (!result) return res.status(403).json({ error: 'Acceso no permitido' })

    const alert = result.alerts.find((a) => a.id === id)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada o sin acceso' })
    if (alert.resolved) return res.status(400).json({ error: 'La alerta ya fue resuelta' })

    await alertRepo.resolve(id)

    // Si no quedan más alertas sin resolver para este vehículo, pasa a idle
    const remaining = (await alertRepo.findByVehicleIds([alert.vehicle_id]))
      .filter((a) => !a.resolved)
    if (remaining.length === 0) {
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
