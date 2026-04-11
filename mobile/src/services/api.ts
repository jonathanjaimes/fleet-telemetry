import axios from 'axios'

// En desarrollo apunta al backend local.
// En producción se reemplazaría con la URL real del servidor.
// URL pública temporal via Cloudflare Tunnel para pruebas con dispositivo físico.
// En producción se reemplaza con la URL real del servidor.
const BACKEND_URL = 'https://causes-bone-carried-href.trycloudflare.com'

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
