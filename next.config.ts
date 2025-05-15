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

  images: {
    domains: [
      `${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com`,
      's3.amazonaws.com' // Para compatibilidad con URLs generadas por diferentes métodos
    ],
    unoptimized: process.env.NODE_ENV === 'development' // Opcional: deshabilitar optimización en desarrollo
  },
}

// @ts-ignore
export default withPWA(nextConfig)
