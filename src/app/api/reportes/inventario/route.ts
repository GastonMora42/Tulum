// src/app/api/reportes/inventario/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['reportes:ver', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const incluirCero = searchParams.get('incluirCero') === 'true';
    
    // Filtros base
    const whereStock: any = {};
    if (sucursalId) {
      whereStock.ubicacionId = sucursalId;
    }
    if (!incluirCero) {
      whereStock.cantidad = { gt: 0 };
    }
    
    // 1. Stock actual por ubicación
    const stockPorUbicacion = await prisma.stock.groupBy({
      by: ['ubicacionId'],
      where: whereStock,
      _sum: { cantidad: true },
      _count: true
    });
    
    // 2. Productos con stock bajo
    const productosStockBajo = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.nombre,
        p."stockMinimo",
        s."ubicacionId",
        u.nombre as ubicacion,
        s.cantidad as stock_actual
      FROM "Stock" s
      JOIN "Producto" p ON s."productoId" = p.id
      JOIN "Ubicacion" u ON s."ubicacionId" = u.id
      WHERE s.cantidad < p."stockMinimo"
      ${sucursalId ? Prisma.sql`AND s."ubicacionId" = ${sucursalId}` : Prisma.empty}
      ORDER BY (p."stockMinimo" - s.cantidad) DESC
    `;
    
    // 3. Valor total del inventario
    const valorInventario = await prisma.$queryRaw`
      SELECT 
        u.id as ubicacion_id,
        u.nombre as ubicacion,
        SUM(s.cantidad * p.precio) as valor_total,
        COUNT(DISTINCT p.id) as productos_distintos,
        SUM(s.cantidad) as unidades_totales
      FROM "Stock" s
      JOIN "Producto" p ON s."productoId" = p.id
      JOIN "Ubicacion" u ON s."ubicacionId" = u.id
      WHERE s.cantidad > 0
      ${sucursalId ? Prisma.sql`AND s."ubicacionId" = ${sucursalId}` : Prisma.empty}
      GROUP BY u.id, u.nombre
      ORDER BY valor_total DESC
    `;
    
    // 4. Movimientos recientes
    const movimientosRecientes = await prisma.movimientoStock.findMany({
      where: sucursalId ? {
        stock: { ubicacionId: sucursalId }
      } : {},
      include: {
        stock: {
          include: {
            producto: true,
            ubicacion: true
          }
        },
        usuario: {
          select: { name: true, email: true }
        }
      },
      orderBy: { fecha: 'desc' },
      take: 50
    });
    
    // 5. Rotación de inventario (últimos 30 días)
    const hace30Dias = new Date();
    hace30Dias.setDate(hace30Dias.getDate() - 30);
    
    const rotacionInventario = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.nombre,
        COALESCE(SUM(iv.cantidad), 0) as vendido_30_dias,
        AVG(s.cantidad) as stock_promedio,
        CASE 
          WHEN AVG(s.cantidad) > 0 
          THEN COALESCE(SUM(iv.cantidad), 0) / AVG(s.cantidad)
          ELSE 0
        END as indice_rotacion
      FROM "Producto" p
      LEFT JOIN "Stock" s ON p.id = s."productoId"
      LEFT JOIN "ItemVenta" iv ON p.id = iv."productoId"
      LEFT JOIN "Venta" v ON iv."ventaId" = v.id AND v.fecha >= ${hace30Dias}
      ${sucursalId ? Prisma.sql`WHERE s."ubicacionId" = ${sucursalId}` : Prisma.empty}
      GROUP BY p.id, p.nombre
      HAVING AVG(s.cantidad) > 0
      ORDER BY indice_rotacion DESC
      LIMIT 20
    `;
    
    // 6. Obtener todas las ubicaciones para el filtro
    const ubicaciones = await prisma.ubicacion.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, tipo: true }
    });
    
    return NextResponse.json({
      ubicaciones,
      resumen: {
        stockPorUbicacion,
        productosStockBajo: productosStockBajo as any[],
        valorInventario,
        totalProductosStockBajo: (productosStockBajo as any[]).length
      },
      movimientosRecientes,
      rotacionInventario
    });
  } catch (error) {
    console.error('Error en reporte de inventario:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}