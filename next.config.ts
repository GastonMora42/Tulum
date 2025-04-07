// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Habilitar imágenes externas para S3
  images: {
    domains: [
      'tulum.s3.amazonaws.com', //definir dominio de s3
      'localhost'
    ],
  },
  // Configuración de ambiente
  env: {
    APP_ENV: process.env.APP_ENV || 'development',
  },
  // Configuración para offline-first PWA (opcional)
  pwa: {
    dest: 'public',
    disable: process.env.NODE_ENV === 'development',
  },
  // Opciones de webpack personalizadas
  webpack: (config: any, { isServer }: any) => {
    // Personalizaciones si son necesarias
    return config;
  },
};

module.exports = nextConfig;