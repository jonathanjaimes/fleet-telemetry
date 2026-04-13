import { createClient } from 'redis'

const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redisClient = createClient({
  url: REDIS_URL,
  socket: REDIS_URL.startsWith('rediss://') ? { tls: true, rejectUnauthorized: false } : undefined,
})

redisClient.on('error', (err) => console.error('[Redis] Error:', err))

export async function connectRedis(): Promise<void> {
  await redisClient.connect()
  console.log('[Redis] Connected')
}

const DEDUP_TTL_SECONDS = 10

export async function isDuplicate(key: string): Promise<boolean> {
  const exists = await redisClient.get(key)
  if (exists) return true
  await redisClient.setEx(key, DEDUP_TTL_SECONDS, '1')
  return false
}

export async function cacheVehiclePosition(
  vehicle_id: string,
  lat: number,
  lng: number,
  timestamp: Date
): Promise<void> {
  await redisClient.setEx(
    `vehicle:${vehicle_id}`,
    300,
    JSON.stringify({ lat, lng, timestamp: timestamp.toISOString() })
  )
}

export async function getCachedVehiclePosition(
  vehicle_id: string
): Promise<{ lat: number; lng: number; timestamp: Date } | null> {
  const data = await redisClient.get(`vehicle:${vehicle_id}`)
  if (!data) return null
  const parsed = JSON.parse(data)
  return { ...parsed, timestamp: new Date(parsed.timestamp) }
}

export async function deleteCachedVehicle(vehicle_id: string): Promise<void> {
  await redisClient.del(`vehicle:${vehicle_id}`)
}

// Flag de parada manual: bloquea que un GPS tardío pise el estado "stopped"
const MANUAL_STOP_TTL_SECONDS = 15

export async function setManualStop(vehicle_id: string): Promise<void> {
  await redisClient.setEx(`manual_stop:${vehicle_id}`, MANUAL_STOP_TTL_SECONDS, '1')
}

export async function isManualStop(vehicle_id: string): Promise<boolean> {
  const val = await redisClient.get(`manual_stop:${vehicle_id}`)
  return val === '1'
}

export async function clearManualStop(vehicle_id: string): Promise<void> {
  await redisClient.del(`manual_stop:${vehicle_id}`)
}

// Rastreo de posición estacionaria: para detectar vehículos genuinamente detenidos
// sin falsas alarmas por gaps de conectividad o app en segundo plano

export async function getStoppedSince(vehicle_id: string): Promise<Date | null> {
  const val = await redisClient.get(`stopped_since:${vehicle_id}`)
  if (!val) return null
  return new Date(Number(val))
}

export async function setStoppedSince(vehicle_id: string, since: Date): Promise<void> {
  // TTL generoso: si no llegan más lecturas, el flag expira solo
  await redisClient.setEx(`stopped_since:${vehicle_id}`, 600, String(since.getTime()))
}

export async function clearStoppedSince(vehicle_id: string): Promise<void> {
  await redisClient.del(`stopped_since:${vehicle_id}`)
}

// Flag de vehículo eliminado: impide que GPS tardíos lo recreen en DB
const DELETED_TTL_SECONDS = 30

export async function setDeletedFlag(vehicle_id: string): Promise<void> {
  await redisClient.setEx(`deleted:${vehicle_id}`, DELETED_TTL_SECONDS, '1')
}

export async function isDeletedFlag(vehicle_id: string): Promise<boolean> {
  const val = await redisClient.get(`deleted:${vehicle_id}`)
  return val === '1'
}

export async function clearDeletedFlag(vehicle_id: string): Promise<void> {
  await redisClient.del(`deleted:${vehicle_id}`)
}
