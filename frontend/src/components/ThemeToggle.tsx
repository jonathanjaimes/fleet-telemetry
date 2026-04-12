import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../hooks/useTheme'

interface Props {
  floating?: boolean
}

export function ThemeToggle({ floating }: Props) {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      className={`theme-toggle${floating ? ' theme-toggle--floating' : ''}`}
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
    >
      {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
