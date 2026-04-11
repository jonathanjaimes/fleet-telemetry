export type VehicleStatus = 'moving' | 'stopped' | 'alert'

export interface Vehicle {
  id: string
  status: VehicleStatus
  lat: number
  lng: number
  lastSeen: Date
}

export const STOPPED_THRESHOLD_MS = 60_000 // 1 minuto

export function isVehicleStopped(prev: Vehicle, incoming: { lat: number; lng: number }, elapsedMs: number): boolean {
  const samePosition = prev.lat === incoming.lat && prev.lng === incoming.lng
  return samePosition && elapsedMs >= STOPPED_THRESHOLD_MS
}
