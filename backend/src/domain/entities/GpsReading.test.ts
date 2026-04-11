import { isValidGpsReading, buildDuplicateKey } from './GpsReading'

describe('isValidGpsReading', () => {
  it('should accept a valid GPS reading', () => {
    expect(isValidGpsReading({
      vehicle_id: 'truck-01',
      lat: 4.6097,
      lng: -74.0817,
      timestamp: '2026-04-11T10:00:00Z',
    })).toBe(true)
  })

  it('should reject missing vehicle_id', () => {
    expect(isValidGpsReading({ lat: 4.6097, lng: -74.0817, timestamp: '2026-04-11T10:00:00Z' })).toBe(false)
  })

  it('should reject lat out of range', () => {
    expect(isValidGpsReading({ vehicle_id: 'truck-01', lat: 999, lng: -74.0817, timestamp: '2026-04-11T10:00:00Z' })).toBe(false)
  })

  it('should reject lng out of range', () => {
    expect(isValidGpsReading({ vehicle_id: 'truck-01', lat: 4.6097, lng: 999, timestamp: '2026-04-11T10:00:00Z' })).toBe(false)
  })

  it('should reject non-numeric lat', () => {
    expect(isValidGpsReading({ vehicle_id: 'truck-01', lat: 'hola', lng: -74.0817, timestamp: '2026-04-11T10:00:00Z' })).toBe(false)
  })

  it('should reject invalid timestamp', () => {
    expect(isValidGpsReading({ vehicle_id: 'truck-01', lat: 4.6097, lng: -74.0817, timestamp: 'not-a-date' })).toBe(false)
  })

  it('should reject null input', () => {
    expect(isValidGpsReading(null)).toBe(false)
  })
})

describe('buildDuplicateKey', () => {
  it('should generate consistent key for same reading', () => {
    const ts = new Date('2026-04-11T10:00:00Z')
    const reading = { vehicle_id: 'truck-01', lat: 4.6097, lng: -74.0817, timestamp: ts }
    expect(buildDuplicateKey(reading)).toBe(`dedup:truck-01:4.6097:-74.0817:${ts.getTime()}`)
  })
})
