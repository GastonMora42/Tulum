// src/app/api/pdv/facturas/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // Contar facturas por estado
    const [total, completadas, pendientes, procesando, error] = await Promise.all([
      prisma.facturaElectronica.count({
        where: { sucursalId }
      }),
      prisma.facturaElectronica.count({
        where: { sucursalId, estado: 'completada' }
      }),
      prisma.facturaElectronica.count({
        where: { sucursalId, estado: 'pendiente' }
      }),
      prisma.facturaElectronica.count({
        where: { sucursalId, estado: 'procesando' }
      }),
      prisma.facturaElectronica.count({
        where: { sucursalId, estado: 'error' }
      })
    ]);
    
    return NextResponse.json({
      total,
      completadas,
      pendientes: pendientes + procesando,
      error
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de facturas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}