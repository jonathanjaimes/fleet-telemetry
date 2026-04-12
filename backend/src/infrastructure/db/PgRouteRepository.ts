import { v4 as uuidv4 } from 'uuid'
import { pgPool } from './pgClient'
import type { IRouteRepository, GpsPoint } from '../../domain/repositories/IRouteRepository'
import type { Route } from '../../domain/entities/Route'

function rowToRoute(row: Record<string, unknown>): Route {
  return {
    id:         row.id as string,
    vehicle_id: row.vehicle_id as string,
    started_at: row.started_at as Date,
    ended_at:   row.ended_at as Date | null,
  }
}

export class PgRouteRepository implements IRouteRepository {
  async startRoute(vehicle_id: string): Promise<Route> {
    // Cierra cualquier ruta activa antes de abrir una nueva (evita fugas)
    await this.endRoute(vehicle_id)

    const id = uuidv4()
    const started_at = new Date()
    await pgPool.query(
      'INSERT INTO routes (id, vehicle_id, started_at) VALUES ($1, $2, $3)',
      [id, vehicle_id, started_at],
    )
    return { id, vehicle_id, started_at, ended_at: null }
  }

  async endRoute(vehicle_id: string): Promise<void> {
    await pgPool.query(
      `UPDATE routes SET ended_at = NOW()
       WHERE vehicle_id = $1 AND ended_at IS NULL`,
      [vehicle_id],
    )
  }

  async findByVehicle(vehicle_id: string): Promise<Route[]> {
    const r = await pgPool.query(
      `SELECT * FROM routes
       WHERE vehicle_id = $1
       ORDER BY started_at DESC
       LIMIT 100`,
      [vehicle_id],
    )
    return r.rows.map(rowToRoute)
  }

  async findById(id: string): Promise<Route | null> {
    const r = await pgPool.query('SELECT * FROM routes WHERE id = $1', [id])
    if (r.rows.length === 0) return null
    return rowToRoute(r.rows[0])
  }

  async getPoints(
    vehicle_id: string,
    started_at: Date,
    ended_at: Date | null,
  ): Promise<GpsPoint[]> {
    const end = ended_at ?? new Date()
    const r = await pgPool.query(
      `SELECT lat, lng, timestamp
       FROM gps_readings
       WHERE vehicle_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       ORDER BY timestamp ASC`,
      [vehicle_id, started_at, end],
    )
    return r.rows.map((row) => ({
      lat:       parseFloat(row.lat),
      lng:       parseFloat(row.lng),
      timestamp: (row.timestamp as Date).toISOString(),
    }))
  }
}
