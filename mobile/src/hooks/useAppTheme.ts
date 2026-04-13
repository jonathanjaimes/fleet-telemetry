import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { darkTheme, lightTheme } from '../theme/theme'
import type { AppTheme, ThemeMode } from '../theme/theme'

const THEME_KEY = 'fleet-theme'

export function useAppTheme(): { theme: AppTheme; toggleTheme: () => void } {
  const [mode, setMode] = useState<ThemeMode>('dark')

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark') setMode(saved)
    })
  }, [])

  const toggleTheme = async () => {
    const next: ThemeMode = mode === 'dark' ? 'light' : 'dark'
    setMode(next)
    await AsyncStorage.setItem(THEME_KEY, next)
  }

  return {
    theme: mode === 'dark' ? darkTheme : lightTheme,
    toggleTheme,
  }
}
