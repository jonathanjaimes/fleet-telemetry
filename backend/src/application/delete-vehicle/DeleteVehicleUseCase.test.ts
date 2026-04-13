import { DeleteVehicleUseCase } from './DeleteVehicleUseCase'
import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import type { Vehicle }            from '../../domain/entities/Vehicle'

// ── Mocks externos ────────────────────────────────────────────────────────────

jest.mock('../../infrastructure/cache/redisClient', () => ({
  deleteCachedVehicle: jest.fn(),
  setDeletedFlag:      jest.fn(),
  clearStoppedSince:   jest.fn(),
}))

import * as redis from '../../infrastructure/cache/redisClient'
const r = redis as jest.Mocked<typeof redis>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const vehicle: Vehicle = {
  id:       'truck-01',
  status:   'moving',
  lat:       4.6097,
  lng:      -74.0817,
  lastSeen:  new Date('2026-04-12T10:00:00Z'),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let vehicleRepo: jest.Mocked<IVehicleRepository>
let useCase:     DeleteVehicleUseCase

beforeEach(() => {
  jest.clearAllMocks()

  vehicleRepo = {
    upsert:       jest.fn(),
    findById:     jest.fn(),
    findAll:      jest.fn(),
    delete:       jest.fn().mockResolvedValue(undefined),
    updateStatus: jest.fn(),
  }

  useCase = new DeleteVehicleUseCase(vehicleRepo)

  r.deleteCachedVehicle.mockResolvedValue(undefined as never)
  r.setDeletedFlag.mockResolvedValue(undefined as never)
  r.clearStoppedSince.mockResolvedValue(undefined as never)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('DeleteVehicleUseCase — vehículo inexistente', () => {

  it('retorna { deleted: false } sin tocar caché ni DB', async () => {
    vehicleRepo.findById.mockResolvedValue(null)

    const result = await useCase.execute('truck-99')

    expect(result).toEqual({ deleted: false })
    expect(r.deleteCachedVehicle).not.toHaveBeenCalled()
    expect(vehicleRepo.delete).not.toHaveBeenCalled()
    expect(r.setDeletedFlag).not.toHaveBeenCalled()
  })
})

describe('DeleteVehicleUseCase — eliminación consistente (patrón Saga)', () => {

  beforeEach(() => {
    vehicleRepo.findById.mockResolvedValue(vehicle)
  })

  it('retorna { deleted: true } cuando el vehículo existe', async () => {
    const result = await useCase.execute('truck-01')
    expect(result).toEqual({ deleted: true })
  })

  it('elimina primero del caché Redis antes de la DB (orden de la saga)', async () => {
    const callOrder: string[] = []

    r.deleteCachedVehicle.mockImplementation(async () => {
      callOrder.push('cache')
    })
    vehicleRepo.delete.mockImplementation(async () => {
      callOrder.push('db')
    })
    r.setDeletedFlag.mockImplementation(async () => {
      callOrder.push('flag')
    })

    await useCase.execute('truck-01')

    expect(callOrder).toEqual(['cache', 'db', 'flag'])
  })

  it('invoca deleteCachedVehicle, delete en DB, setDeletedFlag y clearStoppedSince', async () => {
    await useCase.execute('truck-01')

    expect(r.deleteCachedVehicle).toHaveBeenCalledWith('truck-01')
    expect(vehicleRepo.delete).toHaveBeenCalledWith('truck-01')
    expect(r.setDeletedFlag).toHaveBeenCalledWith('truck-01')
    expect(r.clearStoppedSince).toHaveBeenCalledWith('truck-01')
  })

  it('llama a cada operación exactamente una vez', async () => {
    await useCase.execute('truck-01')

    expect(r.deleteCachedVehicle).toHaveBeenCalledTimes(1)
    expect(vehicleRepo.delete).toHaveBeenCalledTimes(1)
    expect(r.setDeletedFlag).toHaveBeenCalledTimes(1)
    expect(r.clearStoppedSince).toHaveBeenCalledTimes(1)
  })
})
