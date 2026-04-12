import { Router } from 'express'
import { PgAlertRepository } from '../../infrastructure/db/PgAlertRepository'
import { PgVehicleRepository } from '../../infrastructure/db/PgVehicleRepository'
import { PgUserRepository } from '../../infrastructure/db/PgUserRepository'
import { PgRouteRepository } from '../../infrastructure/db/PgRouteRepository'
import { emitAlertResolved, emitVehicleStatus } from '../../infrastructure/websocket/socketServer'
import { setManualStop, clearStoppedSince } from '../../infrastructure/cache/redisClient'

export const alertRouter = Router()

const alertRepo   = new PgAlertRepository()
const vehicleRepo = new PgVehicleRepository()
const userRepo    = new PgUserRepository()
const routeRepo   = new PgRouteRepository()

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
  // El operador puede optar por finalizar el viaje al resolver la alerta
  const stopTrip = req.body?.stopTrip === true

  try {
    const result = await resolveUserAlerts(uniqueId)
    if (!result) return res.status(403).json({ error: 'Acceso no permitido' })

    const alert = result.alerts.find((a) => a.id === id)
    if (!alert) return res.status(404).json({ error: 'Alerta no encontrada o sin acceso' })
    if (alert.resolved) return res.status(400).json({ error: 'La alerta ya fue resuelta' })

    await alertRepo.resolve(id)

    // Determina nuevo estado del vehículo cuando no quedan alertas pendientes
    const remaining = (await alertRepo.findByVehicleIds([alert.vehicle_id]))
      .filter((a) => !a.resolved)

    if (remaining.length === 0) {
      const vehicle = await vehicleRepo.findById(alert.vehicle_id)
      if (vehicle && vehicle.status === 'alert') {
        if (stopTrip) {
          // El operador decidió finalizar el viaje explícitamente
          await vehicleRepo.updateStatus(alert.vehicle_id, 'stopped')
          await setManualStop(alert.vehicle_id)
          await clearStoppedSince(alert.vehicle_id)
          await routeRepo.endRoute(alert.vehicle_id)
          emitVehicleStatus(alert.vehicle_id, 'stopped')
        } else {
          // Sin finalizar viaje: pasa a idle y solo cierra ruta para VEHICLE_STOPPED
          await vehicleRepo.updateStatus(alert.vehicle_id, 'idle')
          emitVehicleStatus(alert.vehicle_id, 'idle')
          if (alert.type === 'VEHICLE_STOPPED') {
            await routeRepo.endRoute(alert.vehicle_id)
            // Reinicia el contador de inactividad para dar una ventana de 2 min
            // antes de que se pueda generar otra alerta de ausencia de movimiento
            await clearStoppedSince(alert.vehicle_id)
          }
        }
      }
    }

    emitAlertResolved(id, alert.vehicle_id, alert.type)
    res.json({ ok: true, stopped: stopTrip && remaining.length === 0 })
  } catch (err) {
    console.error('[Alerts] Error resolving alert:', err)
    res.status(500).json({ error: 'Error al resolver alerta' })
  }
})
