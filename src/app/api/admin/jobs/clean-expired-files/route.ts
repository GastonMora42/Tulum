// src/app/api/admin/jobs/clean-expired-files/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { cleanExpiredMediaFiles } from '@/server/jobs/cleanExpiredMediaFiles';

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const result = await cleanExpiredMediaFiles();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al ejecutar job de limpieza:', error);
    return NextResponse.json(
      { error: error.message || 'Error al ejecutar job' },
      { status: 500 }
    );
  }
}