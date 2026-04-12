import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import { useTelemetry } from './src/hooks/useTelemetry'
import { loginDriver } from './src/services/api'
import { saveSession, loadSession, clearSession } from './src/services/authStorage'
import type { LocalAlert } from './src/types'

const STATUS_CONFIG = {
  connected:    { label: 'Conectado',    color: '#22c55e', dot: '●' },
  disconnected: { label: 'Desconectado', color: '#ef4444', dot: '○' },
  sending:      { label: 'Enviando...',  color: '#f59e0b', dot: '●' },
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

// ─── Pantalla de login ────────────────────────────────────────────────────────
function LoginScreen({ onLogin }: { onLogin: (id: string) => void }) {
  const [uniqueId, setUniqueId] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const handleLogin = async () => {
    const id = uniqueId.trim().toUpperCase()
    if (!id) return
    setError('')
    setLoading(true)
    const result = await loginDriver(id)
    setLoading(false)
    if (result === 'ok') {
      await saveSession({ unique_id: id })
      onLogin(id)
    } else if (result === 'invalid_role') {
      setError('ID no reconocido o no es un conductor')
    } else {
      setError('No se pudo conectar al servidor')
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.loginBox}>
            <Text style={styles.loginLogo}>🚛</Text>
            <Text style={styles.loginTitle}>Fleet Telemetría</Text>
            <Text style={styles.loginSubtitle}>Ingresa tu ID de conductor</Text>

            <TextInput
              style={styles.loginInput}
              value={uniqueId}
              onChangeText={(t) => setUniqueId(t.toUpperCase())}
              placeholder="Ej: DRV-AB3C9"
              placeholderTextColor="#64748b"
              autoCapitalize="characters"
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
            />
            {error ? <Text style={styles.loginError}>{error}</Text> : null}
            <TouchableOpacity
              style={[styles.loginBtn, (!uniqueId.trim() || loading) && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={!uniqueId.trim() || loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Ingresar</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const PANIC_OPTIONS = [
  { type: 'PANIC_ACCIDENT',   label: '🚨 Accidente' },
  { type: 'PANIC_ROBBERY',    label: '🔫 Robo / Asalto' },
  { type: 'PANIC_MEDICAL',    label: '🚑 Emergencia médica' },
  { type: 'PANIC_MECHANICAL', label: '⚠️ Falla mecánica' },
  { type: 'PANIC_OTHER',      label: '🆘 Otra emergencia' },
]

// ─── Pantalla principal ───────────────────────────────────────────────────────
function TelemetryScreen({ driverId, onLogout }: { driverId: string; onLogout: () => void }) {
  const { status, location, trip, alerts, hasPermission, startTrip, stopTrip, triggerPanic } =
    useTelemetry(driverId)
  const [, forceRender]     = useState(0)
  const [panicModal, setPanicModal] = useState(false)
  const cfg = STATUS_CONFIG[status]

  const handleLogout = () => {
    if (trip.isActive) {
      Alert.alert('Viaje activo', 'Finaliza el viaje antes de cerrar sesión.')
      return
    }
    Alert.alert('Cerrar sesión', '¿Deseas salir?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Salir', style: 'destructive', onPress: onLogout },
    ])
  }

  const handlePanic = () => setPanicModal(true)

  const handleSelectPanic = (panicType: string) => {
    setPanicModal(false)
    triggerPanic(panicType)
  }

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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f1117" />

      <View style={styles.header}>
        <Text style={styles.headerTitle}>🚛 Fleet Telemetría</Text>
        <View style={styles.statusBadge}>
          <Text style={[styles.statusDot, { color: cfg.color }]}>{cfg.dot}</Text>
          <Text style={[styles.statusLabel, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Viaje actual</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutBtnText}>⏏ Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado</Text>
          <Text style={[styles.infoValue, { color: trip.isActive ? '#22c55e' : '#64748b' }]}>
            {trip.isActive ? 'EN CURSO' : 'DETENIDO'}
          </Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Conductor</Text>
          <Text style={styles.infoValue}>{driverId}</Text>
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

      <View style={styles.alertsSection}>
        <Text style={styles.alertsTitle}>Alertas locales ({alerts.length})</Text>
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {alerts.length === 0
            ? <Text style={styles.noAlerts}>Sin alertas registradas</Text>
            : alerts.map((a) => <AlertItem key={a.id} alert={a} />)
          }
        </ScrollView>
      </View>

      {/* Modal de tipo de pánico */}
      <Modal visible={panicModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>🚨 ¿Qué está pasando?</Text>
            <Text style={styles.modalSubtitle}>Selecciona el tipo de emergencia</Text>
            {PANIC_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.panicOption}
                onPress={() => handleSelectPanic(opt.type)}
              >
                <Text style={styles.panicOptionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.modalCancel} onPress={() => setPanicModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [driverId, setDriverId] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const validate = async () => {
      const s = await loadSession()
      if (s) {
        const result = await loginDriver(s.unique_id)
        if (result === 'ok') {
          setDriverId(s.unique_id)
        } else {
          await clearSession()
        }
      }
      setChecking(false)
    }
    validate()
  }, [])

  const handleLogout = async () => {
    await clearSession()
    setDriverId(null)
  }

  if (checking) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.container}>
          <ActivityIndicator color="#3b82f6" style={{ marginTop: 80 }} />
        </SafeAreaView>
      </SafeAreaProvider>
    )
  }

  if (!driverId) {
    return (
      <SafeAreaProvider>
        <LoginScreen onLogin={setDriverId} />
      </SafeAreaProvider>
    )
  }

  return (
    <SafeAreaProvider>
      <TelemetryScreen driverId={driverId} onLogout={handleLogout} />
    </SafeAreaProvider>
  )
}

const styles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#0f1117' },
  loadingText:    { color: '#64748b', textAlign: 'center', marginTop: 40, fontSize: 16 },
  errorText:      { color: '#ef4444', textAlign: 'center', marginTop: 40, fontSize: 16, padding: 20 },

  loginBox:       { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  loginLogo:      { fontSize: 56, marginBottom: 8 },
  loginTitle:     { color: '#e2e8f0', fontSize: 24, fontWeight: '700', marginBottom: 4 },
  loginSubtitle:  { color: '#64748b', fontSize: 14, marginBottom: 32 },
  loginInput:     { width: '100%', backgroundColor: '#1a1d27', borderWidth: 1, borderColor: '#2a2d3e', borderRadius: 10, padding: 16, color: '#e2e8f0', fontSize: 18, fontWeight: '700', textAlign: 'center', letterSpacing: 2, marginBottom: 12 },
  loginError:     { color: '#ef4444', fontSize: 13, marginBottom: 8, textAlign: 'center' },
  loginBtn:       { width: '100%', backgroundColor: '#3b82f6', borderRadius: 10, padding: 16, alignItems: 'center' },
  loginBtnDisabled: { opacity: 0.45 },
  loginBtnText:   { color: '#fff', fontSize: 16, fontWeight: '700' },

  header:         { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#2a2d3e' },
  headerTitle:    { color: '#e2e8f0', fontSize: 16, fontWeight: '700' },
  statusBadge:    { flexDirection: 'row', alignItems: 'center', gap: 4 },
  statusDot:      { fontSize: 10 },
  statusLabel:    { fontSize: 12, fontWeight: '600' },

  cardHeader:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  logoutBtn:      { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
  logoutBtnText:  { color: '#94a3b8', fontSize: 12, fontWeight: '600' },

  card:           { margin: 16, backgroundColor: '#1a1d27', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#2a2d3e' },
  cardTitle:      { color: '#64748b', fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
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

  modalOverlay:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalBox:       { backgroundColor: '#1a1d27', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
  modalTitle:     { color: '#e2e8f0', fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  modalSubtitle:  { color: '#64748b', fontSize: 13, textAlign: 'center', marginBottom: 20 },
  panicOption:    { backgroundColor: '#0f1117', borderWidth: 1, borderColor: '#2a2d3e', borderRadius: 12, padding: 16, marginBottom: 10 },
  panicOptionText:{ color: '#e2e8f0', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  modalCancel:    { marginTop: 6, padding: 14, alignItems: 'center' },
  modalCancelText:{ color: '#64748b', fontSize: 15 },
})
