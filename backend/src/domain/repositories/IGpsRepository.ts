import type { GpsReading } from '../entities/GpsReading'

export interface IGpsRepository {
  save(reading: GpsReading): Promise<void>
  getLatestByVehicle(vehicle_id: string): Promise<GpsReading | null>
}
