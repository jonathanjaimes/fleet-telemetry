import type { IGpsRepository } from '../../domain/repositories/IGpsRepository'
import type { GpsReading } from '../../domain/entities/GpsReading'
import { pgPool } from './pgClient'

export class PgGpsRepository implements IGpsRepository {
  async save(reading: GpsReading): Promise<void> {
    await pgPool.query(
      `INSERT INTO gps_readings (vehicle_id, lat, lng, timestamp)
       VALUES ($1, $2, $3, $4)`,
      [reading.vehicle_id, reading.lat, reading.lng, reading.timestamp]
    )
  }

  async getLatestByVehicle(vehicle_id: string): Promise<GpsReading | null> {
    const result = await pgPool.query(
      `SELECT * FROM gps_readings
       WHERE vehicle_id = $1
       ORDER BY timestamp DESC LIMIT 1`,
      [vehicle_id]
    )
    if (!result.rows[0]) return null
    const row = result.rows[0]
    return {
      vehicle_id: row.vehicle_id,
      lat: row.lat,
      lng: row.lng,
      timestamp: new Date(row.timestamp),
    }
  }
}
