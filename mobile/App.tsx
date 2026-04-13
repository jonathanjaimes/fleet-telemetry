import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, StatusBar, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Modal,
} from 'react-native'
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context'
import * as SplashScreen from 'expo-splash-screen'

// Mantener el splash visible hasta que la app esté lista
SplashScreen.preventAutoHideAsync()
import { Ionicons, MaterialIcons } from '@expo/vector-icons'
import { useTelemetry } from './src/hooks/useTelemetry'
import { loginDriver } from './src/services/api'
import { saveSession, loadSession, clearSession } from './src/services/authStorage'
import { ThemeContext, useThemeCtx } from './src/context/ThemeContext'
import { useAppTheme } from './src/hooks/useAppTheme'
import type { AppTheme } from './src/theme/theme'
import type { LocalAlert } from './src/types'

// ─── Estilos dinámicos ────────────────────────────────────────────────────────

function makeStyles(t: AppTheme) {
  return StyleSheet.create({
    container:    { flex: 1, backgroundColor: t.bg },
    loadingText:  { color: t.textMuted, textAlign: 'center', marginTop: 40, fontSize: 16 },
    errorText:    { color: t.danger, textAlign: 'center', marginTop: 40, fontSize: 16, padding: 20 },

    // Login
    loginBox:         { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
    loginLogo:        { marginBottom: 8 },
    loginTitle:       { color: t.text, fontSize: 24, fontWeight: '700', marginBottom: 4 },
    loginSubtitle:    { color: t.textMuted, fontSize: 14, marginBottom: 32 },
    loginInput:       {
      width: '100%', backgroundColor: t.surface, borderWidth: 1, borderColor: t.border,
      borderRadius: 10, padding: 16, color: t.text, fontSize: 18, fontWeight: '700',
      textAlign: 'center', letterSpacing: 2, marginBottom: 12,
    },
    loginError:       { color: t.danger, fontSize: 13, marginBottom: 8, textAlign: 'center' },
    loginBtn:         { width: '100%', backgroundColor: t.primary, borderRadius: 10, padding: 16, alignItems: 'center' },
    loginBtnDisabled: { opacity: 0.45 },
    loginBtnText:     { color: t.primaryFg, fontSize: 16, fontWeight: '700' },
    loginThemeBtn:    { position: 'absolute', top: 16, right: 16 },

    // Header
    header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: t.border, backgroundColor: t.surface },
    headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
    headerTitle:  { color: t.text, fontSize: 16, fontWeight: '700' },
    headerRight:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
    statusBadge:  { flexDirection: 'row', alignItems: 'center', gap: 4 },
    statusLabel:  { fontSize: 12, fontWeight: '600' },
    themeBtn:     { padding: 4 },

    // Card
    card:       { margin: 16, backgroundColor: t.surface, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: t.border },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    cardTitle:  { color: t.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
    infoRow:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    infoLabel:  { color: t.textMuted, fontSize: 14 },
    infoValue:  { color: t.text, fontSize: 14, fontWeight: '600' },

    // Logout button (inside card)
    logoutBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: t.surface2, borderWidth: 1, borderColor: t.border, borderRadius: 8, paddingVertical: 4, paddingHorizontal: 10 },
    logoutBtnText: { color: t.textMuted, fontSize: 12, fontWeight: '600' },

    // Controls
    controls:        { paddingHorizontal: 16, gap: 12 },
    tripBtn:         { borderRadius: 12, padding: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 10 },
    tripBtnStart:    { backgroundColor: t.success },
    tripBtnStop:     { backgroundColor: t.surface2, borderWidth: 1, borderColor: t.primary },
    tripBtnText:     { color: t.primaryFg === '#FFFFFF' ? '#fff' : '#fff', fontSize: 16, fontWeight: '700' },
    panicBtn:        { backgroundColor: t.danger, borderRadius: 12, padding: 20, alignItems: 'center', borderWidth: 2, borderColor: `${t.danger}88`, flexDirection: 'row', justifyContent: 'center', gap: 10 },
    panicBtnDisabled:    { backgroundColor: t.surface2, borderColor: t.border },
    panicBtnText:        { color: '#fff', fontSize: 18, fontWeight: '900', letterSpacing: 1 },
    panicBtnTextDisabled:{ color: t.textMuted },

    // Alerts section
    alertsSection: { flex: 1, margin: 16, marginTop: 12 },
    alertsTitle:   { color: t.textMuted, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
    alertsList:    { flex: 1 },
    noAlerts:      { color: t.textMuted, fontSize: 14, textAlign: 'center', marginTop: 16 },
    alertItem:     { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: t.surface, borderRadius: 8, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: t.border, gap: 10 },
    alertBody:     { flex: 1 },
    alertMessage:  { color: t.text, fontSize: 13, marginBottom: 4 },
    alertTime:     { color: t.textMuted, fontSize: 11 },

    // Modals
    modalOverlay:       { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' },
    modalBox:           { backgroundColor: t.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 36 },
    logoutModalBox:     { alignItems: 'center', paddingVertical: 28, gap: 20 },
    logoutModalId:      { color: t.primary, fontWeight: '700' },
    logoutConfirmBtn:   { width: '100%', backgroundColor: t.danger, borderRadius: 12, padding: 16, alignItems: 'center' },
    logoutConfirmText:  { color: '#fff', fontSize: 16, fontWeight: '700' },
    modalTitle:         { color: t.text, fontSize: 20, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
    modalSubtitle:      { color: t.textMuted, fontSize: 13, textAlign: 'center', marginBottom: 20 },
    panicOption:        { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.bg, borderWidth: 1, borderColor: t.border, borderRadius: 12, padding: 16, marginBottom: 10 },
    panicOptionText:    { color: t.text, fontSize: 16, fontWeight: '600' },
    modalCancel:        { marginTop: 6, padding: 14, alignItems: 'center' },
    modalCancelText:    { color: t.textMuted, fontSize: 15 },
  })
}

// ─── Constantes estáticas (solo nombres/labels, no colores) ──────────────────

const ALERT_ICON_NAMES: Record<LocalAlert['type'], React.ComponentProps<typeof Ionicons>['name']> = {
  PANIC_BUTTON:    'warning',
  CONNECTION_LOST: 'wifi-outline',
  VEHICLE_STOPPED: 'time-outline',
}

const STATUS_LABELS = {
  connected:    'Conectado',
  disconnected: 'Desconectado',
  sending:      'Enviando...',
}

const PANIC_OPTIONS: { type: string; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }[] = [
  { type: 'PANIC_ACCIDENT',   label: 'Accidente',         icon: 'car-outline'         },
  { type: 'PANIC_ROBBERY',    label: 'Robo / Asalto',     icon: 'shield-outline'      },
  { type: 'PANIC_MEDICAL',    label: 'Emergencia médica', icon: 'medkit-outline'      },
  { type: 'PANIC_MECHANICAL', label: 'Falla mecánica',    icon: 'construct-outline'   },
  { type: 'PANIC_OTHER',      label: 'Otra emergencia',   icon: 'help-circle-outline' },
]

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

// ─── AlertItem ────────────────────────────────────────────────────────────────

function AlertItem({ alert }: { alert: LocalAlert }) {
  const { theme } = useThemeCtx()
  const styles = useMemo(() => makeStyles(theme), [theme.mode])
  const iconName = ALERT_ICON_NAMES[alert.type]
  const iconColor = alert.type === 'PANIC_BUTTON'
    ? theme.danger
    : alert.type === 'CONNECTION_LOST'
      ? theme.warning
      : theme.idle

  return (
    <View style={styles.alertItem}>
      <Ionicons name={iconName} size={18} color={iconColor} />
      <View style={styles.alertBody}>
        <Text style={styles.alertMessage}>{alert.message}</Text>
        <Text style={styles.alertTime}>{formatTime(alert.timestamp)}</Text>
      </View>
    </View>
  )
}

// ─── LoginScreen ──────────────────────────────────────────────────────────────

function LoginScreen({ onLogin }: { onLogin: (id: string) => void }) {
  const { theme, toggleTheme } = useThemeCtx()
  const styles = useMemo(() => makeStyles(theme), [theme.mode])

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
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.bg} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.loginBox}>
            {/* Toggle de tema en esquina superior derecha */}
            <TouchableOpacity style={styles.loginThemeBtn} onPress={toggleTheme}>
              <Ionicons
                name={theme.mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
                size={22}
                color={theme.textMuted}
              />
            </TouchableOpacity>

            <View style={styles.loginLogo}>
              <MaterialIcons name="local-shipping" size={56} color={theme.primary} />
            </View>
            <Text style={styles.loginTitle}>Telemetría de Flotas</Text>
            <Text style={styles.loginSubtitle}>Ingresa tu ID de conductor</Text>

            <TextInput
              style={styles.loginInput}
              value={uniqueId}
              onChangeText={(t) => setUniqueId(t.toUpperCase())}
              placeholder="Ej: DRV-AB3C9"
              placeholderTextColor={theme.textMuted}
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
                ? <ActivityIndicator color={theme.primaryFg} />
                : <Text style={styles.loginBtnText}>Ingresar</Text>
              }
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── TelemetryScreen ──────────────────────────────────────────────────────────

function TelemetryScreen({ driverId, onLogout }: { driverId: string; onLogout: () => void }) {
  const { theme, toggleTheme } = useThemeCtx()
  const styles = useMemo(() => makeStyles(theme), [theme.mode])

  const { status, location, trip, alerts, hasPermission, starting, startTrip, stopTrip, triggerPanic } =
    useTelemetry(driverId)
  const [, forceRender]       = useState(0)
  const [panicModal, setPanicModal]   = useState(false)
  const [logoutModal, setLogoutModal] = useState(false)

  const statusColors = {
    connected:    theme.success,
    disconnected: theme.danger,
    sending:      theme.warning,
  }
  const statusColor = statusColors[status]

  const handleLogout = () => {
    if (trip.isActive) {
      Alert.alert('Viaje activo', 'Finaliza el viaje antes de cerrar sesión.')
      return
    }
    setLogoutModal(true)
  }

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
        <View style={{ alignItems: 'center', gap: 8, padding: 20 }}>
          <Ionicons name="location-outline" size={40} color={theme.danger} />
          <Text style={styles.errorText}>Se requiere permiso de ubicación para esta app.</Text>
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={theme.statusBar} backgroundColor={theme.surface} />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="local-shipping" size={22} color={theme.text} />
          <Text style={styles.headerTitle}>Telemetría de Flotas</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.statusBadge}>
            <Ionicons
              name={status === 'sending' ? 'radio-button-on' : status === 'connected' ? 'ellipse' : 'ellipse-outline'}
              size={10}
              color={statusColor}
            />
            <Text style={[styles.statusLabel, { color: statusColor }]}>{STATUS_LABELS[status]}</Text>
          </View>
          <TouchableOpacity style={styles.themeBtn} onPress={toggleTheme}>
            <Ionicons
              name={theme.mode === 'dark' ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={theme.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Card de viaje */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Viaje actual</Text>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={14} color={theme.textMuted} />
            <Text style={styles.logoutBtnText}>Cerrar sesión</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Estado</Text>
          <Text style={[styles.infoValue, { color: trip.isActive ? theme.success : theme.textMuted }]}>
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

      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.tripBtn, trip.isActive ? styles.tripBtnStop : styles.tripBtnStart]}
          onPress={trip.isActive ? stopTrip : startTrip}
          disabled={starting}
        >
          {starting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Ionicons
              name={trip.isActive ? 'stop-circle-outline' : 'play-circle-outline'}
              size={22}
              color="#fff"
            />
          )}
          <Text style={styles.tripBtnText}>
            {starting ? 'Conectando...' : trip.isActive ? 'Finalizar viaje' : 'Iniciar viaje'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.panicBtn, !trip.isActive && styles.panicBtnDisabled]}
          onPress={() => setPanicModal(true)}
          disabled={!trip.isActive}
        >
          <Ionicons name="warning-outline" size={22} color={trip.isActive ? '#fff' : theme.textMuted} />
          <Text style={[styles.panicBtnText, !trip.isActive && styles.panicBtnTextDisabled]}>PÁNICO</Text>
        </TouchableOpacity>
      </View>

      {/* Alertas locales */}
      <View style={styles.alertsSection}>
        <Text style={styles.alertsTitle}>Alertas locales ({alerts.length})</Text>
        <ScrollView style={styles.alertsList} showsVerticalScrollIndicator={false}>
          {alerts.length === 0
            ? <Text style={styles.noAlerts}>Sin alertas registradas</Text>
            : alerts.map((a) => <AlertItem key={a.id} alert={a} />)
          }
        </ScrollView>
      </View>

      {/* Modal de cierre de sesión */}
      <Modal visible={logoutModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalBox, styles.logoutModalBox]}>
            <Text style={styles.modalTitle}>
              ¿Seguro que deseas cerrar la sesión para el usuario{' '}
              <Text style={styles.logoutModalId}>{driverId}</Text>?
            </Text>
            <TouchableOpacity style={styles.logoutConfirmBtn} onPress={onLogout}>
              <Text style={styles.logoutConfirmText}>Sí, cerrar sesión</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalCancel} onPress={() => setLogoutModal(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de tipo de pánico */}
      <Modal visible={panicModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Ionicons name="warning" size={32} color={theme.danger} style={{ alignSelf: 'center', marginBottom: 8 }} />
            <Text style={styles.modalTitle}>¿Qué está pasando?</Text>
            <Text style={styles.modalSubtitle}>Selecciona el tipo de emergencia</Text>
            {PANIC_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.type}
                style={styles.panicOption}
                onPress={() => handleSelectPanic(opt.type)}
              >
                <Ionicons name={opt.icon} size={18} color={theme.text} />
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
  const appTheme = useAppTheme()
  const { theme } = appTheme

  const [driverId, setDriverId] = useState<string | null>(null)
  const [appReady, setAppReady] = useState(false)

  useEffect(() => {
    const prepare = async () => {
      const s = await loadSession()
      if (s) {
        const result = await loginDriver(s.unique_id)
        if (result === 'ok') setDriverId(s.unique_id)
        else await clearSession()
      }
      setAppReady(true)
    }
    prepare()
  }, [])

  // Ocultar el splash en cuanto el layout esté listo
  const onLayoutRootView = useCallback(async () => {
    if (appReady) await SplashScreen.hideAsync()
  }, [appReady])

  const handleLogout = async () => {
    await clearSession()
    setDriverId(null)
  }

  // Mientras no esté lista la app, el splash sigue visible — no renderizar nada
  if (!appReady) return null

  return (
    <ThemeContext.Provider value={appTheme}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        {driverId
          ? <TelemetryScreen driverId={driverId} onLogout={handleLogout} />
          : <LoginScreen onLogin={setDriverId} />
        }
      </SafeAreaProvider>
    </ThemeContext.Provider>
  )
}
