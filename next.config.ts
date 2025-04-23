import pwa from 'next-pwa'
import type { NextConfig } from 'next'

// Configuración de next-pwa (>= v5.6.0)
const withPWA = pwa({
  dest: 'public',
  // auto disable en desarrollo
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
})

const nextConfig: NextConfig = {
  // Ignorar errores de ESLint en build
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignorar errores de TypeScript en build
  typescript: {
    ignoreBuildErrors: true,
  },
  // aquí van otras opciones de Next.js si las necesitas...
}

// @ts-ignore
export default withPWA(nextConfig)
