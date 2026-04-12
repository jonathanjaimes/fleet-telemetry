export type VehicleStatus = 'moving' | 'idle' | 'stopped' | 'alert'

export interface GpsReading {
  vehicle_id: string
  lat: number
  lng: number
  timestamp: string
}

export interface Vehicle {
  id: string
  label: string
  status: VehicleStatus
  lat: number
  lng: number
  lastSeen: string
  route: [number, number][]
  lastAlertType?: AlertType
  alertChipExpiry?: number   // timestamp ms — cuándo dejar de mostrar el chip
}

export type AlertType =
  | 'VEHICLE_STOPPED'
  | 'PANIC_ACCIDENT'
  | 'PANIC_ROBBERY'
  | 'PANIC_MEDICAL'
  | 'PANIC_MECHANICAL'
  | 'PANIC_OTHER'

export const ALERT_CONFIG: Record<AlertType, { icon: string; label: string }> = {
  VEHICLE_STOPPED:  { icon: '🔵', label: 'Sin movimiento' },
  PANIC_ACCIDENT:   { icon: '🚨', label: 'Accidente' },
  PANIC_ROBBERY:    { icon: '🔫', label: 'Robo / Asalto' },
  PANIC_MEDICAL:    { icon: '🚑', label: 'Emergencia médica' },
  PANIC_MECHANICAL: { icon: '⚠️', label: 'Falla mecánica' },
  PANIC_OTHER:      { icon: '🆘', label: 'Otra emergencia' },
}

export interface Alert {
  id: string
  vehicle_id: string
  type?: AlertType
  message: string
  timestamp: string
}
