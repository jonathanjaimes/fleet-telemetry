export type ConnectionStatus = 'connected' | 'disconnected' | 'sending'

export interface LocalAlert {
  id: string
  message: string
  timestamp: string
  type: 'VEHICLE_STOPPED' | 'PANIC_BUTTON' | 'CONNECTION_LOST'
}

export interface TripState {
  isActive: boolean
  startedAt: string | null
  vehicleId: string
}
