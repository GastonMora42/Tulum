// src/app/api/stock/batch/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    const ubicacionId = searchParams.get('ubicacionId');
    const insumoIds = searchParams.get('insumoIds')?.split(',') || [];
    
    
    if (!ubicacionId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro ubicacionId' },
        { status: 400 }
      );
    }
    
    if (insumoIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren IDs de insumos' },
        { status: 400 }
      );
    }
    
    // Obtener stock
    const stock = await prisma.stock.findMany({
      where: {
        ubicacionId,
        insumoId: { in: insumoIds }
      },
      include: {
        insumo: true
      }
    });
    
    return NextResponse.json(stock);
  } catch (error: any) {
    console.error('Error al obtener stock en lote:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener stock en lote' },
      { status: 500 }
    );
  }
}