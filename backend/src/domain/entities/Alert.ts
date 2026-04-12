export type AlertType =
  | 'VEHICLE_STOPPED'
  | 'PANIC_ACCIDENT'
  | 'PANIC_ROBBERY'
  | 'PANIC_MEDICAL'
  | 'PANIC_MECHANICAL'
  | 'PANIC_OTHER'

export const PANIC_LABELS: Record<AlertType, string> = {
  VEHICLE_STOPPED:  'Sin movimiento detectado',
  PANIC_ACCIDENT:   'Accidente',
  PANIC_ROBBERY:    'Robo / Asalto',
  PANIC_MEDICAL:    'Emergencia médica',
  PANIC_MECHANICAL: 'Falla mecánica',
  PANIC_OTHER:      'Otra emergencia',
}

export interface Alert {
  id: string
  vehicle_id: string
  type: AlertType
  message: string
  timestamp: Date
}
