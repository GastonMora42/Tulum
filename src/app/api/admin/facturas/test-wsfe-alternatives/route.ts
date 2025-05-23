// src/app/api/admin/facturas/test-wsfe-alternatives/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(req: NextRequest) {
  try {
    const authError = await authMiddleware(req);
    if (authError) return authError;
    
    const permissionError = await checkPermission('admin')(req);
    if (permissionError) return permissionError;

    console.log('[TEST-WSFE] Iniciando test de URLs de AFIP');

    const resultado: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      ambiente: process.env.AFIP_ENV || 'testing'
    };

    // ✅ URLs CORREGIDAS - Usar .gob.ar
    const urls = [
      // Producción
      'https://wsaa.afip.gob.ar/ws/services/LoginCms?WSDL',
      'https://servicios1.afip.gob.ar/wsfev1/service.asmx?WSDL',
      // Homologación  
      'https://wsaahomo.afip.gob.ar/ws/services/LoginCms?WSDL',
      'https://wswhomo.afip.gob.ar/wsfev1/service.asmx?WSDL',
      // Test de conectividad básica
      'https://httpbin.org/status/200'
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const testName = `test_${i + 1}`;
      
      try {
        console.log(`[TEST-WSFE] Probando URL ${i + 1}: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'TulumApp/1.0 AFIP-Client',
            'Accept': 'text/xml, application/xml, text/html, */*'
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // ✅ MANEJO MEJORADO DE RESPUESTAS
        let responseText: string;
        let contentType = response.headers.get('content-type') || '';
        
        try {
          responseText = await response.text();
        } catch (textError) {
          responseText = `[Error leyendo respuesta: ${textError}]`;
        }
        
        // ✅ NO intentar parsear como JSON automáticamente
        resultado.tests[testName] = {
          url,
          status: response.status,
          ok: response.ok,
          statusText: response.statusText,
          contentType,
          textLength: responseText.length,
          preview: responseText.substring(0, 300),
          hasWSDL: responseText.includes('<wsdl:') || responseText.includes('<definitions'),
          hasError: responseText.toLowerCase().includes('error'),
          isXML: contentType.includes('xml') || responseText.includes('<?xml'),
          isHTML: contentType.includes('html') || responseText.includes('<html'),
          success: response.ok && (
            responseText.includes('<wsdl:') || 
            responseText.includes('<definitions') ||
            url.includes('httpbin') // Para test de conectividad
          )
        };

        console.log(`[TEST-WSFE] Test ${i + 1} - Status: ${response.status}, Success: ${resultado.tests[testName].success}`);
        
      } catch (error) {
        console.error(`[TEST-WSFE] Error en test ${i + 1}:`, error);
        
        // ✅ MANEJO MEJORADO DE ERRORES
        let errorMessage = 'Error desconocido';
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            errorMessage = 'Timeout (10 segundos)';
          } else if (error.message.includes('fetch')) {
            errorMessage = 'Error de conexión';
          } else {
            errorMessage = error.message;
          }
        }
        
        resultado.tests[testName] = {
          url,
          success: false,
          error: errorMessage,
          errorType: error instanceof Error ? error.name : 'Unknown'
        };
      }
    }

    // ✅ RESUMEN DE RESULTADOS
    const exitosos = Object.values(resultado.tests).filter(test => (test as any).success).length;
    const total = Object.keys(resultado.tests).length;
    
    resultado.resumen = {
      total,
      exitosos,
      fallidos: total - exitosos,
      porcentajeExito: Math.round((exitosos / total) * 100)
    };

    console.log(`[TEST-WSFE] Test completado: ${exitosos}/${total} exitosos`);
    return NextResponse.json(resultado);
    
  } catch (globalError) {
    console.error('[TEST-WSFE] Error global:', globalError);
    
    return NextResponse.json({
      error: 'Error en endpoint de test',
      message: globalError instanceof Error ? globalError.message : 'Error desconocido',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}