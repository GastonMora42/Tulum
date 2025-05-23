// src/app/api/admin/facturas/debug-raw-afip/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    console.log('[DEBUG-RAW] Iniciando captura RAW de AFIP');

    const resultado: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      configuracion: {}
    };

    // 1. VERIFICAR CONFIGURACIÓN
    const config = await prisma.configuracionAFIP.findFirst({
      where: { activo: true }
    });

    if (!config) {
      return NextResponse.json({ error: 'No hay configuración AFIP activa' }, { status: 400 });
    }

    resultado.configuracion = {
      cuit: config.cuit,
      puntoVenta: config.puntoVenta,
      variables_entorno: {
        AFIP_ENV: process.env.AFIP_ENV,
        AFIP_CERT_EXISTS: !!process.env.AFIP_CERT,
        AFIP_KEY_EXISTS: !!process.env.AFIP_KEY,
        AFIP_CERT_LENGTH: process.env.AFIP_CERT?.length || 0,
        AFIP_KEY_LENGTH: process.env.AFIP_KEY?.length || 0
      }
    };

    // 2. TEST DIRECTO DE URLs SIN PROCESAMIENTO
    const urls = [
      'https://wsaa.afip.gov.ar/ws/services/LoginCms?WSDL',
      'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://wsaa.afip.gov.ar/ws/services/LoginCms',
      'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
    ];

    for (const url of urls) {
      try {
        console.log(`[DEBUG-RAW] Probando URL: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TulumApp/1.0; AFIP-Client)',
            'Accept': 'text/xml, application/xml, text/html, */*',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive'
          }
        });
        
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        const contentType = response.headers.get('content-type') || '';
        
        resultado.tests[url] = {
          status: response.status,
          statusText: response.statusText,
          contentType,
          headers: Object.fromEntries(response.headers.entries()),
          bodyPreview: responseText.substring(0, 1000), // Primeros 1000 caracteres
          bodyLength: responseText.length,
          isHTML: responseText.includes('<html') || responseText.includes('<!DOCTYPE'),
          isXML: responseText.includes('<?xml') || responseText.includes('<definitions'),
          containsError: responseText.toLowerCase().includes('error'),
          containsException: responseText.toLowerCase().includes('exception'),
          url: response.url // URL final después de redirects
        };
        
        // Si hay error, capturar más detalles
        if (response.status >= 400 || responseText.toLowerCase().includes('error')) {
          resultado.tests[url].fullErrorBody = responseText;
        }
        
        console.log(`[DEBUG-RAW] ${url} - Status: ${response.status}, Length: ${responseText.length}`);
        
      } catch (error) {
        resultado.tests[url] = {
          error: error instanceof Error ? error.message : 'Error desconocido',
          errorType: error instanceof Error ? error.constructor.name : 'Unknown',
          stack: error instanceof Error ? error.stack?.substring(0, 500) : undefined
        };
        console.error(`[DEBUG-RAW] Error en ${url}:`, error);
      }
    }

    // 3. TEST DE CERTIFICADOS SIN SOAP
    try {
      console.log('[DEBUG-RAW] Verificando certificados...');
      
      const cert = process.env.AFIP_CERT ? Buffer.from(process.env.AFIP_CERT, 'base64').toString('utf8') : '';
      const key = process.env.AFIP_KEY ? Buffer.from(process.env.AFIP_KEY, 'base64').toString('utf8') : '';
      
      resultado.tests.certificados = {
        cert_format_ok: cert.includes('BEGIN CERTIFICATE') && cert.includes('END CERTIFICATE'),
        key_format_ok: key.includes('BEGIN PRIVATE KEY') && key.includes('END PRIVATE KEY'),
        cert_preview: cert.substring(0, 100),
        key_preview: key.substring(0, 100),
        cert_lines: cert.split('\n').length,
        key_lines: key.split('\n').length
      };
      
    } catch (error) {
      resultado.tests.certificados = {
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }

    // 4. TEST DE DNS RESOLUTION
    try {
      const dns = require('dns').promises;
      const afipIPs = await dns.resolve4('wsaa.afip.gov.ar');
      resultado.tests.dns = {
        wsaa_ips: afipIPs,
        can_resolve: true
      };
    } catch (error) {
      resultado.tests.dns = {
        error: error instanceof Error ? error.message : 'Error DNS',
        can_resolve: false
      };
    }

    return NextResponse.json(resultado);
    
  } catch (error) {
    console.error('[DEBUG-RAW] Error general:', error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}