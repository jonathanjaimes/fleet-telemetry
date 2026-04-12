import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import type { Vehicle } from '../../domain/entities/Vehicle'
import { pgPool } from './pgClient'

export class PgVehicleRepository implements IVehicleRepository {
  async upsert(vehicle: Vehicle): Promise<void> {
    await pgPool.query(
      `INSERT INTO vehicles (id, status, lat, lng, last_seen)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id) DO UPDATE
       SET status = $2, lat = $3, lng = $4, last_seen = $5`,
      [vehicle.id, vehicle.status, vehicle.lat, vehicle.lng, vehicle.lastSeen]
    )
  }

  async findById(id: string): Promise<Vehicle | null> {
    const result = await pgPool.query(
      `SELECT * FROM vehicles WHERE id = $1`, [id]
    )
    if (!result.rows[0]) return null
    const row = result.rows[0]
    return { id: row.id, status: row.status, lat: row.lat, lng: row.lng, lastSeen: new Date(row.last_seen) }
  }

  async findAll(): Promise<Vehicle[]> {
    const result = await pgPool.query(`SELECT * FROM vehicles ORDER BY id`)
    return result.rows.map((row) => ({
      id: row.id, status: row.status, lat: row.lat, lng: row.lng, lastSeen: new Date(row.last_seen),
    }))
  }

  async delete(id: string): Promise<void> {
    await pgPool.query(`DELETE FROM vehicles WHERE id = $1`, [id])
  }

  async updateStatus(id: string, status: Vehicle['status']): Promise<void> {
    await pgPool.query(`UPDATE vehicles SET status = $1 WHERE id = $2`, [status, id])
  }
}
