// src/app/api/admin/jobs/renew-afip-tokens/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { renewAfipTokens } from '@/server/jobs/renewAfipTokenJob';

export async function POST(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    // Ejecutar renovación
    const result = await renewAfipTokens();
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error al renovar tokens AFIP:', error);
    return NextResponse.json(
      { error: 'Error al renovar tokens AFIP' },
      { status: 500 }
    );
  }
}