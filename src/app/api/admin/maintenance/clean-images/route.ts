// src/app/api/admin/maintenance/clean-images/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { cleanExpiredContingencyImages } from '@/server/jobs/cleanExpiredImages';

export async function POST(req: NextRequest) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permisos (solo admin)
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const result = await cleanExpiredContingencyImages();
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error al limpiar imágenes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al limpiar imágenes' },
      { status: 500 }
    );
  }
}