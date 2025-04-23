// src/app/api/admin/envios-insumos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(
  req: NextRequest,
  context: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    // Extraer el ID correctamente - IMPORTANTE: usar context.params en lugar de params directo
    const id = context.params.id;
    
    const envio = await prisma.envio.findUnique({
      where: { id },
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
      }
    });
    
    if (!envio) {
      return NextResponse.json(
        { error: 'Envío no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(envio);
  } catch (error: any) {
    console.error('Error al obtener detalle de envío:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener detalle de envío' },
      { status: 500 }
    );
  }
}