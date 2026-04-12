import type { IAlertRepository } from '../../domain/repositories/IAlertRepository'
import type { Alert } from '../../domain/entities/Alert'
import { pgPool } from './pgClient'

function rowToAlert(row: Record<string, unknown>): Alert {
  return {
    id:         row.id as string,
    vehicle_id: row.vehicle_id as string,
    type:       row.type as Alert['type'],
    message:    row.message as string,
    timestamp:  new Date(row.timestamp as string),
    resolved:   row.resolved as boolean,
  }
}

export class PgAlertRepository implements IAlertRepository {
  async save(alert: Alert): Promise<void> {
    await pgPool.query(
      `INSERT INTO alerts (id, vehicle_id, type, message, timestamp, resolved)
       VALUES ($1, $2, $3, $4, $5, FALSE)`,
      [alert.id, alert.vehicle_id, alert.type, alert.message, alert.timestamp]
    )
  }

  async findByVehicle(vehicle_id: string): Promise<Alert[]> {
    const result = await pgPool.query(
      `SELECT * FROM alerts WHERE vehicle_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [vehicle_id]
    )
    return result.rows.map(rowToAlert)
  }

  async findAll(): Promise<Alert[]> {
    const result = await pgPool.query(
      `SELECT * FROM alerts ORDER BY timestamp DESC LIMIT 100`
    )
    return result.rows.map(rowToAlert)
  }

  async findByVehicleIds(vehicleIds: string[]): Promise<Alert[]> {
    if (vehicleIds.length === 0) return []
    const placeholders = vehicleIds.map((_, i) => `$${i + 1}`).join(', ')
    const result = await pgPool.query(
      `SELECT * FROM alerts WHERE vehicle_id IN (${placeholders}) ORDER BY timestamp DESC LIMIT 100`,
      vehicleIds
    )
    return result.rows.map(rowToAlert)
  }

  async resolve(id: string): Promise<void> {
    await pgPool.query(
      `UPDATE alerts SET resolved = TRUE WHERE id = $1`,
      [id]
    )
  }
}
