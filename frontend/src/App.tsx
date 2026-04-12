import './App.css'
import { useAuthStore } from './store/useAuthStore'
import { LoginPage }     from './pages/LoginPage'
import { SuperAdminPage } from './pages/SuperAdminPage'
import { FleetPage }     from './pages/FleetPage'

function App() {
  const user = useAuthStore((s) => s.user)

  if (!user) return <LoginPage />

  if (user.role === 'superadmin') return <SuperAdminPage />

  return <FleetPage />
}

export default App
