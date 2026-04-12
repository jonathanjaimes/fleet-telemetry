import { io, Socket } from 'socket.io-client'
import Constants from 'expo-constants'

function getBackendUrl(): string {
  const envUrl = process.env.EXPO_PUBLIC_BACKEND_URL
  if (envUrl) return envUrl

  const expoHost = Constants.expoConfig?.hostUri?.split(':')[0]
  if (expoHost && !expoHost.includes('exp.direct')) {
    return `http://${expoHost}:3001`
  }

  return 'http://localhost:3001'
}

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(getBackendUrl(), {
      transports: ['websocket'],
      reconnectionAttempts: 5,
    })
  }
  return socket
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
