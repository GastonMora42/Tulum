// src/app/api/pdv/configuracion-cierre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['caja:ver', 'caja:crear'])(req);
  if (permError) return permError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    
    // Verificar que el vendedor solo acceda a su sucursal
    if (user.roleId === 'role-vendedor' && user.sucursalId !== sucursalId) {
      return NextResponse.json(
        { error: 'No tiene permisos para esta sucursal' },
        { status: 403 }
      );
    }
    
    // Buscar configuración existente
    let configuracion = await prisma.configuracionCierre.findUnique({
      where: { sucursalId }
    });
    
    // Si no existe, crear una por defecto
    if (!configuracion) {
      configuracion = await prisma.configuracionCierre.create({
        data: {
          sucursalId,
          montoFijo: 10000,
          creadoPor: user.id
        }
      });
    }
    
    return NextResponse.json({
      montoFijo: configuracion.montoFijo,
      sucursalId: configuracion.sucursalId
    });
  } catch (error: any) {
    console.error('Error al obtener configuración de cierre:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}