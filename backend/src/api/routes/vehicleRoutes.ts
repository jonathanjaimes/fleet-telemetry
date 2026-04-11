import { Router } from 'express'
import type { Request, Response } from 'express'
import { PgVehicleRepository } from '../../infrastructure/db/PgVehicleRepository'
import { DeleteVehicleUseCase } from '../../application/delete-vehicle/DeleteVehicleUseCase'

export const vehicleRouter = Router()

const vehicleRepo = new PgVehicleRepository()
const deleteVehicleUseCase = new DeleteVehicleUseCase(vehicleRepo)

vehicleRouter.get('/', async (_req: Request, res: Response) => {
  const vehicles = await vehicleRepo.findAll()
  res.json(vehicles)
})

vehicleRouter.delete('/:id', async (req: Request, res: Response) => {
  const { deleted } = await deleteVehicleUseCase.execute(req.params.id)
  if (!deleted) {
    res.status(404).json({ error: 'Vehicle not found' })
    return
  }
  res.json({ message: 'Vehicle deleted successfully' })
})
