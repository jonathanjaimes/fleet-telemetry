import { useState } from 'react'
import { Truck, Bell, AlertTriangle, Clock, CheckCircle, CircleAlert } from 'lucide-react'
import { useFleetStore } from '../../store/useFleetStore'
import { useAuthStore } from '../../store/useAuthStore'
import { VehicleCard } from './VehicleCard'
import { ALERT_CONFIG } from '../../types'
import type { AlertType } from '../../types'
import './vehicles.css'

const BACKEND = 'http://localhost:3001'

type Tab = 'fleet' | 'alerts'

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  const date = d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  const time = d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return `${date} ${time}`
}

export function VehiclePanel() {
  const [activeTab, setActiveTab] = useState<Tab>('fleet')
  const [confirmingId, setConfirmingId] = useState<string | null>(null)

  const vehicles      = useFleetStore((s) => s.vehicles)
  const alerts        = useFleetStore((s) => s.alerts)
  const selectedId    = useFleetStore((s) => s.selectedVehicleId)
  const selectVehicle = useFleetStore((s) => s.selectVehicle)
  const isConnected   = useFleetStore((s) => s.isConnected)
  const resolveAlert  = useFleetStore((s) => s.resolveAlert)
  const user          = useAuthStore((s) => s.user)

  const vehicleList = Object.values(vehicles)
  const alertCount  = vehicleList.filter((v) => v.status === 'alert').length

  const pending  = alerts.filter((a) => !a.resolved)
  const resolved = alerts.filter((a) => a.resolved)

  const handleDelete = async (id: string) => {
    await fetch(`${BACKEND}/api/vehicles/${id}`, { method: 'DELETE' })
  }

  const handleResolve = async (id: string) => {
    const res = await fetch(`${BACKEND}/api/alerts/${id}/resolve`, {
      method: 'PATCH',
      headers: { 'x-user-id': user?.unique_id ?? '' },
    })
    if (!res.ok) return
    const alert = alerts.find((a) => a.id === id)
    if (alert) resolveAlert(id, alert.vehicle_id, alert.type ?? '')
    setConfirmingId(null)
  }

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
          <Truck size={14} /> Flota
          <span className="panel-tab__badge">{vehicleList.length}</span>
        </button>
        <button
          className={`panel-tab ${activeTab === 'alerts' ? 'panel-tab--active' : ''}`}
          onClick={() => setActiveTab('alerts')}
        >
          <Bell size={14} /> Alertas
          {pending.length > 0 && (
            <span className="panel-tab__badge panel-tab__badge--danger">{pending.length}</span>
          )}
        </button>
      </div>

      {/* Banner de alertas activas */}
      {alertCount > 0 && activeTab === 'fleet' && (
        <div className="vehicle-panel__alert-banner">
          <AlertTriangle size={13} /> {alertCount} vehículo{alertCount > 1 ? 's' : ''} en alerta —{' '}
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
                onDelete={handleDelete}
              />
            ))
          )}
        </div>
      )}

      {/* Tab: Alertas */}
      {activeTab === 'alerts' && (
        <div className="alerts-panel">

          {/* Pendientes — crece y tiene scroll propio */}
          <div className="alerts-panel__pending">
            <div className="alerts-section-header" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <CircleAlert size={13} />
              <span>Por solucionar</span>
              {pending.length > 0 && (
                <span className="alerts-section-count alerts-section-count--danger">{pending.length}</span>
              )}
            </div>
            {pending.length === 0 ? (
              <p className="vehicle-panel__empty vehicle-panel__empty--sm">Sin alertas pendientes</p>
            ) : (
              <ul className="alerts-list">
                {pending.map((alert) => (
                  <li key={alert.id} className="alert-item">
                    <div className="alert-item__icon">
                      {alert.type && ALERT_CONFIG[alert.type as AlertType]
                        ? ALERT_CONFIG[alert.type as AlertType].icon
                        : <AlertTriangle size={14} />}
                    </div>
                    <div className="alert-item__body">
                      <div className="alert-item__vehicle">{alert.vehicle_id}</div>
                      <div className="alert-item__message">{alert.message}</div>
                      <div className="alert-item__time">
                        <Clock size={11} /> {formatDateTime(alert.timestamp)}
                      </div>
                    </div>
                    <button
                      className="alert-resolve-btn"
                      onClick={() => setConfirmingId(alert.id)}
                      title="Marcar como solucionada"
                    >
                      <CheckCircle size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Solucionadas — fija al fondo, max 38% de altura */}
          <div className="alerts-panel__resolved">
            <div className="alerts-section-header alerts-section-header--resolved" style={{ paddingLeft: 0, paddingRight: 0, borderTop: 'none', marginTop: 0 }}>
              <CheckCircle size={13} />
              <span>Solucionadas</span>
              {resolved.length > 0 && (
                <span className="alerts-section-count">{resolved.length}</span>
              )}
            </div>
            {resolved.length === 0 ? (
              <p className="vehicle-panel__empty vehicle-panel__empty--sm">Sin alertas solucionadas</p>
            ) : (
              <ul className="alerts-list alerts-list--resolved">
                {resolved.map((alert) => (
                  <li key={alert.id} className="alert-item alert-item--resolved">
                    <div className="alert-item__icon alert-item__icon--resolved">
                      {alert.type && ALERT_CONFIG[alert.type as AlertType]
                        ? ALERT_CONFIG[alert.type as AlertType].icon
                        : <AlertTriangle size={14} />}
                    </div>
                    <div className="alert-item__body">
                      <div className="alert-item__vehicle">{alert.vehicle_id}</div>
                      <div className="alert-item__message">{alert.message}</div>
                      <div className="alert-item__time">
                        <Clock size={11} /> {formatDateTime(alert.timestamp)}
                      </div>
                    </div>
                    <CheckCircle size={14} className="alert-resolved-check" />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal de confirmación de resolución */}
      {confirmingId && (
        <div className="resolve-modal-overlay" onClick={() => setConfirmingId(null)}>
          <div className="resolve-modal" onClick={(e) => e.stopPropagation()}>
            <CheckCircle size={28} className="resolve-modal__icon" />
            <p className="resolve-modal__title">¿Confirmar resolución?</p>
            <p className="resolve-modal__body">
              Marca esta alerta como solucionada. Si el vehículo estaba en estado de alerta por ausencia de movimiento, pasará a inactivo.
            </p>
            <div className="resolve-modal__actions">
              <button className="resolve-modal__confirm" onClick={() => handleResolve(confirmingId)}>
                Sí, está solucionada
              </button>
              <button className="resolve-modal__cancel" onClick={() => setConfirmingId(null)}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
