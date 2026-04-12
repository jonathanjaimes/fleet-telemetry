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
}

export interface Alert {
  id: string
  vehicle_id: string
  type?: string
  message: string
  timestamp: string
}
