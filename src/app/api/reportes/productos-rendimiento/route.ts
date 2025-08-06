

// src/app/api/reportes/productos-rendimiento/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { startOfDay, endOfDay } from 'date-fns';
import prisma from '@/server/db/client';
import { Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['reportes:ver', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const fechaInicio = searchParams.get('fechaInicio');
    const fechaFin = searchParams.get('fechaFin');
    const sucursalId = searchParams.get('sucursalId');
    const categoriaId = searchParams.get('categoriaId');
    const productoId = searchParams.get('productoId');
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    // Filtros base
    const whereVenta: any = {
      fecha: { gte: inicio, lte: fin }
    };
    
    if (sucursalId) {
      whereVenta.sucursalId = sucursalId;
    }
    
    // 1. Top productos por ventas
    const topProductosSQL = `
      SELECT 
        p.id,
        p.nombre,
        p.precio,
        p."stockMinimo",
        c.nombre as categoria,
        SUM(iv.cantidad) as cantidad_vendida,
        COUNT(DISTINCT v.id) as transacciones,
        SUM(iv.cantidad * iv."precioUnitario") as ingresos_totales,
        AVG(iv."precioUnitario") as precio_promedio,
        MAX(v.fecha) as ultima_venta
      FROM "ItemVenta" iv
      JOIN "Producto" p ON iv."productoId" = p.id
      JOIN "Categoria" c ON p."categoriaId" = c.id
      JOIN "Venta" v ON iv."ventaId" = v.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${categoriaId ? `AND p."categoriaId" = '${categoriaId}'` : ''}
      ${productoId ? `AND p.id = '${productoId}'` : ''}
      GROUP BY p.id, p.nombre, p.precio, p."stockMinimo", c.nombre
      ORDER BY ingresos_totales DESC
      LIMIT 20
    `;
    
    const topProductos = await prisma.$queryRaw`${Prisma.raw(topProductosSQL)}` as any[];
    
    // 2. Productos con más rotación
    const rotacionSQL = `
      SELECT 
        p.id,
        p.nombre,
        SUM(iv.cantidad) as vendidos,
        AVG(s.cantidad) as stock_promedio,
        CASE 
          WHEN AVG(s.cantidad) > 0 
          THEN SUM(iv.cantidad) / AVG(s.cantidad)
          ELSE 0 
        END as indice_rotacion
      FROM "Producto" p
      LEFT JOIN "ItemVenta" iv ON p.id = iv."productoId"
      LEFT JOIN "Venta" v ON iv."ventaId" = v.id AND v.fecha >= ${inicio} AND v.fecha <= ${fin}
      LEFT JOIN "Stock" s ON p.id = s."productoId" ${sucursalId ? `AND s."ubicacionId" = '${sucursalId}'` : ''}
      WHERE p.activo = true
      ${categoriaId ? `AND p."categoriaId" = '${categoriaId}'` : ''}
      GROUP BY p.id, p.nombre
      HAVING SUM(iv.cantidad) > 0
      ORDER BY indice_rotacion DESC
      LIMIT 20
    `;
    
    const productosRotacion = await prisma.$queryRaw`${Prisma.raw(rotacionSQL)}` as any[];
    
    // 3. Análisis de stock
    const stockCriticoSQL = `
      SELECT 
        p.id,
        p.nombre,
        p."stockMinimo",
        s.cantidad as stock_actual,
        CASE 
          WHEN s.cantidad <= 0 THEN 'sin_stock'
          WHEN s.cantidad < p."stockMinimo" THEN 'critico'
          WHEN s.cantidad < p."stockMinimo" * 2 THEN 'bajo'
          ELSE 'normal'
        END as estado_stock
      FROM "Producto" p
      LEFT JOIN "Stock" s ON p.id = s."productoId" ${sucursalId ? `AND s."ubicacionId" = '${sucursalId}'` : ''}
      WHERE p.activo = true
      ${categoriaId ? `AND p."categoriaId" = '${categoriaId}'` : ''}
      ORDER BY 
        CASE 
          WHEN s.cantidad <= 0 THEN 1
          WHEN s.cantidad < p."stockMinimo" THEN 2
          WHEN s.cantidad < p."stockMinimo" * 2 THEN 3
          ELSE 4
        END,
        s.cantidad ASC
    `;
    
    const analisisStock = await prisma.$queryRaw`${Prisma.raw(stockCriticoSQL)}` as any[];
    
    // 4. Tendencia de ventas por producto (top 5)
    const top5Ids = topProductos.slice(0, 5).map(p => `'${p.id}'`).join(',');
    
    const tendenciaSQL = top5Ids ? `
      SELECT 
        p.id,
        p.nombre,
        DATE(v.fecha) as fecha,
        SUM(iv.cantidad) as cantidad,
        SUM(iv.cantidad * iv."precioUnitario") as ingresos
      FROM "ItemVenta" iv
      JOIN "Producto" p ON iv."productoId" = p.id
      JOIN "Venta" v ON iv."ventaId" = v.id
      WHERE p.id IN (${top5Ids})
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
        ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY p.id, p.nombre, DATE(v.fecha)
      ORDER BY p.nombre, fecha
    ` : '';
    
    const tendenciaProductos = tendenciaSQL ? 
      await prisma.$queryRaw`${Prisma.raw(tendenciaSQL)}` as any[] : [];
    
    // 5. Estadísticas generales
    const estadisticas = {
      totalProductos: await prisma.producto.count({ where: { activo: true } }),
      productosConVentas: topProductos.length,
      productosStockCritico: analisisStock.filter(p => p.estado_stock === 'critico').length,
      productosSinStock: analisisStock.filter(p => p.estado_stock === 'sin_stock').length,
      ingresosTotales: topProductos.reduce((sum, p) => sum + (Number(p.ingresos_totales) || 0), 0),
      unidadesVendidas: topProductos.reduce((sum, p) => sum + (Number(p.cantidad_vendida) || 0), 0)
    };
    
    // 6. Productos por categoría
    const ventasPorCategoriaSQL = `
      SELECT 
        c.id,
        c.nombre as categoria,
        COUNT(DISTINCT p.id) as productos_distintos,
        SUM(iv.cantidad) as unidades_vendidas,
        SUM(iv.cantidad * iv."precioUnitario") as ingresos_totales
      FROM "Categoria" c
      JOIN "Producto" p ON c.id = p."categoriaId"
      JOIN "ItemVenta" iv ON p.id = iv."productoId"
      JOIN "Venta" v ON iv."ventaId" = v.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY c.id, c.nombre
      ORDER BY ingresos_totales DESC
    `;
    
    const ventasPorCategoria = await prisma.$queryRaw`${Prisma.raw(ventasPorCategoriaSQL)}` as any[];
    
    return NextResponse.json({
      periodo: { inicio, fin },
      estadisticas,
      topProductos: topProductos.map(p => ({
        ...p,
        cantidad_vendida: Number(p.cantidad_vendida),
        transacciones: Number(p.transacciones),
        ingresos_totales: Number(p.ingresos_totales),
        precio_promedio: Number(p.precio_promedio)
      })),
      productosRotacion: productosRotacion.map(p => ({
        ...p,
        vendidos: Number(p.vendidos),
        stock_promedio: Number(p.stock_promedio),
        indice_rotacion: Number(p.indice_rotacion)
      })),
      analisisStock: analisisStock.map(p => ({
        ...p,
        stockMinimo: Number(p.stockMinimo),
        stock_actual: Number(p.stock_actual) || 0
      })),
      tendenciaProductos,
      ventasPorCategoria: ventasPorCategoria.map(c => ({
        ...c,
        productos_distintos: Number(c.productos_distintos),
        unidades_vendidas: Number(c.unidades_vendidas),
        ingresos_totales: Number(c.ingresos_totales)
      }))
    });

  } catch (error) {
    console.error('Error en reporte de productos:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}


