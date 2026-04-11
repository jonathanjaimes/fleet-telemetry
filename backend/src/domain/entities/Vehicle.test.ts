import { isVehicleStopped, STOPPED_THRESHOLD_MS } from './Vehicle'
import type { Vehicle } from './Vehicle'

const baseVehicle: Vehicle = {
  id: 'truck-01',
  status: 'moving',
  lat: 4.6097,
  lng: -74.0817,
  lastSeen: new Date('2026-04-11T10:00:00Z'),
}

describe('isVehicleStopped', () => {
  it('should return true when same position and elapsed >= threshold', () => {
    expect(isVehicleStopped(
      baseVehicle,
      { lat: 4.6097, lng: -74.0817 },
      STOPPED_THRESHOLD_MS
    )).toBe(true)
  })

  it('should return false when same position but elapsed < threshold', () => {
    expect(isVehicleStopped(
      baseVehicle,
      { lat: 4.6097, lng: -74.0817 },
      STOPPED_THRESHOLD_MS - 1
    )).toBe(false)
  })

  it('should return false when position changed regardless of elapsed time', () => {
    expect(isVehicleStopped(
      baseVehicle,
      { lat: 4.7000, lng: -74.0817 },
      STOPPED_THRESHOLD_MS * 10
    )).toBe(false)
  })

  it('should return true when GPS drift is within 11m tolerance (~4 decimal places)', () => {
    expect(isVehicleStopped(
      baseVehicle,
      { lat: 4.60971, lng: -74.08172 },
      STOPPED_THRESHOLD_MS
    )).toBe(true)
  })

  it('should return false when both lat and lng changed', () => {
    expect(isVehicleStopped(
      baseVehicle,
      { lat: 4.7000, lng: -74.1000 },
      STOPPED_THRESHOLD_MS
    )).toBe(false)
  })
})
