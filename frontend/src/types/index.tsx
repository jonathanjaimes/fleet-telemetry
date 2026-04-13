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

export const ALERT_CONFIG: Record<AlertType, { icon: React.ReactNode; label: string; short: string }> = {
  VEHICLE_STOPPED:  { icon: <Clock size={12} />,       label: 'Sin movimiento',   short: 'Sin mov.'  },
  PANIC_ACCIDENT:   { icon: <Car size={12} />,          label: 'Accidente',        short: 'Accidente' },
  PANIC_ROBBERY:    { icon: <ShieldAlert size={12} />,  label: 'Robo / Asalto',   short: 'Robo'      },
  PANIC_MEDICAL:    { icon: <HeartPulse size={12} />,   label: 'Emergencia médica',short: 'Médica'    },
  PANIC_MECHANICAL: { icon: <Wrench size={12} />,       label: 'Falla mecánica',  short: 'Mecánica'  },
  PANIC_OTHER:      { icon: <HelpCircle size={12} />,   label: 'Otra emergencia', short: 'Otra'      },
}

export interface Alert {
  id: string
  vehicle_id: string
  type?: AlertType
  message: string
  timestamp: string
  resolved: boolean
}
