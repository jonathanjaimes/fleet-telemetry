import { create } from 'zustand'
import type { Vehicle, Alert, GpsReading } from '../types'

interface FleetState {
  vehicles: Record<string, Vehicle>
  alerts: Alert[]
  selectedVehicleId: string | null
  isConnected: boolean

  updateVehicle: (reading: GpsReading) => void
  setVehicleStatus: (vehicle_id: string, status: Vehicle['status']) => void
  removeVehicle: (vehicle_id: string) => void
  addAlert: (alert: Alert) => void
  selectVehicle: (id: string | null) => void
  setConnected: (connected: boolean) => void
}

const ROUTE_MAX_POINTS = 50

export const useFleetStore = create<FleetState>((set) => ({
  vehicles: {},
  alerts: [],
  selectedVehicleId: null,
  isConnected: false,

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
            label: reading.vehicle_id,
            status: existing?.status ?? 'moving',
            lat: reading.lat,
            lng: reading.lng,
            lastSeen: reading.timestamp,
            route,
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
    set((state) => ({
      alerts: [alert, ...state.alerts].slice(0, 50),
    })),

  selectVehicle: (id) => set({ selectedVehicleId: id }),

  setConnected: (connected) => set({ isConnected: connected }),
}))
