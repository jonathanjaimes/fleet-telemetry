import { useEffect, useState } from 'react'
import { Truck } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { VehiclePanel } from '../features/vehicles/VehiclePanel'
import { FleetMap } from '../features/map/FleetMap'
import { useSocket } from '../hooks/useSocket'
import { useFleetStore } from '../store/useFleetStore'
import { ThemeToggle } from '../components/ThemeToggle'
import './AdminPage.css'
import '../App.css'

const BACKEND = 'http://localhost:3001'

interface DriverUser {
  id: string
  unique_id: string
  created_at: string
}

type View = 'dashboard' | 'drivers'

export function FleetPage() {
  useSocket()
  const user       = useAuthStore((s) => s.user)
  const logout     = useAuthStore((s) => s.logout)
  const isConnected = useFleetStore((s) => s.isConnected)
  const [view, setView]           = useState<View>('dashboard')
  const [drivers, setDrivers]     = useState<DriverUser[]>([])
  const [loading, setLoading]     = useState(false)
  const [creating, setCreating]   = useState(false)

  const headers = { 'Content-Type': 'application/json', 'x-user-id': user?.unique_id ?? '' }

  const fetchDrivers = async () => {
    setLoading(true)
    const res = await fetch(`${BACKEND}/api/users/drivers`, { headers })
    if (res.ok) setDrivers(await res.json())
    setLoading(false)
  }

  useEffect(() => {
    if (view === 'drivers') fetchDrivers()
  }, [view])

  const deleteDriver = async (uniqueId: string) => {
    if (!window.confirm(`¿Eliminar conductor ${uniqueId}?`)) return
    await fetch(`${BACKEND}/api/users/drivers/${uniqueId}`, { method: 'DELETE', headers })
    await fetchDrivers()
  }

  const createDriver = async () => {
    setCreating(true)
    const res = await fetch(`${BACKEND}/api/users/drivers`, { method: 'POST', headers })
    if (res.ok) await fetchDrivers()
    setCreating(false)
  }

  return (
    <div className="app">
      <header className="app-header">
        <Truck size={20} strokeWidth={1.5} />
        <h1>Fleet Telemetry</h1>
        <nav className="app-header__nav">
          <button
            className={`app-header__nav-btn ${view === 'dashboard' ? 'active' : ''}`}
            onClick={() => setView('dashboard')}
          >Dashboard</button>
          <button
            className={`app-header__nav-btn ${view === 'drivers' ? 'active' : ''}`}
            onClick={() => setView('drivers')}
          >Conductores</button>
        </nav>
        <span className={`badge ${isConnected ? 'badge--on' : 'badge--off'}`}>
          {isConnected ? 'En vivo' : 'Sin conexión'}
        </span>
        <span className="admin-header__id">{user?.unique_id}</span>
        <ThemeToggle />
        <button className="admin-logout" onClick={logout}>Salir</button>
      </header>

      {view === 'dashboard' ? (
        <div className="app-body">
          <VehiclePanel />
          <FleetMap />
        </div>
      ) : (
        <main className="admin-main">
          <div className="admin-section">
            <div className="admin-section__header">
              <h2>Conductores</h2>
              <button className="admin-btn" onClick={createDriver} disabled={creating}>
                {creating ? 'Creando...' : '+ Crear conductor'}
              </button>
            </div>
            <p className="admin-hint">
              Comparte el <strong>ID Único</strong> con el conductor para que inicie sesión en la app móvil.
            </p>

            {loading ? (
              <p className="admin-empty">Cargando...</p>
            ) : drivers.length === 0 ? (
              <p className="admin-empty">No hay conductores creados aún</p>
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>ID Único (compartir con conductor)</th>
                      <th>Fecha creación</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => (
                      <tr key={d.id}>
                        <td><code className="uid-code uid-code--driver">{d.unique_id}</code></td>
                        <td>{new Date(d.created_at).toLocaleString('es-CO')}</td>
                        <td>
                          <button
                            className="table-delete-btn"
                            onClick={() => deleteDriver(d.unique_id)}
                            title="Eliminar"
                          >✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}
    </div>
  )
}
