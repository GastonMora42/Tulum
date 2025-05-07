// src/config/afip.ts
export const AFIP_CONFIG = {
    production: process.env.NODE_ENV === 'production',
    wsaa_url: process.env.NODE_ENV === 'production' 
      ? 'https://wsaa.afip.gob.ar/ws/services/LoginCms'
      : 'https://wsaahomo.afip.gob.ar/ws/services/LoginCms',
    wsfe_url: process.env.NODE_ENV === 'production'
      ? 'https://servicios1.afip.gob.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gob.ar/wsfev1/service.asmx',
    cert: process.env.AFIP_CERT_BASE64 ? Buffer.from(process.env.AFIP_CERT_BASE64, 'base64').toString('utf8') : '',
    key: process.env.AFIP_KEY_BASE64 ? Buffer.from(process.env.AFIP_KEY_BASE64, 'base64').toString('utf8') : '',
    tokenDuration: 86400, // 24 horas en segundos
    service: 'wsfe' // Servicio de Factura Electrónica
  };