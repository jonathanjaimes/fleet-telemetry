import type { IAlertRepository } from '../../domain/repositories/IAlertRepository'
import type { Alert } from '../../domain/entities/Alert'
import { pgPool } from './pgClient'

export class PgAlertRepository implements IAlertRepository {
  async save(alert: Alert): Promise<void> {
    await pgPool.query(
      `INSERT INTO alerts (id, vehicle_id, type, message, timestamp)
       VALUES ($1, $2, $3, $4, $5)`,
      [alert.id, alert.vehicle_id, alert.type, alert.message, alert.timestamp]
    )
  }

  async findByVehicle(vehicle_id: string): Promise<Alert[]> {
    const result = await pgPool.query(
      `SELECT * FROM alerts WHERE vehicle_id = $1 ORDER BY timestamp DESC LIMIT 50`,
      [vehicle_id]
    )
    return result.rows.map((row) => ({
      id: row.id, vehicle_id: row.vehicle_id, type: row.type,
      message: row.message, timestamp: new Date(row.timestamp),
    }))
  }
}
