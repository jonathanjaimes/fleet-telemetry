import { useState, useEffect, useRef, useCallback } from 'react'
import * as Location from 'expo-location'
import { sendGpsReading, sendPanicAlert, sendTripStart, sendTripStop } from '../services/api'
import { getSocket } from '../services/socket'
import { saveAlert, getAlerts } from '../services/alertStorage'
import type { ConnectionStatus, LocalAlert, TripState } from '../types'

const SEND_INTERVAL_MS = 4000

export function useTelemetry(driverId: string) {
  const VEHICLE_ID = driverId
  const [status, setStatus]           = useState<ConnectionStatus>('disconnected')
  const [location, setLocation]       = useState<{ lat: number; lng: number } | null>(null)
  const [trip, setTrip]               = useState<TripState>({ isActive: false, startedAt: null, vehicleId: VEHICLE_ID })
  const [alerts, setAlerts]           = useState<LocalAlert[]>([])
  const [hasPermission, setPermission] = useState<boolean | null>(null)

  const intervalRef  = useRef<ReturnType<typeof setInterval> | null>(null)
  const stoppingRef  = useRef(false)

  // Solicitar permisos de GPS al montar
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status: s }) => {
      setPermission(s === 'granted')
    })
    getAlerts().then(setAlerts)
  }, [])

  // Escuchar evento vehicle:deleted desde el dashboard
  useEffect(() => {
    const socket = getSocket()

    const handleDeleted = (data: { vehicle_id: string }) => {
      if (data.vehicle_id !== VEHICLE_ID) return

      stoppingRef.current = true
      if (intervalRef.current) clearInterval(intervalRef.current)

      setTrip({ isActive: false, startedAt: null, vehicleId: VEHICLE_ID })
      setStatus('disconnected')

      const alert: Omit<LocalAlert, 'id'> = {
        message: 'Tu vehículo fue eliminado desde el dashboard — viaje finalizado',
        timestamp: new Date().toISOString(),
        type: 'CONNECTION_LOST',
      }
      saveAlert({ ...alert, id: Date.now().toString() })
      setAlerts((prev) => [{ ...alert, id: Date.now().toString() }, ...prev].slice(0, 50))

      setTimeout(() => { stoppingRef.current = false }, 3000)
    }

    socket.on('vehicle:deleted', handleDeleted)
    return () => { socket.off('vehicle:deleted', handleDeleted) }
  }, [])

  const addAlert = useCallback(async (alert: Omit<LocalAlert, 'id'>) => {
    const full: LocalAlert = { ...alert, id: Date.now().toString() }
    await saveAlert(full)
    setAlerts((prev) => [full, ...prev].slice(0, 50))
  }, [])

  // Bucle de envío GPS mientras el viaje esté activo
  useEffect(() => {
    if (!trip.isActive || !hasPermission) return

    const tick = async () => {
      if (stoppingRef.current) return
      try {
        setStatus('sending')
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        const { latitude: lat, longitude: lng } = loc.coords
        setLocation({ lat, lng })

        if (stoppingRef.current) return

        const result = await sendGpsReading({
          vehicle_id: VEHICLE_ID,
          lat,
          lng,
          timestamp: new Date().toISOString(),
        })

        setStatus(result === 'error' ? 'disconnected' : 'connected')

        if (result === 'error') {
          await addAlert({
            message: 'No se pudo enviar coordenada — guardando localmente',
            timestamp: new Date().toISOString(),
            type: 'CONNECTION_LOST',
          })
        }
      } catch {
        setStatus('disconnected')
      }
    }

    intervalRef.current = setInterval(tick, SEND_INTERVAL_MS)
    tick()

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [trip.isActive, hasPermission, addAlert])

  const startTrip = useCallback(() => {
    stoppingRef.current = false
    sendTripStart(VEHICLE_ID)
    setTrip({ isActive: true, startedAt: new Date().toISOString(), vehicleId: VEHICLE_ID })
    setStatus('connected')
  }, [])

  const stopTrip = useCallback(() => {
    stoppingRef.current = true
    if (intervalRef.current) clearInterval(intervalRef.current)
    setTrip((prev) => {
      sendTripStop(prev.vehicleId)
      return { ...prev, isActive: false }
    })
    setStatus('disconnected')
    // Reset después de que el backend haya procesado el flag
    setTimeout(() => { stoppingRef.current = false }, 3000)
  }, [])

  const triggerPanic = useCallback(async (panicType: string) => {
    const lat = location?.lat ?? 0
    const lng = location?.lng ?? 0
    const sent = await sendPanicAlert(VEHICLE_ID, lat, lng, panicType)
    await addAlert({
      message: sent ? 'Alerta de pánico enviada al servidor' : 'Botón de pánico activado — sin conexión',
      timestamp: new Date().toISOString(),
      type: 'PANIC_BUTTON',
    })
  }, [addAlert, location])

  return { status, location, trip, alerts, hasPermission, startTrip, stopTrip, triggerPanic }
}
