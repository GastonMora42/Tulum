// src/app/api/admin/facturas/stats/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;

  try {
    // Contar facturas por estado
    const [total, completadas, pendientes, procesando, error] = await Promise.all([
      prisma.facturaElectronica.count(),
      prisma.facturaElectronica.count({
        where: { estado: 'completada' }
      }),
      prisma.facturaElectronica.count({
        where: { estado: 'pendiente' }
      }),
      prisma.facturaElectronica.count({
        where: { estado: 'procesando' }
      }),
      prisma.facturaElectronica.count({
        where: { estado: 'error' }
      })
    ]);
    
    // Obtener totales facturados
    const totalFacturado = await prisma.$queryRaw`
      SELECT SUM(v.total) as total
      FROM "FacturaElectronica" f
      JOIN "Venta" v ON f.ventaId = v.id
      WHERE f.estado = 'completada'
    `;
    
    // Obtener estadísticas por sucursal
    const porSucursal = await prisma.$queryRaw`
      SELECT 
        u.nombre as sucursal, 
        COUNT(*) as cantidad,
        SUM(CASE WHEN f.estado = 'completada' THEN 1 ELSE 0 END) as completadas
      FROM "FacturaElectronica" f
      JOIN "Ubicacion" u ON f.sucursalId = u.id
      GROUP BY u.nombre
      ORDER BY COUNT(*) DESC
    `;
    
    return NextResponse.json({
      total,
      completadas,
      pendientes: pendientes + procesando,
      error,
      totalFacturado: (totalFacturado as any)[0]?.total || 0,
      porSucursal
    });
  } catch (error: any) {
    console.error('Error al obtener estadísticas de facturas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}