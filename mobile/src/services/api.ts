import axios from 'axios'
import Constants from 'expo-constants'

// Detecta automáticamente la IP de la máquina donde corre Expo en desarrollo.
// Así el jurado no necesita configurar nada manualmente.
// En producción apuntaría a la URL real del servidor en la nube.
function getBackendUrl(): string {
  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0]
  if (expoHost) return `http://${expoHost}:3001`
  return 'http://localhost:3001'
}

const BACKEND_URL = getBackendUrl()

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
