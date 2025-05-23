// src/config/afip.ts - CONFIGURACIÓN CORREGIDA
export const AFIP_CONFIG = {
  production: process.env.AFIP_ENV === 'production',
  
  // ✅ URLs CORREGIDAS - Usar .gob.ar (oficial)
  wsaa_url: process.env.AFIP_ENV === 'production' 
    ? process.env.AFIP_WSAA_URL_PROD || 'https://wsaa.afip.gob.ar/ws/services/LoginCms'
    : process.env.AFIP_WSAA_URL_DEV || 'https://wsaahomo.afip.gob.ar/ws/services/LoginCms',
    
  wsfe_url: process.env.AFIP_ENV === 'production'
    ? process.env.AFIP_WSFE_URL_PROD || 'https://servicios1.afip.gob.ar/wsfev1/service.asmx'
    : process.env.AFIP_WSFE_URL_DEV || 'https://wswhomo.afip.gob.ar/wsfev1/service.asmx',
    
  cert: process.env.AFIP_CERT ? Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8') : '',
  key: process.env.AFIP_KEY ? Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8') : '',
  cuit: process.env.AFIP_CUIT || '',
  tokenDuration: 86400,
  service: 'wsfe',
  
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
        factura: 11
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