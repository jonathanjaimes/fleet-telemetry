import { IngestGpsUseCase } from './IngestGpsUseCase'
import type { IGpsRepository }     from '../../domain/repositories/IGpsRepository'
import type { IVehicleRepository } from '../../domain/repositories/IVehicleRepository'
import type { IAlertRepository }   from '../../domain/repositories/IAlertRepository'
import type { GpsReading }         from '../../domain/entities/GpsReading'
import type { Vehicle }            from '../../domain/entities/Vehicle'
import { STOPPED_THRESHOLD_MS, ALERT_THRESHOLD_MS } from '../../domain/entities/Vehicle'

// ── Mocks externos ────────────────────────────────────────────────────────────

jest.mock('../../infrastructure/cache/redisClient', () => ({
  isDuplicate:          jest.fn(),
  cacheVehiclePosition: jest.fn(),
  isManualStop:         jest.fn(),
  isDeletedFlag:        jest.fn(),
  getStoppedSince:      jest.fn(),
  setStoppedSince:      jest.fn(),
  clearStoppedSince:    jest.fn(),
}))

jest.mock('../../infrastructure/websocket/socketServer', () => ({
  emitGpsUpdate:     jest.fn(),
  emitVehicleStatus: jest.fn(),
  emitAlert:         jest.fn(),
}))

import * as redis  from '../../infrastructure/cache/redisClient'
import * as socket from '../../infrastructure/websocket/socketServer'

const r = redis  as jest.Mocked<typeof redis>
const s = socket as jest.Mocked<typeof socket>

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-04-12T10:00:00Z')

const baseReading: GpsReading = {
  vehicle_id: 'truck-01',
  lat:  4.6097,
  lng: -74.0817,
  timestamp: NOW,
}

const existingVehicle: Vehicle = {
  id:       'truck-01',
  status:   'moving',
  lat:  4.6097,
  lng: -74.0817,
  lastSeen: new Date(NOW.getTime() - 5_000),
}

// ── Setup ─────────────────────────────────────────────────────────────────────

let gpsRepo:     jest.Mocked<IGpsRepository>
let vehicleRepo: jest.Mocked<IVehicleRepository>
let alertRepo:   jest.Mocked<IAlertRepository>
let useCase:     IngestGpsUseCase

beforeEach(() => {
  jest.clearAllMocks()

  gpsRepo = {
    save:                 jest.fn().mockResolvedValue(undefined),
    getLatestByVehicle:   jest.fn(),
  }

  vehicleRepo = {
    upsert:        jest.fn().mockResolvedValue(undefined),
    findById:      jest.fn().mockResolvedValue(null),
    findAll:       jest.fn(),
    delete:        jest.fn(),
    updateStatus:  jest.fn(),
  }

  alertRepo = {
    save:               jest.fn().mockResolvedValue(undefined),
    findByVehicle:      jest.fn(),
    findAll:            jest.fn(),
    findByVehicleIds:   jest.fn(),
    resolve:            jest.fn(),
  }

  useCase = new IngestGpsUseCase(gpsRepo, vehicleRepo, alertRepo)

  // Defaults: sin flags activos
  r.isDeletedFlag.mockResolvedValue(false)
  r.isDuplicate.mockResolvedValue(false)
  r.isManualStop.mockResolvedValue(false)
  r.cacheVehiclePosition.mockResolvedValue(undefined as never)
  r.getStoppedSince.mockResolvedValue(null)
  r.setStoppedSince.mockResolvedValue(undefined as never)
  r.clearStoppedSince.mockResolvedValue(undefined as never)
})

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('IngestGpsUseCase — deduplicación y validaciones', () => {

  it('rechaza lecturas de vehículos marcados como eliminados', async () => {
    r.isDeletedFlag.mockResolvedValue(true)

    const result = await useCase.execute(baseReading)

    expect(result.status).toBe('duplicate')
    expect(gpsRepo.save).not.toHaveBeenCalled()
  })

  it('rechaza lecturas duplicadas según la clave Redis', async () => {
    r.isDuplicate.mockResolvedValue(true)

    const result = await useCase.execute(baseReading)

    expect(result.status).toBe('duplicate')
    expect(gpsRepo.save).not.toHaveBeenCalled()
  })

  it('persiste la lectura en DB y caché cuando es válida y nueva', async () => {
    const result = await useCase.execute(baseReading)

    expect(result.status).toBe('accepted')
    expect(gpsRepo.save).toHaveBeenCalledWith(baseReading)
    expect(r.cacheVehiclePosition).toHaveBeenCalledWith(
      'truck-01', baseReading.lat, baseReading.lng, baseReading.timestamp,
    )
  })
})

