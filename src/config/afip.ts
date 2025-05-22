// src/config/afip.ts - CORRECCIÓN DE URLs
export const AFIP_CONFIG = {
  // Usar AFIP_ENV en lugar de NODE_ENV
  production: process.env.AFIP_ENV === 'production',
  
  // 🚨 CORRECCIÓN: URLs corregidas con .gov.ar para WSFE
  wsaa_url: process.env.AFIP_ENV === 'production' 
    ? process.env.AFIP_WSAA_URL_PROD || 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
    : process.env.AFIP_WSAA_URL_DEV || 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    
  wsfe_url: process.env.AFIP_ENV === 'production'
    ? process.env.AFIP_WSFE_URL_PROD || 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'  // ← CAMBIADO .gob.ar por .gov.ar
    : process.env.AFIP_WSFE_URL_DEV || 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',      // ← CAMBIADO .gob.ar por .gov.ar
    
  cert: process.env.AFIP_CERT ? Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8') : '',
  key: process.env.AFIP_KEY ? Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8') : '',
  cuit: process.env.AFIP_CUIT || '',
  tokenDuration: 86400, // 24 horas en segundos
  service: 'wsfe',
  
  // Valores por defecto corregidos
  defaultValues: {
    conceptos: {
      productos: 1,
      servicios: 2,
      ambos: 3
    },
    docTipos: {
      CUIT: 80,
      CUIL: 86,
      DNI: 96,
      pasaporte: 94,
      consumidorFinal: 99
    },
    cbteTipos: {
      A: {
        factura: 1,
        notaDebito: 2,
        notaCredito: 3
      },
      B: {
        factura: 6,
        notaDebito: 7,
        notaCredito: 8
      },
      C: {
        factura: 11 // Facturas C para monotributo
      }
    },
    iva: {
      exento: 3,
      noGravado: 1,
      '0': 3,
      '10.5': 4,
      '21': 5,
      '27': 6
    }
  }
};