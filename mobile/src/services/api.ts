import axios from 'axios'

// En desarrollo apunta al backend local.
// En producción se reemplazaría con la URL real del servidor.
// Usa la IP local de tu Mac para que el celular físico pueda conectarse.
// localhost solo funciona en emulador, no en dispositivo real.
const BACKEND_URL = 'http://192.168.1.7:3001'

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

export async function sendPanicAlert(vehicle_id: string): Promise<boolean> {
  try {
    await client.post('/api/gps/ingest', {
      vehicle_id,
      lat: 0,
      lng: 0,
      timestamp: new Date().toISOString(),
      panic: true,
    })
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
