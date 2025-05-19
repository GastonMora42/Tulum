// src/app/api/envios/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const origenId = searchParams.get('origenId');
    const destinoId = searchParams.get('destinoId');
    const estado = searchParams.get('estado');
    const limit = parseInt(searchParams.get('limit') || '20');
    
    // Construir consulta
    const where: any = {};
    
    if (origenId) {
      where.origenId = origenId;
    }
    
    if (destinoId) {
      where.destinoId = destinoId;
    }
    
    if (estado) {
      // Si estado contiene comas, dividir y buscar múltiples estados
      if (estado.includes(',')) {
        where.estado = { in: estado.split(',') };
      } else {
        where.estado = estado;
      }
    }
    
    console.log('Buscando envíos con filtros:', where);
    
    // Ejecutar consulta
    const envios = await prisma.envio.findMany({
      where,
      take: limit,
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
        }
      },
      orderBy: {
        fechaCreacion: 'desc'
      }
    });
    
    return NextResponse.json(envios);
  } catch (error: any) {
    console.error('Error al obtener envíos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener envíos' },
      { status: 500 }
    );
  }
}