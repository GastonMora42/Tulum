// src/app/api/admin/jobs/afip-status/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { checkAfipTokensStatus } from '@/server/jobs/renewAfipTokenJob';

export async function GET(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const status = await checkAfipTokensStatus();
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...status
    });
  } catch (error: any) {
    console.error('Error al verificar estado AFIP:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar estado AFIP' },
      { status: 500 }
    );
  }
}