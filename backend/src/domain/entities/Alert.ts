export type AlertType = 'VEHICLE_STOPPED' | 'PANIC_BUTTON'

export interface Alert {
  id: string
  vehicle_id: string
  type: AlertType
  message: string
  timestamp: Date
}
