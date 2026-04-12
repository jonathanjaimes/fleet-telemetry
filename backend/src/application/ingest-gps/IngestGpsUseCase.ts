import { v4 as uuidv4 } from 'uuid'
import type { GpsReading } from '../../domain/entities/GpsReading'
import { buildDuplicateKey } from '../../domain/entities/GpsReading'
import { isVehicleStopped, STOPPED_THRESHOLD_MS } from '../../domain/entities/Vehicle'
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
    let newStatus: 'moving' | 'stopped' | 'alert' = 'moving'

    // Si el conductor acaba de detener el viaje manualmente, ignorar
    // paquetes GPS tardíos que podrían pisar el estado "stopped".
    const manuallyStop = await isManualStop(reading.vehicle_id)
    if (manuallyStop) {
      emitGpsUpdate(reading)
      return { status: 'accepted' }
    }

    if (existing) {
      const samePosition = isVehicleStopped(existing, reading, STOPPED_THRESHOLD_MS)

      if (samePosition) {
        // El vehículo sigue en la misma posición:
        // usamos stopped_since en Redis para medir tiempo real continuo,
        // evitando falsos positivos por gaps de conectividad o app en background.
        let stoppedSince = await getStoppedSince(reading.vehicle_id)
        if (!stoppedSince) {
          stoppedSince = reading.timestamp
          await setStoppedSince(reading.vehicle_id, stoppedSince)
        }

        const continuousStoppedMs = reading.timestamp.getTime() - stoppedSince.getTime()

        if (continuousStoppedMs >= STOPPED_THRESHOLD_MS) {
          newStatus = existing.status === 'alert' ? 'alert' : 'stopped'

          if (existing.status !== 'alert' && existing.status !== 'stopped') {
            const alert = {
              id: uuidv4(),
              vehicle_id: reading.vehicle_id,
              type: 'VEHICLE_STOPPED' as const,
              message: `Vehículo detenido por más de ${Math.round(continuousStoppedMs / 1000)} segundos`,
              timestamp: reading.timestamp,
            }
            await this.alertRepo.save(alert)
            newStatus = 'alert'
            emitAlert(alert)
          }
        } else {
          newStatus = existing.status === 'alert' ? 'alert' : existing.status
        }
      } else {
        // El vehículo se movió: resetear el contador
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
