// src/server/services/facturacion/afipDebugService.ts
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import * as soap from 'soap';

export class AfipDebugService {
  
  /**
   * Test completo de conectividad con captura de errores detallada
   */
  static async testConectividadCompleta(cuit: string): Promise<any> {
    const resultado: any = {
      timestamp: new Date().toISOString(),
      cuit,
      tests: {}
    };

    // 1. TEST DE URLs con fetch nativo
    console.log('[DEBUG] Iniciando test de URLs...');
    const urls = {
      wsaa_prod: 'https://wsaa.afip.gov.ar/ws/services/LoginCms',
      wsfe_prod: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
      wsaa_wsdl: 'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
      wsfe_wsdl: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL'
    };

    for (const [name, url] of Object.entries(urls)) {
      try {
        console.log(`[DEBUG] Probando ${name}: ${url}`);
        
        // Usar fetch nativo con AbortController para timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, { 
          signal: controller.signal,
          headers: {
            'User-Agent': 'TulumApp/1.0 AFIP-Client'
          }
        });
        
        clearTimeout(timeoutId);
        
        const contentType = response.headers.get('content-type') || '';
        const bodyText = await response.text();
        
        resultado.tests[name] = {
          status: response.status,
          statusText: response.statusText,
          contentType,
          bodyPreview: bodyText.substring(0, 500),
          isXML: contentType.includes('xml') || bodyText.includes('<?xml'),
          isHTML: contentType.includes('html') || bodyText.includes('<html'),
          bodyLength: bodyText.length,
          success: response.ok
        };
        
        console.log(`[DEBUG] ${name} - Status: ${response.status}, Content-Type: ${contentType}`);
      } catch (error) {
        resultado.tests[name] = {
          success: false,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
        console.error(`[DEBUG] Error en ${name}:`, error);
      }
    }

    // 2. TEST DE CERTIFICADOS
    console.log('[DEBUG] Verificando certificados...');
    try {
      const client = new AfipSoapClient(cuit);
      const conectividad = await client.verificarConectividad();
      resultado.tests.certificados = conectividad;
    } catch (error) {
      resultado.tests.certificados = {
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      };
    }

    // 3. TEST DE SOAP CLIENT SIMPLIFICADO
    console.log('[DEBUG] Probando creación de cliente SOAP...');
    try {
      const wsaaUrl = urls.wsaa_wsdl;
      console.log(`[DEBUG] Creando cliente SOAP para: ${wsaaUrl}`);
      
      const client = await soap.createClientAsync(wsaaUrl, {
      });
      
      resultado.tests.soapClient = {
        success: true,
        url: wsaaUrl,
        methods: Object.keys(client).filter(key => typeof (client as any)[key] === 'function')
      };
      
      console.log('[DEBUG] Cliente SOAP creado exitosamente');
    } catch (error) {
      resultado.tests.soapClient = {
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
      };
      console.error('[DEBUG] Error creando cliente SOAP:', error);
    }

    // 4. TEST DE VARIABLES DE ENTORNO
    resultado.tests.environment = {
      AFIP_ENV: process.env.AFIP_ENV,
      AFIP_CERT_LENGTH: process.env.AFIP_CERT?.length || 0,
      AFIP_KEY_LENGTH: process.env.AFIP_KEY?.length || 0,
      AFIP_CUIT: process.env.AFIP_CUIT,
      NODE_ENV: process.env.NODE_ENV,
      urls_configuradas: {
        wsaa: process.env.AFIP_ENV === 'production' 
          ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
          : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms',
        wsfe: process.env.AFIP_ENV === 'production'
          ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
          : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx'
      }
    };

    return resultado;
  }

  /**
   * Test específico para una factura que falló
   */
  static async debugFacturaEspecifica(facturaId: string): Promise<any> {
    const prisma = (await import('@/server/db/client')).default;
    
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id: facturaId },
      include: {
        venta: {
          include: {
            items: { include: { producto: true } },
            sucursal: true
          }
        }
      }
    });

    if (!factura) {
      throw new Error('Factura no encontrada');
    }

    const config = await prisma.configuracionAFIP.findFirst({
      where: { sucursalId: factura.sucursalId, activo: true }
    });

    if (!config) {
      throw new Error('Configuración AFIP no encontrada');
    }

    const resultado: any = {
      factura: {
        id: factura.id,
        estado: factura.estado,
        error: factura.error,
        logs: factura.logs?.substring(0, 2000) + (factura.logs && factura.logs.length > 2000 ? '...[TRUNCATED]' : ''),
        cae: factura.cae,
        updatedAt: factura.updatedAt,
        minutosDesdeUpdate: Math.round((Date.now() - factura.updatedAt.getTime()) / 1000 / 60)
      },
      configuracion: {
        cuit: config.cuit,
        puntoVenta: config.puntoVenta,
        sucursal: factura.venta.sucursal.nombre
      },
      venta: {
        id: factura.venta.id,
        total: factura.venta.total,
        itemsCount: factura.venta.items.length,
        clienteNombre: factura.venta.clienteNombre,
        clienteCuit: factura.venta.clienteCuit,
        tipoComprobanteCalculado: factura.venta.clienteCuit ? 'A' : 'B'
      }
    };

    // Análisis de logs si existen
    if (factura.logs) {
      const logs = factura.logs.split('\n');
      resultado.analisisLogs = {
        totalLineas: logs.length,
        ultimasLineas: logs.slice(-10),
        tieneErrores: logs.some(log => log.includes('❌') || log.includes('ERROR')),
        tieneExitos: logs.some(log => log.includes('✅') || log.includes('SUCCESS')),
        errorLines: logs.filter(log => log.includes('❌') || log.includes('ERROR')).slice(-5)
      };
    }

    // Test de conectividad específico para esta configuración
    try {
      const testConectividad = await this.testConectividadCompleta(config.cuit);
      resultado.conectividad = testConectividad;
    } catch (error) {
      resultado.conectividad = {
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }

    return resultado;
  }

  /**
   * Test manual de autenticación AFIP
   */
  static async testAutenticacionManual(cuit: string): Promise<any> {
    try {
      console.log(`[DEBUG] Iniciando test manual de autenticación para CUIT: ${cuit}`);
      
      const client = new AfipSoapClient(cuit);
      
      // Intentar obtener autenticación
      const auth = await client.getAuth();
      
      return {
        success: true,
        cuit,
        tokenLength: auth.Token?.length || 0,
        signLength: auth.Sign?.length || 0,
        tokenPreview: auth.Token?.substring(0, 50) + '...',
        signPreview: auth.Sign?.substring(0, 50) + '...'
      };
    } catch (error) {
      return {
        success: false,
        cuit,
        error: error instanceof Error ? error.message : 'Error desconocido',
        stack: error instanceof Error ? error.stack?.substring(0, 1000) : undefined
      };
    }
  }

  /**
   * Test manual de llamada a AFIP para obtener último comprobante
   */
  static async testUltimoComprobante(cuit: string, puntoVenta: number = 1): Promise<any> {
    try {
      console.log(`[DEBUG] Test último comprobante - CUIT: ${cuit}, PV: ${puntoVenta}`);
      
      const client = new AfipSoapClient(cuit);
      
      // Intentar obtener último número de factura B (tipo 6)
      const ultimoNumero = await client.getLastInvoiceNumber(puntoVenta, 6);
      
      return {
        success: true,
        cuit,
        puntoVenta,
        ultimoNumero,
        tipoComprobante: 6,
        descripcion: 'Factura B'
      };
    } catch (error) {
      return {
        success: false,
        cuit,
        puntoVenta,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }
}