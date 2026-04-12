import { isSamePosition, STOPPED_THRESHOLD_MS } from './Vehicle'
import type { Vehicle } from './Vehicle'

const baseVehicle: Vehicle = {
  id: 'truck-01',
  status: 'moving',
  lat: 4.6097,
  lng: -74.0817,
  lastSeen: new Date('2026-04-11T10:00:00Z'),
}

describe('isSamePosition', () => {
  it('should return true when coordinates are the same (no movement)', () => {
    expect(isSamePosition(baseVehicle, { lat: 4.6097, lng: -74.0817 })).toBe(true)
  })

  it('should return true when movement is within GPS drift tolerance (< 25m)', () => {
    // ~11m de diferencia en latitud
    expect(isSamePosition(baseVehicle, { lat: 4.60971, lng: -74.08172 })).toBe(true)
  })

  it('should return false when position changed beyond tolerance', () => {
    // ~11km de diferencia
    expect(isSamePosition(baseVehicle, { lat: 4.7000, lng: -74.0817 })).toBe(false)
  })

  it('should return false when both lat and lng changed significantly', () => {
    expect(isSamePosition(baseVehicle, { lat: 4.7000, lng: -74.1000 })).toBe(false)
  })

  it('STOPPED_THRESHOLD_MS should be 30 seconds', () => {
    expect(STOPPED_THRESHOLD_MS).toBe(30_000)
  })
})
