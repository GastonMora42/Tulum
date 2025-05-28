// src/config/afip.ts - VERSIÓN CORREGIDA
export const AFIP_CONFIG = {
  production: process.env.AFIP_ENV === 'production',
  
  // ✅ URLs OFICIALES CORREGIDAS
  wsaa_url: process.env.AFIP_ENV === 'production' 
    ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
    : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
    
  wsfe_url: process.env.AFIP_ENV === 'production'
    ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
    : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx',

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
      A: { factura: 1, notaDebito: 2, notaCredito: 3 },
      B: { factura: 6, notaDebito: 7, notaCredito: 8 },
      C: { factura: 11 }
    },
    // ✅ NUEVO: Condiciones IVA Receptor según RG 5616
    condicionesIVAReceptor: {
      responsableInscripto: 1,
      responsableNoInscripto: 2,
      exento: 3,
      noResponsable: 4,
      consumidorFinal: 5,
      responsableMonotributo: 6,
      sujetoNoCategorizado: 7,
      proveedorDelExterior: 8,
      clienteDelExterior: 9,
      iva_liberado_ley19640: 10,
      agenteDePerpepcion: 11,
      pequenoContribuyenteEventual: 12,
      monotributista_social: 13,
      pequenoContribuyente_eventual_social: 14
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