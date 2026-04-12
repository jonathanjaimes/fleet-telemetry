import { useState, useEffect } from 'react'
import type { Vehicle } from '../../types'
import { ALERT_CONFIG } from '../../types'
import './vehicles.css'

interface Props {
  vehicle: Vehicle
  isSelected: boolean
  onClick: () => void
  onDelete: (id: string) => void
}

const STATUS_CONFIG = {
  moving:  { label: 'En movimiento',       color: 'success', icon: '🟢' },
  idle:    { label: 'Inactivo',            color: 'idle',    icon: '🔵' },
  stopped: { label: 'Detenido por conductor', color: 'warning', icon: '🟡' },
  alert:   { label: 'Alerta',             color: 'danger',  icon: '🔴' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  })
}

export function VehicleCard({ vehicle, isSelected, onClick, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false)
  const [, forceRender] = useState(0)
  const config = STATUS_CONFIG[vehicle.status]

  const showAlertChip =
    vehicle.lastAlertType &&
    vehicle.alertChipExpiry &&
    Date.now() < vehicle.alertChipExpiry

  useEffect(() => {
    if (!vehicle.alertChipExpiry) return
    const remaining = vehicle.alertChipExpiry - Date.now()
    if (remaining <= 0) return
    const timer = setTimeout(() => forceRender((n) => n + 1), remaining)
    return () => clearTimeout(timer)
  }, [vehicle.alertChipExpiry])

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(true)
  }

  const handleConfirm = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDelete(vehicle.id)
    setConfirming(false)
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.stopPropagation()
    setConfirming(false)
  }

  return (
    <div
      className={`vehicle-card ${isSelected ? 'vehicle-card--selected' : ''} vehicle-card--${config.color}`}
      onClick={onClick}
    >
      <div className="vehicle-card__header">
        <span className="vehicle-card__icon">{config.icon}</span>
        <span className="vehicle-card__id">{vehicle.label}</span>
        <span className={`vehicle-card__badge vehicle-card__badge--${config.color}`}>
          {config.label}
        </span>
        {!confirming && (
          <button className="vehicle-card__delete" onClick={handleDeleteClick} title="Eliminar vehículo">
            ✕
          </button>
        )}
      </div>

      {confirming ? (
        <div className="vehicle-card__confirm">
          <span>¿Eliminar {vehicle.id}?</span>
          <div className="vehicle-card__confirm-actions">
            <button className="vehicle-card__confirm-yes" onClick={handleConfirm}>Eliminar</button>
            <button className="vehicle-card__confirm-no"  onClick={handleCancel}>Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          {showAlertChip && vehicle.lastAlertType && (
            <div className="vehicle-card__alert-type">
              {ALERT_CONFIG[vehicle.lastAlertType].icon}{' '}
              {ALERT_CONFIG[vehicle.lastAlertType].label}
            </div>
          )}
          <div className="vehicle-card__meta">
            <span>{vehicle.lat.toFixed(4)}, {vehicle.lng.toFixed(4)}</span>
            <span>{formatTime(vehicle.lastSeen)}</span>
          </div>
        </>
      )}
    </div>
  )
}
