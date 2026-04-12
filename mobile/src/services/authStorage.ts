import AsyncStorage from '@react-native-async-storage/async-storage'

const AUTH_KEY = 'driver_auth'

export interface DriverSession {
  unique_id: string
}

export async function saveSession(session: DriverSession): Promise<void> {
  await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(session))
}

export async function loadSession(): Promise<DriverSession | null> {
  const raw = await AsyncStorage.getItem(AUTH_KEY)
  if (!raw) return null
  return JSON.parse(raw)
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_KEY)
}
