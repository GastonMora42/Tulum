// src/app/api/stock-insumos-pdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { insumoPdvService } from '@/server/services/insumoPdv/insumoPdvService';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const ubicacionId = searchParams.get('ubicacionId');
    const soloStockBajo = searchParams.get('stockBajo') === 'true';

    if (!ubicacionId) {
      return NextResponse.json(
        { error: 'ubicacionId es requerido' },
        { status: 400 }
      );
    }

    const stock = await insumoPdvService.obtenerStock({
      ubicacionId,
      soloStockBajo
    });

    return NextResponse.json(stock);
  } catch (error) {
    console.error('Error al obtener stock:', error);
    return NextResponse.json(
      { error: 'Error al obtener stock' },
      { status: 500 }
    );
  }
}