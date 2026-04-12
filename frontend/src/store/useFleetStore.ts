import { create } from 'zustand'
import type { Vehicle, Alert, GpsReading } from '../types'

interface FleetState {
  vehicles: Record<string, Vehicle>
  alerts: Alert[]
  selectedVehicleId: string | null
  isConnected: boolean
  managedVehicleIds: string[] | null  // null = superadmin (ve todo)

  updateVehicle: (reading: GpsReading) => void
  setVehicleStatus: (vehicle_id: string, status: Vehicle['status']) => void
  removeVehicle: (vehicle_id: string) => void
  addAlert: (alert: Alert) => void
  resolveAlert: (alert_id: string, vehicle_id: string, alert_type: string) => void
  loadAlerts: (alerts: Alert[]) => void
  setManagedVehicleIds: (ids: string[] | null) => void
  selectVehicle: (id: string | null) => void
  setConnected: (connected: boolean) => void
}

const ROUTE_MAX_POINTS = 50

export const useFleetStore = create<FleetState>((set) => ({
  vehicles: {},
  alerts: [],
  selectedVehicleId: null,
  isConnected: false,
  managedVehicleIds: null,

  updateVehicle: (reading) =>
    set((state) => {
      const existing = state.vehicles[reading.vehicle_id]
      const newPoint: [number, number] = [reading.lat, reading.lng]

      const route = existing
        ? [...existing.route.slice(-ROUTE_MAX_POINTS + 1), newPoint]
        : [newPoint]

      return {
        vehicles: {
          ...state.vehicles,
          [reading.vehicle_id]: {
            id: reading.vehicle_id,
            label: reading.vehicle_id.startsWith('SIM-')
              ? `[SIM] ${reading.vehicle_id.replace('SIM-', '')}`
              : reading.vehicle_id,
            status: existing?.status ?? 'moving',
            lat: reading.lat,
            lng: reading.lng,
            lastSeen: reading.timestamp,
            route,
            lastAlertType:   existing?.lastAlertType,
            alertChipExpiry: existing?.alertChipExpiry,
          },
        },
      }
    }),

  setVehicleStatus: (vehicle_id, status) =>
    set((state) => {
      const vehicle = state.vehicles[vehicle_id]
      if (!vehicle) return state
      return {
        vehicles: {
          ...state.vehicles,
          [vehicle_id]: { ...vehicle, status },
        },
      }
    }),

  removeVehicle: (vehicle_id) =>
    set((state) => {
      const { [vehicle_id]: _, ...rest } = state.vehicles
      return {
        vehicles: rest,
        selectedVehicleId: state.selectedVehicleId === vehicle_id ? null : state.selectedVehicleId,
      }
    }),

  addAlert: (alert) =>
    set((state) => {
      const vehicles = { ...state.vehicles }
      if (alert.vehicle_id && vehicles[alert.vehicle_id]) {
        vehicles[alert.vehicle_id] = {
          ...vehicles[alert.vehicle_id],
          lastAlertType:   alert.type,
          alertChipExpiry: Date.now() + 10_000,
        }
      }
      return {
        alerts: [alert, ...state.alerts].slice(0, 100),
        vehicles,
      }
    }),

  resolveAlert: (alert_id, vehicle_id, alert_type) =>
    set((state) => {
      const alerts = state.alerts.map((a) =>
        a.id === alert_id ? { ...a, resolved: true } : a
      )
      const vehicles = { ...state.vehicles }
      if (alert_type === 'VEHICLE_STOPPED' && vehicles[vehicle_id]) {
        const v = vehicles[vehicle_id]
        if (v.status === 'alert') {
          vehicles[vehicle_id] = { ...v, status: 'idle' }
        }
      }
      return { alerts, vehicles }
    }),

  loadAlerts: (alerts) => set({ alerts }),

  setManagedVehicleIds: (ids) => set({ managedVehicleIds: ids }),

  selectVehicle: (id) => set({ selectedVehicleId: id }),

  setConnected: (connected) => set({ isConnected: connected }),
}))
