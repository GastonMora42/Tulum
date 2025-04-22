// src/app/api/fabrica/envios-pendientes/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Cambiar el permiso requerido a uno que tengan los usuarios de fábrica
  const permissionError = await checkPermission('stock:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    // Obtener ubicación de fábrica del usuario
    const user = (req as any).user;
    
    if (!user.sucursalId) {
      return NextResponse.json(
        { error: 'Usuario no asociado a ninguna ubicación' },
        { status: 400 }
      );
    }
    
    // Verificar que la sucursal es una fábrica
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: user.sucursalId }
    });
    
    if (!sucursal || sucursal.tipo !== 'fabrica') {
      return NextResponse.json(
        { error: 'El usuario no está asociado a una fábrica' },
        { status: 400 }
      );
    }
    
    // Obtener envíos pendientes para la fábrica
    const envios = await prisma.envio.findMany({
      where: {
        destinoId: user.sucursalId,
        estado: 'enviado', // Solo los que están en estado enviado y pendientes de recepción
        items: {
          some: {
            insumoId: { not: null } // Solo envíos de insumos
          }
        }
      },
      include: {
        origen: true,
        destino: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        items: {
          include: {
            insumo: true
          }
        }
      },
      orderBy: {
        fechaEnvio: 'desc'
      }
    });
    
    return NextResponse.json(envios);
  } catch (error: any) {
    console.error('Error al obtener envíos pendientes:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envíos pendientes' },
      { status: 500 }
    );
  }
}