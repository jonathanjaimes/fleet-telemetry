import type { Alert } from '../entities/Alert'

export interface IAlertRepository {
  save(alert: Alert): Promise<void>
  findByVehicle(vehicle_id: string): Promise<Alert[]>
}
