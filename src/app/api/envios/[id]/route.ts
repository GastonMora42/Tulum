// src/app/api/envios/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const envio = await prisma.envio.findUnique({
      where: { id: params.id },
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
            insumo: true,
            producto: true
          }
        },
        contingencias: {
          include: {
            usuario: true
          },
          orderBy: {
            fechaCreacion: 'desc'
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