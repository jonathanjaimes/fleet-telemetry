import './App.css'
import { VehiclePanel } from './features/vehicles/VehiclePanel'
import { FleetMap } from './features/map/FleetMap'
import { useSocket } from './hooks/useSocket'
import { useFleetStore } from './store/useFleetStore'

function App() {
  useSocket()
  const isConnected = useFleetStore((s) => s.isConnected)

  return (
    <div className="app">
      <header className="app-header">
        <span>🚛</span>
        <h1>Fleet Telemetry</h1>
        <span className={`badge ${isConnected ? 'badge--on' : 'badge--off'}`}>
          {isConnected ? 'En vivo' : 'Sin conexión'}
        </span>
      </header>
      <div className="app-body">
        <VehiclePanel />
        <FleetMap />
      </div>
    </div>
  )
}

export default App
