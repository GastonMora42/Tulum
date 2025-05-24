// src/app/api/admin/ubicaciones/detailed/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      include: {
        usuarios: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            usuarios: true,
            stocks: true,
            enviosOrigen: true,
            enviosDestino: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json(ubicaciones);
  } catch (error) {
    console.error('Error al obtener ubicaciones detalladas:', error);
    return NextResponse.json(
      { error: 'Error al obtener ubicaciones detalladas' },
      { status: 500 }
    );
  }
}