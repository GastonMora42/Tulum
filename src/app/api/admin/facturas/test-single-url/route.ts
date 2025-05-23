// src/app/api/admin/facturas/test-single-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function POST(req: NextRequest) {
  try {
    const authError = await authMiddleware(req);
    if (authError) return authError;

    const body = await req.json();
    const testUrl = body.url || 'https://ws.afip.gov.ar/wsfev1/service.asmx?WSDL';

    console.log(`[SINGLE-URL] Probando: ${testUrl}`);

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'TulumApp/1.0'
      }
    });

    const responseText = await response.text();

    return NextResponse.json({
      url: testUrl,
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      bodyLength: responseText.length,
      bodyPreview: responseText.substring(0, 500),
      fullBody: responseText.length < 2000 ? responseText : 'Cuerpo muy largo',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('[SINGLE-URL] Error:', error);
    
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Error desconocido',
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
}