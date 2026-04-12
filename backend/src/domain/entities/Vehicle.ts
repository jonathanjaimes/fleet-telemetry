export type VehicleStatus = 'moving' | 'idle' | 'stopped' | 'alert'

export interface Vehicle {
  id: string
  status: VehicleStatus
  lat: number
  lng: number
  lastSeen: Date
}

// 30s en la misma posición → estado "stopped" (visible en dashboard)
// 120s en la misma posición → genera alerta (posible avería o problema)
export const STOPPED_THRESHOLD_MS = 30_000
export const ALERT_THRESHOLD_MS   = 120_000

// Redondear a 4 decimales = precisión de ~11 metros, suficiente para absorber
// el drift natural del GPS sin considerar movimiento real como quieto.
function roundCoord(n: number): number {
  return Math.round(n * 10_000) / 10_000
}

export function isSamePosition(prev: Vehicle, incoming: { lat: number; lng: number }): boolean {
  return (
    roundCoord(prev.lat) === roundCoord(incoming.lat) &&
    roundCoord(prev.lng) === roundCoord(incoming.lng)
  )
}
