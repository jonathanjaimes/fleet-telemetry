import { v4 as uuidv4 } from 'uuid'
import type { GpsReading } from '../../domain/entities/GpsReading'
import { buildDuplicateKey } from '../../domain/entities/GpsReading'
import { isVehicleStopped, STOPPED_THRESHOLD_MS } from '../../domain/entities/Vehicle'
import type { IGpsRepository } from '../../domain/repositories/IGpsRepository'
import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import type { IAlertRepository } from '../../domain/repositories/IAlertRepository'
import { isDuplicate, cacheVehiclePosition, getCachedVehiclePosition, isManualStop, clearManualStop } from '../../infrastructure/cache/redisClient'
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
    // El flag se limpia explícitamente con POST /vehicles/:id/start
    // o expira solo por TTL de Redis (15s).
    const manuallyStop = await isManualStop(reading.vehicle_id)
    if (manuallyStop) {
      emitGpsUpdate(reading)
      return { status: 'accepted' }
    }

    if (existing) {
      const elapsedMs = reading.timestamp.getTime() - existing.lastSeen.getTime()
      if (isVehicleStopped(existing, reading, elapsedMs)) {
        newStatus = existing.status === 'alert' ? 'alert' : 'stopped'

        if (existing.status !== 'alert' && elapsedMs >= STOPPED_THRESHOLD_MS) {
          const alert = {
            id: uuidv4(),
            vehicle_id: reading.vehicle_id,
            type: 'VEHICLE_STOPPED' as const,
            message: `Vehículo detenido por más de ${Math.round(elapsedMs / 1000)} segundos`,
            timestamp: reading.timestamp,
          }
          await this.alertRepo.save(alert)
          newStatus = 'alert'
          emitAlert(alert)
        }
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
