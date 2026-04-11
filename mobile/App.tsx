import { useState } from 'react'
import {
  View, Text, TouchableOpacity, ScrollView,
  StyleSheet, SafeAreaView, StatusBar, Alert,
} from 'react-native'
import { useTelemetry } from './src/hooks/useTelemetry'
import type { LocalAlert } from './src/types'

const STATUS_CONFIG = {
  connected:    { label: 'Conectado',     color: '#22c55e', dot: '●' },
  disconnected: { label: 'Desconectado',  color: '#ef4444', dot: '○' },
  sending:      { label: 'Enviando...',   color: '#f59e0b', dot: '●' },
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function formatDuration(startedAt: string): string {
  const seconds = Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000)
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0')
  const s = String(seconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

function AlertItem({ alert }: { alert: LocalAlert }) {
  const icons = { PANIC_BUTTON: '🚨', CONNECTION_LOST: '📡', VEHICLE_STOPPED: '⚠️' }
  return (
    <View style={styles.alertItem}>
      <Text style={styles.alertIcon}>{icons[alert.type]}</Text>
      <View style={styles.alertBody}>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
      </View>
    </View>
  )
}

export default function App() {
  const { status, location, trip, alerts, hasPermission, startTrip, stopTrip, triggerPanic } = useTelemetry()
  const [, forceRender] = useState(0)
  const cfg = STATUS_CONFIG[status]

  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loadingText}>Solicitando permisos GPS...</Text>
      </SafeAreaView>
    )
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>⚠️ Se requiere permiso de ubicación para esta app.</Text>
      </SafeAreaView>
    )
  }

  const handlePanic = () => {
    Alert.alert('⚠️ Botón de Pánico', '¿Confirmas que necesitas ayuda?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Enviar Alerta', style: 'destructive', onPress: triggerPanic },
    ])
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚛 Fleet Telemetría</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusDot, { color: cfg.color }]}>{cfg.dot}</Text>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      {/* Info del viaje */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Viaje actual</Text>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado</Text>
          <Text style={[styles.infoValue, { color: trip.isActive ? '#22c55e' : '#64748b' }]}>
            {trip.isActive ? 'EN CURSO' : 'DETENIDO'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Vehículo</Text>
          <Text style={styles.infoValue}>{trip.vehicleId}</Text>
        </View>
        {trip.startedAt && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Duración</Text>
            <Text style={styles.infoValue} onPress={() => forceRender(n => n + 1)}>
              {formatDuration(trip.startedAt)}
            </Text>
          </View>
        )}
        {location && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Posición</Text>
            <Text style={styles.infoValue}>
              {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
            </Text>
          </View>
        )}
      </View>

      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.tripBtn, trip.isActive ? styles.tripBtnStop : styles.tripBtnStart]}
          onPress={trip.isActive ? stopTrip : startTrip}
        >
          <Text style={styles.tripBtnText}>
            {trip.isActive ? '⏹  Finalizar viaje' : '▶  Iniciar viaje'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.panicBtn} onPress={handlePanic}>
          <Text style={styles.panicBtnText}>🚨  PÁNICO</Text>
        </TouchableOpacity>
      </View>

      {/* Historial de alertas */}
      <View style={styles.alertsSection}>
        <Text style={styles.alertsTitle}>Alertas locales ({alerts.length})</Text>
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {alerts.length === 0
            ? <Text style={styles.noAlerts}>Sin alertas registradas</Text>
            : alerts.map((a) => <AlertItem key={a.id} alert={a} />)
          }
        </ScrollView>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f1117' },
  loadingText:    { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
  errorText:      { color: '#ef4444', textAlign: 'center', marginTop: 40, fontSize: 16, padding: 20 },

  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d3e' },
  headerTitle:    { color: '#e2e8f0', fontSize: 18, fontWeight: '700' },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot:      { fontSize: 10 },
  statusLabel:    { fontSize: 12, fontWeight: '600' },

  card:           { margin: 16, backgroundColor: '#1a1d27', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2d3e' },
  cardTitle:      { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  infoRow:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  infoLabel:      { color: '#64748b', fontSize: 14 },
  infoValue:      { color: '#e2e8f0', fontSize: 14, fontWeight: '600' },

  controls:       { paddingHorizontal: 16, gap: 12 },
  tripBtn:        { borderRadius: 12, padding: 16, alignItems: 'center' },
  tripBtnStart:   { backgroundColor: '#22c55e' },
  tripBtnStop:    { backgroundColor: '#2a2d3e', borderWidth: 1, borderColor: '#3b82f6' },
  tripBtnText:    { color: '#fff', fontSize: 16, fontWeight: '700' },

  panicBtn:       { backgroundColor: '#ef4444', borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: '#fca5a5' },
  panicBtnText:   { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },

  alertsSection:  { flex: 1, margin: 16, marginTop: 12 },
  alertsTitle:    { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  alertsList:     { flex: 1 },
  noAlerts:       { color: '#64748b', fontSize: 14, textAlign: 'center', marginTop: 16 },

  alertItem:      { flexDirection: 'row', backgroundColor: '#1a1d27', borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#2a2d3e', gap: 10 },
  alertIcon:      { fontSize: 18 },
  alertBody:      { flex: 1 },
  alertMessage:   { color: '#e2e8f0', fontSize: 13, marginBottom: 4 },
  alertTime:      { color: '#64748b', fontSize: 11 },
})
