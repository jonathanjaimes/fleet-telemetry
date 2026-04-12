import { useState } from 'react'
import { useFleetStore } from '../../store/useFleetStore'
import { VehicleCard } from './VehicleCard'
import './vehicles.css'

type Tab = 'fleet' | 'alerts'

const ALERT_ICONS: Record<string, string> = {
  VEHICLE_STOPPED: '🟡',
  PANIC_BUTTON:    '🚨',
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} ${time}`
}

export function VehiclePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('fleet')

  const vehicles      = useFleetStore((s) => s.vehicles)
  const alerts        = useFleetStore((s) => s.alerts)
  const selectedId    = useFleetStore((s) => s.selectedVehicleId)
  const selectVehicle = useFleetStore((s) => s.selectVehicle)
  const isConnected   = useFleetStore((s) => s.isConnected)

  const vehicleList = Object.values(vehicles)
  const alertCount  = vehicleList.filter((v) => v.status === 'alert').length
  const newAlerts   = alerts.length

  return (
    <aside className="vehicle-panel">

      {/* Header */}
      <div className="vehicle-panel__header">
        <div className={`vehicle-panel__conn ${isConnected ? 'vehicle-panel__conn--on' : 'vehicle-panel__conn--off'}`}>
          {isConnected ? '● Conectado' : '○ Desconectado'}
        </div>
      </div>

      {/* Tabs */}
      <div className="panel-tabs">
        <button
          className={`panel-tab ${activeTab === 'fleet' ? 'panel-tab--active' : ''}`}
          onClick={() => setActiveTab('fleet')}
        >
          🚛 Flota
          <span className="panel-tab__badge">{vehicleList.length}</span>
        </button>
        <button
          className={`panel-tab ${activeTab === 'alerts' ? 'panel-tab--active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          🔔 Alertas
          {newAlerts > 0 && (
            <span className="panel-tab__badge panel-tab__badge--danger">{newAlerts}</span>
          )}
        </button>
      </div>

      {/* Banner de alertas activas */}
      {alertCount > 0 && activeTab === 'fleet' && (
        <div className="vehicle-panel__alert-banner">
          ⚠️ {alertCount} vehículo{alertCount > 1 ? 's' : ''} en alerta —{' '}
          <button className="banner-link" onClick={() => setActiveTab('alerts')}>
            ver alertas
          </button>
        </div>
      )}

      {/* Tab: Flota */}
      {activeTab === 'fleet' && (
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
      )}

      {/* Tab: Alertas */}
      {activeTab === 'alerts' && (
        <div className="alerts-panel">
          {alerts.length === 0 ? (
            <p className="vehicle-panel__empty">Sin alertas registradas</p>
          ) : (
            <ul className="alerts-list">
              {alerts.map((alert) => (
                <li key={alert.id} className="alert-item">
                  <div className="alert-item__icon">
                    {ALERT_ICONS[alert.type ?? ''] ?? '⚠️'}
                  </div>
                  <div className="alert-item__body">
                    <div className="alert-item__vehicle">{alert.vehicle_id}</div>
                    <div className="alert-item__message">{alert.message}</div>
                    <div className="alert-item__time">
                      🕐 {formatDateTime(alert.timestamp)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  )
}
