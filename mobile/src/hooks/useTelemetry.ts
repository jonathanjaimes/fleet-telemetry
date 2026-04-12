import { useState, useEffect, useRef, useCallback } from 'react'
import * as Location from 'expo-location'
import { sendGpsReading, sendPanicAlert, sendTripStop } from '../services/api'
import { saveAlert, getAlerts } from '../services/alertStorage'
import type { ConnectionStatus, LocalAlert, TripState } from '../types'

const VEHICLE_ID = 'mobile-driver-01'
const SEND_INTERVAL_MS = 4000

export function useTelemetry() {
  const [status, setStatus]           = useState<ConnectionStatus>('disconnected')
  const [location, setLocation]       = useState<{ lat: number; lng: number } | null>(null)
  const [trip, setTrip]               = useState<TripState>({ isActive: false, startedAt: null, vehicleId: VEHICLE_ID })
  const [alerts, setAlerts]           = useState<LocalAlert[]>([])
  const [hasPermission, setPermission] = useState<boolean | null>(null)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Solicitar permisos de GPS al montar
  useEffect(() => {
    Location.requestForegroundPermissionsAsync().then(({ status: s }) => {
      setPermission(s === 'granted')
    })
    getAlerts().then(setAlerts)
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
      try {
        setStatus('sending')
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
        const { latitude: lat, longitude: lng } = loc.coords
        setLocation({ lat, lng })

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
    setTrip({ isActive: true, startedAt: new Date().toISOString(), vehicleId: VEHICLE_ID })
    setStatus('connected')
  }, [])

  const stopTrip = useCallback(() => {
    setTrip((prev) => {
      sendTripStop(prev.vehicleId)
      return { ...prev, isActive: false }
    })
    setStatus('disconnected')
    if (intervalRef.current) clearInterval(intervalRef.current)
  }, [])

  const triggerPanic = useCallback(async () => {
    const lat = location?.lat ?? 0
    const lng = location?.lng ?? 0
    const sent = await sendPanicAlert(VEHICLE_ID, lat, lng)
    await addAlert({
      message: sent ? '🚨 Botón de pánico activado — alerta enviada al servidor' : '🚨 Botón de pánico activado — sin conexión',
      timestamp: new Date().toISOString(),
      type: 'PANIC_BUTTON',
    })
  }, [addAlert, location])

  return { status, location, trip, alerts, hasPermission, startTrip, stopTrip, triggerPanic }
}
