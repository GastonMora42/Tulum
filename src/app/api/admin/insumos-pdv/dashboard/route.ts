// src/app/api/admin/insumos-pdv/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { insumoPdvService } from '@/server/services/insumoPdv/insumoPdvService';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const ubicacionId = searchParams.get('ubicacionId');

    if (!ubicacionId) {
      return NextResponse.json(
        { error: 'ubicacionId es requerido' },
        { status: 400 }
      );
    }

    const dashboard = await insumoPdvService.obtenerDashboard(ubicacionId);
    return NextResponse.json(dashboard);
  } catch (error) {
    console.error('Error al obtener dashboard de insumos PDV:', error);
    return NextResponse.json(
      { error: 'Error al obtener dashboard' },
      { status: 500 }
    );
  }
}