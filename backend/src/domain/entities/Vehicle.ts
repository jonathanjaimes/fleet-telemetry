export type VehicleStatus = 'moving' | 'idle' | 'stopped' | 'alert'

export interface Vehicle {
  id: string
  status: VehicleStatus
  lat: number
  lng: number
  lastSeen: Date
}

// 30s en la misma posición → estado "idle" (visible en dashboard)
// 120s en la misma posición → genera alerta (posible avería o problema)
export const STOPPED_THRESHOLD_MS = 30_000
export const ALERT_THRESHOLD_MS   = 120_000

// Umbral de distancia: movimientos menores a 25m se consideran drift del GPS,
// no desplazamiento real del vehículo.
const MOVEMENT_THRESHOLD_METERS = 25

// Fórmula de Haversine: distancia en metros entre dos coordenadas GPS
function haversineMeters(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6_371_000
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export function isSamePosition(prev: Vehicle, incoming: { lat: number; lng: number }): boolean {
  return haversineMeters(prev.lat, prev.lng, incoming.lat, incoming.lng) < MOVEMENT_THRESHOLD_METERS
}
