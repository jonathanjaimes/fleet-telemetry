export type VehicleStatus = 'moving' | 'stopped' | 'alert'

export interface Vehicle {
  id: string
  status: VehicleStatus
  lat: number
  lng: number
  lastSeen: Date
}

export const STOPPED_THRESHOLD_MS = 60_000 // 1 minuto

// Redondear a 4 decimales = precisión de ~11 metros, suficiente para absorber
// el drift natural del GPS sin considerar movimiento real como quieto.
function roundCoord(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

export function isVehicleStopped(prev: Vehicle, incoming: { lat: number; lng: number }, elapsedMs: number): boolean {
  const samePosition =
    roundCoord(prev.lat) === roundCoord(incoming.lat) &&
    roundCoord(prev.lng) === roundCoord(incoming.lng)
  return samePosition && elapsedMs >= STOPPED_THRESHOLD_MS
}
