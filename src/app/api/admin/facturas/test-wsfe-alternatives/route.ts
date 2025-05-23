// src/app/api/admin/facturas/test-wsfe-simple/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(req: NextRequest) {
  try {
    const authError = await authMiddleware(req);
    if (authError) return authError;
    
    const permissionError = await checkPermission('admin')(req);
    if (permissionError) return permissionError;

    console.log('[TEST-SIMPLE] Iniciando test simple de WSFE');

    const resultado: any = {
      timestamp: new Date().toISOString(),
      tests: {},
      ambiente: process.env.NODE_ENV,
      servidor: 'vercel' // o el que uses
    };

    // URLs de WSFE para probar una por una
    const urls = [
      'https://ws.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://servicios.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://webservices.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
      'https://servicios.afip.gov.ar/wsfev1/service.asmx',
    ];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const testName = `test_${i + 1}`;
      
      try {
        console.log(`[TEST-SIMPLE] Probando URL ${i + 1}: ${url}`);
        
        // Crear una promesa con timeout manual
        const fetchPromise = fetch(url, {
          method: 'GET',
          headers: {
            'User-Agent': 'TulumApp/1.0',
            'Accept': 'text/xml, application/xml, */*'
          }
        });

        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 8000)
        );

        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        
        console.log(`[TEST-SIMPLE] Respuesta recibida: ${response.status}`);
        
        const text = await response.text();
        
        resultado.tests[testName] = {
          url,
          status: response.status,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
          textLength: text.length,
          preview: text.substring(0, 200),
          hasWSDL: text.includes('<wsdl:') || text.includes('<definitions'),
          hasError: text.toLowerCase().includes('error')
        };

        console.log(`[TEST-SIMPLE] Test ${i + 1} completado: ${response.status}`);
        
      } catch (error) {
        console.error(`[TEST-SIMPLE] Error en test ${i + 1}:`, error);
        
        resultado.tests[testName] = {
          url,
          error: error instanceof Error ? error.message : 'Error desconocido',
          success: false
        };
      }
    }

    // Test de conectividad básica
    try {
      const googleTest = await fetch('https://httpbin.org/status/200', {
        method: 'GET'
      });
      
      resultado.conectividad_basica = {
        httpbin_ok: googleTest.ok,
        status: googleTest.status
      };
    } catch (error) {
      resultado.conectividad_basica = {
        error: 'Sin conectividad externa'
      };
    }

    console.log('[TEST-SIMPLE] Test completado');
    return NextResponse.json(resultado);
    
  } catch (globalError) {
    console.error('[TEST-SIMPLE] Error global:', globalError);
    
    // Retornar error detallado
    return NextResponse.json({
      error: 'Error en endpoint',
      message: globalError instanceof Error ? globalError.message : 'Error desconocido',
      stack: globalError instanceof Error ? globalError.stack : undefined,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}