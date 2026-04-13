import { createContext, useContext } from 'react'
import { darkTheme } from '../theme/theme'
import type { AppTheme } from '../theme/theme'

interface ThemeCtx {
  theme: AppTheme
  toggleTheme: () => void
}

export const ThemeContext = createContext<ThemeCtx>({
  theme: darkTheme,
  toggleTheme: () => {},
})

export const useThemeCtx = () => useContext(ThemeContext)
