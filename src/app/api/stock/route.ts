// src/app/api/stock/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtrado
    const ubicacionId = searchParams.get('ubicacionId');
    const tipo = searchParams.get('tipo') || 'producto'; // producto o insumo
    
    if (!ubicacionId) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro ubicacionId' },
        { status: 400 }
      );
    }
    
    // Construir where según tipo
    const where: any = { ubicacionId };
    
    if (tipo === 'producto') {
      where.productoId = { not: null };
    } else if (tipo === 'insumo') {
      where.insumoId = { not: null };
    }
    
    // Obtener stock
    const stock = await prisma.stock.findMany({
      where,
      include: {
        producto: tipo === 'producto' ? true : false,
        insumo: tipo === 'insumo' ? true : false,
        ubicacion: true  // Esta línea es importante
      }
    });
    
    return NextResponse.json(stock);
  } catch (error: any) {
    console.error('Error al obtener stock:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener stock' },
      { status: 500 }
    );
  }
}