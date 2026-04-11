import type { Vehicle } from '../entities/Vehicle'

export interface IVehicleRepository {
  upsert(vehicle: Vehicle): Promise<void>
  findById(id: string): Promise<Vehicle | null>
  findAll(): Promise<Vehicle[]>
  delete(id: string): Promise<void>
}
