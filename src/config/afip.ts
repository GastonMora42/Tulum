// src/config/afip.ts
export const AFIP_CONFIG = {
  production: process.env.NODE_ENV === 'production',
  wsaa_url: process.env.NODE_ENV === 'production' 
    ? 'https://wsaa.afip.gob.ar/ws/services/LoginCms'
    : 'https://wsaahomo.afip.gob.ar/ws/services/LoginCms',
  wsfe_url: process.env.NODE_ENV === 'production'
    ? 'https://servicios1.afip.gob.ar/wsfev1/service.asmx'
    : 'https://wswhomo.afip.gob.ar/wsfev1/service.asmx',
  cert: process.env.AFIP_CERT ? Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8') : '',
  key: process.env.AFIP_KEY ? Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8') : '',
  tokenDuration: 86400, // 24 horas en segundos
  service: 'wsfe', // Servicio de Factura Electrónica
  
  // Valores por defecto para varios tipos de comprobantes
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