// src/app/api/admin/facturas/test-wsfe-alternatives/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    const resultado: any = {
      timestamp: new Date().toISOString(),
      tests: {}
    };

    // URLs alternativas de WSFE que funcionan en producción
    const urlsAlternativas = [
      'https://servicios1.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://ws.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://servicios.afip.gov.ar/wsfev1/service.asmx?WSDL',
      'https://webservices.afip.gov.ar/wsfev1/service.asmx?WSDL',
      // URLs sin WSDL
      'https://servicios1.afip.gov.ar/wsfev1/service.asmx',
      'https://ws.afip.gov.ar/wsfev1/service.asmx',
      'https://servicios.afip.gov.ar/wsfev1/service.asmx',
      'https://webservices.afip.gov.ar/wsfev1/service.asmx'
    ];

    for (const url of urlsAlternativas) {
      try {
        console.log(`[TEST-ALT] Probando: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(url, {
          signal: controller.signal,
          method: 'GET',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; TulumApp/1.0)',
            'Accept': '*/*'
          }
        });
        
        clearTimeout(timeoutId);
        
        const responseText = await response.text();
        
        resultado.tests[url] = {
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type'),
          bodyLength: responseText.length,
          isAccessible: response.status === 200,
          containsWSDL: responseText.includes('<wsdl:definitions') || responseText.includes('<definitions'),
          bodyPreview: responseText.substring(0, 300)
        };
        
        console.log(`[TEST-ALT] ${url} → ${response.status}`);
        
      } catch (error) {
        resultado.tests[url] = {
          error: error instanceof Error ? error.message : 'Error desconocido',
          accessible: false
        };
        console.error(`[TEST-ALT] Error en ${url}:`, error);
      }
    }

    // Test de conectividad de red general
    try {
      const testGeneral = await fetch('https://www.google.com', { 
        signal: AbortSignal.timeout(5000) 
      });
      resultado.conectividad_general = {
        google_ok: testGeneral.status === 200,
        user_agent: 'Test desde servidor'
      };
    } catch (error) {
      resultado.conectividad_general = {
        error: 'Sin conectividad general a internet'
      };
    }

    return NextResponse.json(resultado);
    
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}