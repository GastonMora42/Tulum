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
    const totalFacturadoResult = await prisma.$queryRaw`
      SELECT SUM(v.total) as total
      FROM "FacturaElectronica" f
      JOIN "Venta" v ON f."ventaId" = v.id
      WHERE f.estado = 'completada'
    `;
    
    // Obtener estadísticas por sucursal
    const porSucursalResult = await prisma.$queryRaw`
      SELECT 
        u.nombre as sucursal, 
        COUNT(*) as cantidad,
        SUM(CASE WHEN f.estado = 'completada' THEN 1 ELSE 0 END) as completadas
      FROM "FacturaElectronica" f
      JOIN "Ubicacion" u ON f."sucursalId" = u.id
      GROUP BY u.nombre
      ORDER BY COUNT(*) DESC
    `;
    
    // Manejo seguro para la serialización de BigInt
    const rawTotal = (totalFacturadoResult as any)[0]?.total;
    let totalFacturado = 0;
    
    if (rawTotal) {
      if (typeof rawTotal === 'bigint') {
        totalFacturado = Number(rawTotal);
      } else if (typeof rawTotal === 'number') {
        totalFacturado = rawTotal;
      } else if (rawTotal.toString) {
        // Si es un objeto que tiene método toString
        totalFacturado = Number(rawTotal.toString());
      }
    }
    
    // Procesar los resultados de porSucursal
    const porSucursal = [];
    if (Array.isArray(porSucursalResult)) {
      for (const item of porSucursalResult) {
        const cantidad = typeof item.cantidad === 'bigint' 
          ? Number(item.cantidad) 
          : (typeof item.cantidad === 'number' ? item.cantidad : 0);
          
        const completadas = typeof item.completadas === 'bigint' 
          ? Number(item.completadas) 
          : (typeof item.completadas === 'number' ? item.completadas : 0);
          
        porSucursal.push({
          sucursal: item.sucursal,
          cantidad,
          completadas
        });
      }
    }
    
    return NextResponse.json({
      total,
      completadas,
      pendientes: pendientes + procesando,
      error,
      totalFacturado,
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