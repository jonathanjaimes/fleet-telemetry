import type { StatusBarStyle } from 'react-native'

export type ThemeMode = 'dark' | 'light'

export interface AppTheme {
  mode:      ThemeMode
  bg:        string
  surface:   string
  surface2:  string
  border:    string
  text:      string
  textMuted: string
  primary:   string
  primaryFg: string
  success:   string
  danger:    string
  warning:   string
  idle:      string
  statusBar: StatusBarStyle
}

export const darkTheme: AppTheme = {
  mode:      'dark',
  bg:        '#080f0d',
  surface:   '#0f1c18',
  surface2:  '#162822',
  border:    '#1e3830',
  text:      '#FDFDFD',
  textMuted: '#777777',
  primary:   '#00F1C7',
  primaryFg: '#003833',
  success:   '#1BA362',
  danger:    '#CC174A',
  warning:   '#F2DC18',
  idle:      '#0066FF',
  statusBar: 'light-content',
}

export const lightTheme: AppTheme = {
  mode:      'light',
  bg:        '#F5F5F7',
  surface:   '#FFFFFF',
  surface2:  '#EBEEF9',
  border:    '#DBDBDB',
  text:      '#000000',
  textMuted: '#555555',
  primary:   '#007868',
  primaryFg: '#FFFFFF',
  success:   '#1BA362',
  danger:    '#CC174A',
  warning:   '#8a7a00',
  idle:      '#0066FF',
  statusBar: 'dark-content',
}
