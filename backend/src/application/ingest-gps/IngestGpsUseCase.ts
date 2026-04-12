import { v4 as uuidv4 } from 'uuid'
import type { GpsReading } from '../../domain/entities/GpsReading'
import { buildDuplicateKey } from '../../domain/entities/GpsReading'
import { isSamePosition, STOPPED_THRESHOLD_MS, ALERT_THRESHOLD_MS } from '../../domain/entities/Vehicle'
import type { IGpsRepository } from '../../domain/repositories/IGpsRepository'
import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import type { IAlertRepository } from '../../domain/repositories/IAlertRepository'
import {
  isDuplicate,
  cacheVehiclePosition,
  getCachedVehiclePosition,
  isManualStop,
  clearManualStop,
  isDeletedFlag,
  getStoppedSince,
  setStoppedSince,
  clearStoppedSince,
} from '../../infrastructure/cache/redisClient'
import { emitGpsUpdate, emitVehicleStatus, emitAlert } from '../../infrastructure/websocket/socketServer'

export interface IngestGpsResult {
  status: 'accepted' | 'duplicate'
}

export class IngestGpsUseCase {
  constructor(
    private readonly gpsRepo: IGpsRepository,
    private readonly vehicleRepo: IVehicleRepository,
    private readonly alertRepo: IAlertRepository,
  ) {}

  async execute(reading: GpsReading): Promise<IngestGpsResult> {
    if (await isDeletedFlag(reading.vehicle_id)) {
      return { status: 'duplicate' }
    }

    const dupKey = buildDuplicateKey(reading)
    if (await isDuplicate(dupKey)) {
      return { status: 'duplicate' }
    }

    await this.gpsRepo.save(reading)
    await cacheVehiclePosition(reading.vehicle_id, reading.lat, reading.lng, reading.timestamp)

    const existing = await this.vehicleRepo.findById(reading.vehicle_id)
    let newStatus: 'moving' | 'idle' | 'stopped' | 'alert' = 'moving'

    // Si el conductor acaba de detener el viaje manualmente, ignorar
    // paquetes GPS tardíos que podrían pisar el estado "stopped".
    const manuallyStop = await isManualStop(reading.vehicle_id)
    if (manuallyStop) {
      emitGpsUpdate(reading)
      return { status: 'accepted' }
    }

    if (existing) {
      if (isSamePosition(existing, reading)) {
        // Mismo lugar: registrar cuándo empezó la quietud (si no está registrado)
        let stoppedSince = await getStoppedSince(reading.vehicle_id)
        if (!stoppedSince) {
          stoppedSince = reading.timestamp
          await setStoppedSince(reading.vehicle_id, stoppedSince)
        }

        const quietMs = reading.timestamp.getTime() - stoppedSince.getTime()

        if (quietMs >= ALERT_THRESHOLD_MS) {
          // Más de 2 min quieto sin finalizar el viaje → alerta
          if (existing.status !== 'alert') {
            const lastMovement = stoppedSince.toLocaleString('es-CO', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit', second: '2-digit',
            })
            const alert = {
              id: uuidv4(),
              vehicle_id: reading.vehicle_id,
              type: 'VEHICLE_STOPPED' as const,
              message: `Vehículo sin movimiento desde las ${lastMovement}`,
              timestamp: reading.timestamp,
            }
            await this.alertRepo.save(alert)
            emitAlert(alert)
          }
          newStatus = 'alert'
        } else if (quietMs >= STOPPED_THRESHOLD_MS) {
          // Entre 30s y 2min quieto → idle (sin alerta, viaje sigue activo)
          newStatus = existing.status === 'alert' ? 'alert' : 'idle'
        } else {
          // Menos de 30s → mantener estado actual
          newStatus = existing.status === 'alert' ? 'alert' : existing.status
        }
      } else {
        // Se movió: resetear contador y volver a moving
        await clearStoppedSince(reading.vehicle_id)
        newStatus = existing.status === 'alert' ? 'alert' : 'moving'
      }
    }

    await this.vehicleRepo.upsert({
      id: reading.vehicle_id,
      status: newStatus,
      lat: reading.lat,
      lng: reading.lng,
      lastSeen: reading.timestamp,
    })

    emitGpsUpdate(reading)
    emitVehicleStatus(reading.vehicle_id, newStatus)

    return { status: 'accepted' }
  }
}
