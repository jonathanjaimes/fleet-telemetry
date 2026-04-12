import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import { deleteCachedVehicle, setDeletedFlag } from '../../infrastructure/cache/redisClient'

/**
 * Saga simplificada de eliminación de vehículo:
 * 1. Marcar como "deleting" en DB (estado transicional)
 * 2. Eliminar del caché Redis
 * 3. Eliminar definitivamente de DB
 *
 * Si el proceso falla entre pasos 2 y 3, el vehículo
 * queda en estado "deleting" y un job de limpieza lo resuelve.
 */
export class DeleteVehicleUseCase {
  constructor(private readonly vehicleRepo: IVehicleRepository) {}

  async execute(vehicle_id: string): Promise<{ deleted: boolean }> {
    const vehicle = await this.vehicleRepo.findById(vehicle_id)
    if (!vehicle) return { deleted: false }

    await deleteCachedVehicle(vehicle_id)
    await this.vehicleRepo.delete(vehicle_id)
    await setDeletedFlag(vehicle_id)

    return { deleted: true }
  }
}
