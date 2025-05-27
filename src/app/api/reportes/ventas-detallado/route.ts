// src/app/api/reportes/ventas-detallado/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { startOfDay, endOfDay, eachDayOfInterval, format } from 'date-fns';
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
    const agruparPor = searchParams.get('agruparPor') || 'dia'; // dia, semana, mes
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    // Construir filtros
    const whereClause: any = {
      fecha: { gte: inicio, lte: fin }
    };
    
    if (sucursalId) {
      whereClause.sucursalId = sucursalId;
    }
    
    // 1. Ventas totales y estadísticas
    const [
      ventasTotales,
      ventasPorMedioPago,
      ventasPorUsuario,
      ventasPorProducto,
      ventasPorCategoria,
      ventasPorHora
    ] = await Promise.all([
      // Total general
      prisma.venta.aggregate({
        where: whereClause,
        _sum: { total: true, descuento: true },
        _count: true,
        _avg: { total: true }
      }),
      
      // Por medio de pago
      prisma.pago.groupBy({
        by: ['medioPago'],
        where: { venta: whereClause },
        _sum: { monto: true },
        _count: true
      }),
      
      // Por usuario/vendedor
      prisma.venta.groupBy({
        by: ['usuarioId'],
        where: whereClause,
        _sum: { total: true },
        _count: true
      }),
      
      // Por producto (top 20)
      prisma.$queryRaw`
        SELECT 
          p.id,
          p.nombre,
          SUM(iv.cantidad) as cantidad_vendida,
          SUM(iv.cantidad * iv."precioUnitario") as total_vendido,
          COUNT(DISTINCT v.id) as veces_vendido
        FROM "ItemVenta" iv
        JOIN "Producto" p ON iv."productoId" = p.id
        JOIN "Venta" v ON iv."ventaId" = v.id
        WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY p.id, p.nombre
        ORDER BY total_vendido DESC
        LIMIT 20
      `,
      
      // Por categoría
      prisma.$queryRaw`
        SELECT 
          c.id,
          c.nombre,
          SUM(iv.cantidad) as cantidad_vendida,
          SUM(iv.cantidad * iv."precioUnitario") as total_vendido
        FROM "ItemVenta" iv
        JOIN "Producto" p ON iv."productoId" = p.id
        JOIN "Categoria" c ON p."categoriaId" = c.id
        JOIN "Venta" v ON iv."ventaId" = v.id
        WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY c.id, c.nombre
        ORDER BY total_vendido DESC
      `,
      
      // Por hora del día
      prisma.$queryRaw`
        SELECT 
          EXTRACT(HOUR FROM fecha) as hora,
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_vendido
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY EXTRACT(HOUR FROM fecha)
        ORDER BY hora
      `
    ]);
    
    // 2. Tendencia de ventas por período
    const ventasPorPeriodo = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${agruparPor}, fecha) as periodo,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_vendido,
        AVG(total) as ticket_promedio
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY DATE_TRUNC(${agruparPor}, fecha)
      ORDER BY periodo
    `;
    
    // 3. Métricas de rendimiento
    const metricas = {
      ventasTotales: ventasTotales._sum.total || 0,
      cantidadVentas: ventasTotales._count,
      ticketPromedio: ventasTotales._avg.total || 0,
      descuentosTotales: ventasTotales._sum.descuento || 0,
      
      // Día con más ventas
      mejorDia: await prisma.$queryRaw`
        SELECT 
          DATE(fecha) as dia,
          COUNT(*) as ventas,
          SUM(total) as total
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY DATE(fecha)
        ORDER BY total DESC
        LIMIT 1
      `,
      
      // Cliente más frecuente
      clienteFrecuente: await prisma.$queryRaw`
        SELECT 
          "clienteNombre",
          COUNT(*) as compras,
          SUM(total) as total_gastado
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        AND "clienteNombre" IS NOT NULL
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY "clienteNombre"
        ORDER BY compras DESC
        LIMIT 5
      `
    };
    
    // 4. Obtener nombres de usuarios para el reporte
    const usuarioIds = ventasPorUsuario.map(v => v.usuarioId);
    const usuarios = await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, name: true, email: true }
    });
    
    const usuariosMap = new Map(usuarios.map(u => [u.id, u]));
    
    // Combinar datos de ventas por usuario con nombres
    const ventasPorUsuarioConNombres = ventasPorUsuario.map(v => ({
      ...v,
      usuario: usuariosMap.get(v.usuarioId)
    }));
    
    return NextResponse.json({
      periodo: { inicio, fin },
      resumen: {
        ...metricas,
        mediosPago: ventasPorMedioPago,
        porUsuario: ventasPorUsuarioConNombres,
        porProducto: ventasPorProducto,
        porCategoria: ventasPorCategoria,
        porHora: ventasPorHora
      },
      tendencia: ventasPorPeriodo
    });
  } catch (error) {
    console.error('Error en reporte detallado:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}