// src/app/api/admin/jobs/renew-afip-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminJobAuthMiddleware } from '@/server/api/middlewares/adminJobAuth';
import { renewAfipTokens } from '@/server/jobs/renewAfipTokenJob';

export async function POST(req: NextRequest) {
  // Usar middleware específico para jobs administrativos
  const authError = await adminJobAuthMiddleware(req);
  if (authError) return authError;
  
  try {
    console.log('[API] Iniciando renovación manual de tokens AFIP');
    
    // Ejecutar renovación
    const result = await renewAfipTokens();
    
    console.log('[API] Resultado de renovación:', result);
    
    return NextResponse.json({
      message: result.success 
        ? `Proceso completado. Renovados: ${result.renewed}, Errores: ${result.errors}`
        : 'El proceso completó con algunos errores',
      ...result
    });
  } catch (error: any) {
    console.error('[API] Error al renovar tokens AFIP:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al renovar tokens AFIP',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  // Usar middleware específico para jobs administrativos
  const authError = await adminJobAuthMiddleware(req);
  if (authError) return authError;
  
  try {
    return NextResponse.json({
      message: 'Endpoint para renovación de tokens AFIP',
      usage: 'Envía una petición POST para renovar tokens',
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Error' },
      { status: 500 }
    );
  }
}