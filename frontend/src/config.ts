// En local usa localhost. En producción (Vercel/Render) se inyecta VITE_BACKEND_URL.
export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'
