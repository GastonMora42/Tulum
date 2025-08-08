// src/app/api/reportes/productos-rendimiento/route.ts - VERSIÓN CORREGIDA
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
    
    console.log(`[REPORTES] Generando reporte productos: ${fechaInicio} a ${fechaFin}`);
    
    // 1. Top productos por ventas - CONSULTA CORREGIDA
    const topProductosSQL = Prisma.sql`
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
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      ${categoriaId ? Prisma.sql`AND p."categoriaId" = ${categoriaId}` : Prisma.empty}
      ${productoId ? Prisma.sql`AND p.id = ${productoId}` : Prisma.empty}
      GROUP BY p.id, p.nombre, p.precio, p."stockMinimo", c.nombre
      ORDER BY ingresos_totales DESC
      LIMIT 20
    `;
    
    const topProductos = await prisma.$queryRaw<Array<{
      id: string;
      nombre: string;
      precio: number;
      stockMinimo: number;
      categoria: string;
      cantidad_vendida: bigint;
      transacciones: bigint;
      ingresos_totales: number;
      precio_promedio: number;
      ultima_venta: Date;
    }>>`${topProductosSQL}`;
    
    // 2. Productos con más rotación - CONSULTA CORREGIDA
    const rotacionSQL = Prisma.sql`
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
      LEFT JOIN "Stock" s ON p.id = s."productoId" ${sucursalId ? Prisma.sql`AND s."ubicacionId" = ${sucursalId}` : Prisma.empty}
      WHERE p.activo = true
      ${categoriaId ? Prisma.sql`AND p."categoriaId" = ${categoriaId}` : Prisma.empty}
      GROUP BY p.id, p.nombre
      HAVING SUM(iv.cantidad) > 0
      ORDER BY indice_rotacion DESC
      LIMIT 20
    `;
    
    const productosRotacion = await prisma.$queryRaw<Array<{
      id: string;
      nombre: string;
      vendidos: bigint;
      stock_promedio: number;
      indice_rotacion: number;
    }>>`${rotacionSQL}`;
    
    // 3. Análisis de stock - CONSULTA CORREGIDA
    const stockCriticoSQL = Prisma.sql`
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
      LEFT JOIN "Stock" s ON p.id = s."productoId" ${sucursalId ? Prisma.sql`AND s."ubicacionId" = ${sucursalId}` : Prisma.empty}
      WHERE p.activo = true
      ${categoriaId ? Prisma.sql`AND p."categoriaId" = ${categoriaId}` : Prisma.empty}
      ORDER BY 
        CASE 
          WHEN s.cantidad <= 0 THEN 1
          WHEN s.cantidad < p."stockMinimo" THEN 2
          WHEN s.cantidad < p."stockMinimo" * 2 THEN 3
          ELSE 4
        END,
        s.cantidad ASC NULLS LAST
    `;
    
    const analisisStock = await prisma.$queryRaw<Array<{
      id: string;
      nombre: string;
      stockMinimo: number;
      stock_actual: number | null;
      estado_stock: string;
    }>>`${stockCriticoSQL}`;
    
    // 4. Tendencia de ventas por producto (top 5) - CONSULTA CORREGIDA
    const top5Ids = topProductos.slice(0, 5).map(p => p.id);
    
    let tendenciaProductos: Array<{
      id: string;
      nombre: string;
      fecha: Date;
      cantidad: bigint;
      ingresos: number;
    }> = [];
    
    if (top5Ids.length > 0) {
      const tendenciaSQL = Prisma.sql`
        SELECT 
          p.id,
          p.nombre,
          DATE(v.fecha) as fecha,
          SUM(iv.cantidad) as cantidad,
          SUM(iv.cantidad * iv."precioUnitario") as ingresos
        FROM "ItemVenta" iv
        JOIN "Producto" p ON iv."productoId" = p.id
        JOIN "Venta" v ON iv."ventaId" = v.id
        WHERE p.id = ANY(${top5Ids})
          AND v.fecha >= ${inicio} 
          AND v.fecha <= ${fin}
          ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY p.id, p.nombre, DATE(v.fecha)
        ORDER BY p.nombre, fecha
      `;
      
      tendenciaProductos = await prisma.$queryRaw<Array<{
        id: string;
        nombre: string;
        fecha: Date;
        cantidad: bigint;
        ingresos: number;
      }>>`${tendenciaSQL}`;
    }
    
    // 5. Estadísticas generales
    const estadisticas = {
      totalProductos: await prisma.producto.count({ where: { activo: true } }),
      productosConVentas: topProductos.length,
      productosStockCritico: analisisStock.filter(p => p.estado_stock === 'critico').length,
      productosSinStock: analisisStock.filter(p => p.estado_stock === 'sin_stock').length,
      ingresosTotales: topProductos.reduce((sum, p) => sum + (Number(p.ingresos_totales) || 0), 0),
      unidadesVendidas: topProductos.reduce((sum, p) => sum + (Number(p.cantidad_vendida) || 0), 0)
    };
    
    // 6. Productos por categoría - CONSULTA CORREGIDA
    const ventasPorCategoriaSQL = Prisma.sql`
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
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY c.id, c.nombre
      ORDER BY ingresos_totales DESC
    `;
    
    const ventasPorCategoria = await prisma.$queryRaw<Array<{
      id: string;
      categoria: string;
      productos_distintos: bigint;
      unidades_vendidas: bigint;
      ingresos_totales: number;
    }>>`${ventasPorCategoriaSQL}`;
    
    const responseData = {
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
      tendenciaProductos: tendenciaProductos.map(t => ({
        ...t,
        cantidad: Number(t.cantidad),
        ingresos: Number(t.ingresos)
      })),
      ventasPorCategoria: ventasPorCategoria.map(c => ({
        ...c,
        productos_distintos: Number(c.productos_distintos),
        unidades_vendidas: Number(c.unidades_vendidas),
        ingresos_totales: Number(c.ingresos_totales)
      }))
    };

    console.log(`[REPORTES] ✅ Reporte productos generado - ${estadisticas.totalProductos} productos, ${estadisticas.productosConVentas} con ventas`);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error en reporte de productos:', error);
    
    return NextResponse.json({ 
      error: 'Error al generar reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}