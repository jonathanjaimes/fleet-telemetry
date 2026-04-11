import { useFleetStore } from '../../store/useFleetStore'
import { VehicleCard } from './VehicleCard'
import './vehicles.css'

export function VehiclePanel() {
  const vehicles = useFleetStore((s) => s.vehicles)
  const alerts = useFleetStore((s) => s.alerts)
  const selectedId = useFleetStore((s) => s.selectedVehicleId)
  const selectVehicle = useFleetStore((s) => s.selectVehicle)
  const isConnected = useFleetStore((s) => s.isConnected)

  const vehicleList = Object.values(vehicles)
  const alertCount = vehicleList.filter((v) => v.status === 'alert').length

  return (
    <aside className="vehicle-panel">
      <div className="vehicle-panel__header">
        <div className="vehicle-panel__title">
          <h2>Flota activa</h2>
          <span className="vehicle-panel__count">{vehicleList.length}</span>
        </div>
        <div className={`vehicle-panel__conn ${isConnected ? 'vehicle-panel__conn--on' : 'vehicle-panel__conn--off'}`}>
          {isConnected ? '● Conectado' : '○ Desconectado'}
        </div>
      </div>

      {alertCount > 0 && (
        <div className="vehicle-panel__alert-banner">
          ⚠️ {alertCount} vehículo{alertCount > 1 ? 's' : ''} en alerta
        </div>
      )}

      <div className="vehicle-panel__list">
        {vehicleList.length === 0 ? (
          <p className="vehicle-panel__empty">Esperando vehículos...</p>
        ) : (
          vehicleList.map((v) => (
            <VehicleCard
              key={v.id}
              vehicle={v}
              isSelected={selectedId === v.id}
              onClick={() => selectVehicle(selectedId === v.id ? null : v.id)}
            />
          ))
        )}
      </div>

      {alerts.length > 0 && (
        <div className="vehicle-panel__alerts">
          <h3>Alertas recientes</h3>
          <ul>
            {alerts.slice(0, 5).map((a) => (
              <li key={a.id}>
                <span className="alert-dot">🔴</span>
                <span>{a.vehicle_id} — {a.message}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </aside>
  )
}
