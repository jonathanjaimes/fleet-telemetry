import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import './AdminPage.css'

const BACKEND = 'http://localhost:3001'

interface FleetUser {
  id: string
  unique_id: string
  role: string
  created_at: string
}

export function SuperAdminPage() {
  const user    = useAuthStore((s) => s.user)
  const logout  = useAuthStore((s) => s.logout)
  const [fleetUsers, setFleetUsers] = useState<FleetUser[]>([])
  const [loading, setLoading]       = useState(false)
  const [creating, setCreating]     = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.unique_id ?? '' }

  const fetchFleet = async () => {
    setLoading(true)
    const res = await fetch(`${BACKEND}/api/users/fleet`, { headers })
    if (res.ok) setFleetUsers(await res.json())
    setLoading(false)
  }

  useEffect(() => { fetchFleet() }, [])

  const createFleetUser = async () => {
    setCreating(true)
    const res = await fetch(`${BACKEND}/api/users/fleet`, { method: 'POST', headers })
    if (res.ok) await fetchFleet()
    setCreating(false)
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="admin-header__left">
          <span>🚛</span>
          <h1>Fleet Telemetry</h1>
          <span className="admin-header__badge admin-header__badge--super">Superadmin</span>
        </div>
        <div className="admin-header__right">
          <span className="admin-header__id">{user?.unique_id}</span>
          <button className="admin-logout" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <main className="admin-main">
        <div className="admin-section">
          <div className="admin-section__header">
            <h2>Usuarios Flota</h2>
            <button className="admin-btn" onClick={createFleetUser} disabled={creating}>
              {creating ? 'Creando...' : '+ Crear usuario flota'}
            </button>
          </div>

          {loading ? (
            <p className="admin-empty">Cargando...</p>
          ) : fleetUsers.length === 0 ? (
            <p className="admin-empty">No hay usuarios flota creados aún</p>
          ) : (
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>ID Único</th>
                    <th>Fecha creación</th>
                  </tr>
                </thead>
                <tbody>
                  {fleetUsers.map((u) => (
                    <tr key={u.id}>
                      <td><code className="uid-code">{u.unique_id}</code></td>
                      <td>{new Date(u.created_at).toLocaleString('es-CO')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
