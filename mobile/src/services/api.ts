import axios from 'axios'
import Constants from 'expo-constants'

// Detecta la URL del backend según el entorno:
// - Si hay variable de entorno EXPO_PUBLIC_BACKEND_URL → la usa (producción o tunnel manual)
// - Si Expo corre en LAN → usa la IP de la máquina automáticamente
// - Fallback → localhost
function getBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  if (envUrl) return envUrl

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0]
  if (expoHost && !expoHost.includes('exp.direct')) {
    return `http://${expoHost}:3001`
  }

  return 'http://localhost:3001'
}

const BACKEND_URL = getBackendUrl()
console.log('[API] Backend URL:', BACKEND_URL)

const client = axios.create({
  baseURL: BACKEND_URL,
  timeout: 5000,
})

export interface GpsPayload {
  vehicle_id: string
  lat: number
  lng: number
  timestamp: string
}

export async function sendGpsReading(payload: GpsPayload): Promise<'accepted' | 'duplicate' | 'error'> {
  try {
    const res = await client.post('/api/gps/ingest', payload)
    if (res.status === 201) return 'accepted'
    if (res.status === 409) return 'duplicate'
    return 'error'
  } catch {
    return 'error'
  }
}

export async function sendTripStop(vehicle_id: string): Promise<void> {
  try {
    await client.post(`/api/vehicles/${vehicle_id}/stop`)
  } catch {
    // Si falla, el backend lo detectará por inactividad
  }
}

export async function sendPanicAlert(vehicle_id: string, lat: number, lng: number): Promise<boolean> {
  try {
    await client.post(`/api/vehicles/${vehicle_id}/panic`, { lat, lng })
    return true
  } catch {
    return false
  }
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await client.get('/health')
    return res.status === 200
  } catch {
    return false
  }
}
