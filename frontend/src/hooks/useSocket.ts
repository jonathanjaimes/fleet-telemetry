import { useEffect } from 'react'
import { io, Socket } from 'socket.io-client'
import { useFleetStore } from '../store/useFleetStore'
import type { GpsReading, Alert } from '../types'

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001'
const BACKEND    = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

export function useSocket() {
  const updateVehicle    = useFleetStore((s) => s.updateVehicle)
  const setVehicleStatus = useFleetStore((s) => s.setVehicleStatus)
  const removeVehicle    = useFleetStore((s) => s.removeVehicle)
  const addAlert         = useFleetStore((s) => s.addAlert)
  const resolveAlert     = useFleetStore((s) => s.resolveAlert)
  const loadAlerts       = useFleetStore((s) => s.loadAlerts)
  const setConnected     = useFleetStore((s) => s.setConnected)

  useEffect(() => {
    socket = io(SOCKET_URL, { transports: ['websocket'] })

    socket.on('connect', () => {
      setConnected(true)
      fetch(`${BACKEND}/api/alerts`)
        .then((r) => r.json())
        .then((data: Alert[]) => loadAlerts(data))
        .catch(() => {/* silencioso */})
    })
    socket.on('disconnect', () => setConnected(false))

    socket.on('gps:update', (reading: GpsReading) => {
      updateVehicle(reading)
    })

    socket.on('vehicle:status', (data: { vehicle_id: string; status: 'moving' | 'stopped' | 'alert' }) => {
      setVehicleStatus(data.vehicle_id, data.status)
    })

    socket.on('alert:new', (alert: Alert) => {
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
  }, [updateVehicle, setVehicleStatus, removeVehicle, addAlert, resolveAlert, loadAlerts, setConnected])
}
