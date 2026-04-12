import { Clock, Car, ShieldAlert, HeartPulse, Wrench, HelpCircle } from 'lucide-react'

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
  alertChipExpiry?: number
}

export type AlertType =
  | 'VEHICLE_STOPPED'
  | 'PANIC_ACCIDENT'
  | 'PANIC_ROBBERY'
  | 'PANIC_MEDICAL'
  | 'PANIC_MECHANICAL'
  | 'PANIC_OTHER'

export const ALERT_CONFIG: Record<AlertType, { icon: React.ReactNode; label: string }> = {
  VEHICLE_STOPPED:  { icon: <Clock size={14} />,       label: 'Sin movimiento'    },
  PANIC_ACCIDENT:   { icon: <Car size={14} />,          label: 'Accidente'         },
  PANIC_ROBBERY:    { icon: <ShieldAlert size={14} />,  label: 'Robo / Asalto'    },
  PANIC_MEDICAL:    { icon: <HeartPulse size={14} />,   label: 'Emergencia médica' },
  PANIC_MECHANICAL: { icon: <Wrench size={14} />,       label: 'Falla mecánica'   },
  PANIC_OTHER:      { icon: <HelpCircle size={14} />,   label: 'Otra emergencia'  },
}

export interface Alert {
  id: string
  vehicle_id: string
  type?: AlertType
  message: string
  timestamp: string
  resolved: boolean
}
