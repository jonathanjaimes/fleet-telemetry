import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import './LoginPage.css'

const BACKEND = 'http://localhost:3001'

export function LoginPage() {
  const login = useAuthStore((s) => s.login)
  const [uniqueId, setUniqueId] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!uniqueId.trim()) return
    setError('')
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ unique_id: uniqueId.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? 'ID no reconocido')
        return
      }
      const user = await res.json()
      if (user.role === 'driver') {
        setError('Este ID es para la app móvil, no el dashboard')
        return
      }
      login(user)
    } catch {
      setError('No se pudo conectar al servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-card__logo">🚛</div>
        <h1 className="login-card__title">Fleet Telemetry</h1>
        <p className="login-card__subtitle">Ingresa tu ID único para acceder</p>

        <form onSubmit={handleSubmit} className="login-form">
          <input
            className="login-input"
            type="text"
            placeholder="Ej: SUPER-001 o FLT-AB3C9"
            value={uniqueId}
            onChange={(e) => setUniqueId(e.target.value.toUpperCase())}
            autoFocus
            autoComplete="off"
          />
          {error && <p className="login-error">{error}</p>}
          <button className="login-btn" type="submit" disabled={loading || !uniqueId.trim()}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