describe('IngestGpsUseCase — vehículo nuevo (sin historial)', () => {

  it('asigna estado "moving" cuando no existe registro previo del vehículo', async () => {
    vehicleRepo.findById.mockResolvedValue(null)

    const result = await useCase.execute(baseReading)

    expect(result.status).toBe('accepted')
    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'truck-01', status: 'moving' }),
    )
  })

  it('emite evento GPS y cambio de estado al frontend', async () => {
    vehicleRepo.findById.mockResolvedValue(null)

    await useCase.execute(baseReading)

    expect(s.emitGpsUpdate).toHaveBeenCalledWith(baseReading)
    expect(s.emitVehicleStatus).toHaveBeenCalledWith('truck-01', 'moving')
  })
})

describe('IngestGpsUseCase — vehículo en movimiento', () => {

  it('vuelve a "moving" y limpia stoppedSince cuando el vehículo se desplazó', async () => {
    vehicleRepo.findById.mockResolvedValue(existingVehicle)

    const movedReading: GpsReading = {
      ...baseReading,
      lat:  4.7000, // ~10 km al norte → supera umbral de 25 m
      lng: -74.1000,
    }

    const result = await useCase.execute(movedReading)

    expect(result.status).toBe('accepted')
    expect(r.clearStoppedSince).toHaveBeenCalledWith('truck-01')
    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'moving' }),
    )
  })

  it('mantiene "alert" aunque el vehículo se mueva (solo el dashboard resuelve alertas)', async () => {
    vehicleRepo.findById.mockResolvedValue({ ...existingVehicle, status: 'alert' })

    const movedReading: GpsReading = { ...baseReading, lat: 4.7000, lng: -74.1000 }

    await useCase.execute(movedReading)

    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'alert' }),
    )
  })
})

describe('IngestGpsUseCase — detección de inactividad', () => {

  it('registra stoppedSince la primera vez que el vehículo está quieto', async () => {
    vehicleRepo.findById.mockResolvedValue(existingVehicle)
    r.getStoppedSince.mockResolvedValue(null)

    await useCase.execute(baseReading)

    expect(r.setStoppedSince).toHaveBeenCalledWith('truck-01', baseReading.timestamp)
  })

  it('mantiene el estado actual si lleva quieto menos de STOPPED_THRESHOLD_MS', async () => {
    vehicleRepo.findById.mockResolvedValue({ ...existingVehicle, status: 'moving' })
    const recentStop = new Date(NOW.getTime() - (STOPPED_THRESHOLD_MS - 5_000))
    r.getStoppedSince.mockResolvedValue(recentStop)

    await useCase.execute(baseReading)

    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'moving' }),
    )
    expect(alertRepo.save).not.toHaveBeenCalled()
  })

  it('cambia a "idle" cuando lleva quieto entre STOPPED_THRESHOLD_MS y ALERT_THRESHOLD_MS', async () => {
    vehicleRepo.findById.mockResolvedValue({ ...existingVehicle, status: 'moving' })
    const midStop = new Date(NOW.getTime() - (STOPPED_THRESHOLD_MS + 10_000))
    r.getStoppedSince.mockResolvedValue(midStop)

    await useCase.execute(baseReading)

    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'idle' }),
    )
    expect(alertRepo.save).not.toHaveBeenCalled()
  })

  it('genera alerta VEHICLE_STOPPED cuando supera ALERT_THRESHOLD_MS sin movimiento', async () => {
    vehicleRepo.findById.mockResolvedValue({ ...existingVehicle, status: 'moving' })
    const longStop = new Date(NOW.getTime() - (ALERT_THRESHOLD_MS + 5_000))
    r.getStoppedSince.mockResolvedValue(longStop)

    await useCase.execute(baseReading)

    expect(alertRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        vehicle_id: 'truck-01',
        type:       'VEHICLE_STOPPED',
        resolved:   false,
      }),
    )
    expect(s.emitAlert).toHaveBeenCalled()
    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'alert' }),
    )
  })

  it('no genera alerta duplicada si el vehículo ya está en estado "alert"', async () => {
    vehicleRepo.findById.mockResolvedValue({ ...existingVehicle, status: 'alert' })
    const longStop = new Date(NOW.getTime() - (ALERT_THRESHOLD_MS + 5_000))
    r.getStoppedSince.mockResolvedValue(longStop)

    await useCase.execute(baseReading)

    expect(alertRepo.save).not.toHaveBeenCalled()
    expect(vehicleRepo.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'alert' }),
    )
  })
})

describe('IngestGpsUseCase — parada manual del conductor', () => {

  it('emite solo el GPS y retorna sin modificar el estado del vehículo', async () => {
    vehicleRepo.findById.mockResolvedValue(existingVehicle)
    r.isManualStop.mockResolvedValue(true)

    const result = await useCase.execute(baseReading)

    expect(result.status).toBe('accepted')
    expect(s.emitGpsUpdate).toHaveBeenCalledWith(baseReading)
    expect(vehicleRepo.upsert).not.toHaveBeenCalled()
    expect(alertRepo.save).not.toHaveBeenCalled()
  })
})
