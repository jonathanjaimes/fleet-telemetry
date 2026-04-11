export interface GpsReading {
  vehicle_id: string
  lat: number
  lng: number
  timestamp: Date
}

export function isValidGpsReading(data: unknown): data is GpsReading {
  if (!data || typeof data !== 'object') return false
  const d = data as Record<string, unknown>
  return (
    typeof d.vehicle_id === 'string' && d.vehicle_id.trim().length > 0 &&
    typeof d.lat === 'number' && d.lat >= -90 && d.lat <= 90 &&
    typeof d.lng === 'number' && d.lng >= -180 && d.lng <= 180 &&
    typeof d.timestamp === 'string' && !isNaN(Date.parse(d.timestamp))
  )
}

export function buildDuplicateKey(reading: GpsReading): string {
  return `dedup:${reading.vehicle_id}:${reading.lat}:${reading.lng}:${reading.timestamp.getTime()}`
}
