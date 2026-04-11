import AsyncStorage from '@react-native-async-storage/async-storage'
import type { LocalAlert } from '../types'

const ALERTS_KEY = 'fleet:local_alerts'
const MAX_ALERTS = 50

export async function saveAlert(alert: LocalAlert): Promise<void> {
  try {
    const existing = await getAlerts()
    const updated = [alert, ...existing].slice(0, MAX_ALERTS)
    await AsyncStorage.setItem(ALERTS_KEY, JSON.stringify(updated))
  } catch (e) {
    console.error('[AlertStorage] Failed to save alert:', e)
  }
}

export async function getAlerts(): Promise<LocalAlert[]> {
  try {
    const raw = await AsyncStorage.getItem(ALERTS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export async function clearAlerts(): Promise<void> {
  await AsyncStorage.removeItem(ALERTS_KEY)
}
