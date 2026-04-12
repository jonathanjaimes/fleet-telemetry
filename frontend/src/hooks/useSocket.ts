import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useFleetStore } from '../store/useFleetStore'
import { useAuthStore } from '../store/useAuthStore'
import type { GpsReading, Alert } from '../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'
const BACKEND    = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

export function useSocket() {
  const updateVehicle        = useFleetStore((s) => s.updateVehicle)
  const setVehicleStatus     = useFleetStore((s) => s.setVehicleStatus)
  const removeVehicle        = useFleetStore((s) => s.removeVehicle)
  const addAlert             = useFleetStore((s) => s.addAlert)
  const resolveAlert         = useFleetStore((s) => s.resolveAlert)
  const loadAlerts           = useFleetStore((s) => s.loadAlerts)
  const setManagedVehicleIds = useFleetStore((s) => s.setManagedVehicleIds)
  const setConnected         = useFleetStore((s) => s.setConnected)
  const user = useAuthStore((s) => s.user)

  useEffect(() => {
    if (!user) return

    const headers = { 'x-user-id': user.unique_id }

    socket = io(SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', async () => {
      setConnected(true)

      // Para usuarios flota: cargar sus conductores y registrar sus IDs
      if (user.role === 'fleet') {
        try {
          const driversRes = await fetch(`${BACKEND}/api/users/drivers`, { headers })
          if (driversRes.ok) {
            const drivers: { unique_id: string }[] = await driversRes.json()
            setManagedVehicleIds(drivers.map((d) => d.unique_id))
          }
        } catch {/* silencioso */}
      } else {
        // Superadmin: ve todo
        setManagedVehicleIds(null)
      }

      // Cargar historial de alertas filtrado por rol
      try {
        const res = await fetch(`${BACKEND}/api/alerts`, { headers })
        if (res.ok) {
          const data: Alert[] = await res.json()
          loadAlerts(data)
        }
      } catch {/* silencioso */}
    })

    socket.on('disconnect', () => setConnected(false))

    socket.on('gps:update', (reading: GpsReading) => {
      updateVehicle(reading)
    })

    socket.on('vehicle:status', (data: { vehicle_id: string; status: 'moving' | 'idle' | 'stopped' | 'alert' }) => {
      setVehicleStatus(data.vehicle_id, data.status)
    })

    socket.on('alert:new', (alert: Alert) => {
      // Filtrar en tiempo real: superadmin ve todo, fleet solo sus conductores
      const ids = useFleetStore.getState().managedVehicleIds
      if (ids !== null && !ids.includes(alert.vehicle_id)) return

      addAlert({ ...alert, resolved: false })
      setVehicleStatus(alert.vehicle_id, 'alert')
    })

    socket.on('alert:resolved', (data: { alert_id: string; vehicle_id: string; alert_type: string }) => {
      resolveAlert(data.alert_id, data.vehicle_id, data.alert_type)
    })

    socket.on('vehicle:deleted', (data: { vehicle_id: string }) => {
      removeVehicle(data.vehicle_id)
    })

    return () => {
      socket?.disconnect()
      socket = null
    }
  }, [user, updateVehicle, setVehicleStatus, removeVehicle, addAlert, resolveAlert, loadAlerts, setManagedVehicleIds, setConnected])
}
