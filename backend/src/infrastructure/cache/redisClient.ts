import { createClient } from 'redis'

export const redisClient = createClient({
  url: process.env.REDIS_URL ?? 'redis://localhost:6379',
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
