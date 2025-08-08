// src/app/api/reportes/ventas-detallado/route.ts - VERSIÓN CORREGIDA
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
    
    console.log(`[REPORTES] Generando reporte ventas detallado: ${fechaInicio} a ${fechaFin}, agrupado por: ${agruparPor}`);
    
    // Construir filtros
    const whereClause: any = {
      fecha: { gte: inicio, lte: fin }
    };
    
    if (sucursalId) {
      whereClause.sucursalId = sucursalId;
    }
    
    // 1. Ventas totales y estadísticas usando Prisma ORM (más seguro)
    const [
      ventasTotales,
      ventasPorMedioPago,
      ventasPorUsuario
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
      })
    ]);

    // 2. Top productos - CONSULTA CORREGIDA
    const ventasPorProducto = await prisma.$queryRaw<Array<{
      id: string;
      nombre: string;
      cantidad_vendida: bigint;
      total_vendido: number;
      veces_vendido: bigint;
    }>>`
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
    `;
    
    // 3. Por categoría - CONSULTA CORREGIDA
    const ventasPorCategoria = await prisma.$queryRaw<Array<{
      id: string;
      nombre: string;
      cantidad_vendida: bigint;
      total_vendido: number;
    }>>`
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
    `;
    
    // 4. Por hora del día - CONSULTA CORREGIDA
    const ventasPorHora = await prisma.$queryRaw<Array<{
      hora: number;
      cantidad_ventas: bigint;
      total_vendido: number;
    }>>`
      SELECT 
        EXTRACT(HOUR FROM fecha) as hora,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_vendido
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY EXTRACT(HOUR FROM fecha)
      ORDER BY hora
    `;
    
    // 5. Tendencia de ventas por período - CONSULTA COMPLETAMENTE REESCRITA
    let ventasPorPeriodo;
    
    if (agruparPor === 'dia') {
      ventasPorPeriodo = await prisma.$queryRaw<Array<{
        periodo: Date;
        cantidad_ventas: bigint;
        total_vendido: number;
        ticket_promedio: number;
      }>>`
        SELECT 
          DATE(fecha) as periodo,
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_promedio
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY DATE(fecha)
        ORDER BY periodo
      `;
    } else if (agruparPor === 'semana') {
      ventasPorPeriodo = await prisma.$queryRaw<Array<{
        periodo: Date;
        cantidad_ventas: bigint;
        total_vendido: number;
        ticket_promedio: number;
      }>>`
        SELECT 
          DATE_TRUNC('week', fecha) as periodo,
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_promedio
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY DATE_TRUNC('week', fecha)
        ORDER BY periodo
      `;
    } else if (agruparPor === 'mes') {
      ventasPorPeriodo = await prisma.$queryRaw<Array<{
        periodo: Date;
        cantidad_ventas: bigint;
        total_vendido: number;
        ticket_promedio: number;
      }>>`
        SELECT 
          DATE_TRUNC('month', fecha) as periodo,
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_promedio
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY DATE_TRUNC('month', fecha)
        ORDER BY periodo
      `;
    } else {
      // Default a día si no es válido
      ventasPorPeriodo = await prisma.$queryRaw<Array<{
        periodo: Date;
        cantidad_ventas: bigint;
        total_vendido: number;
        ticket_promedio: number;
      }>>`
        SELECT 
          DATE(fecha) as periodo,
          COUNT(*) as cantidad_ventas,
          SUM(total) as total_vendido,
          AVG(total) as ticket_promedio
        FROM "Venta"
        WHERE fecha >= ${inicio} AND fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY DATE(fecha)
        ORDER BY periodo
      `;
    }
    
    // 6. Métricas de rendimiento - CONSULTAS SEGURAS
    const mejorDia = await prisma.$queryRaw<Array<{
      dia: Date;
      ventas: bigint;
      total: number;
    }>>`
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
    `;
    
    const clienteFrecuente = await prisma.$queryRaw<Array<{
      clienteNombre: string;
      compras: bigint;
      total_gastado: number;
    }>>`
      SELECT 
        "clienteNombre",
        COUNT(*) as compras,
        SUM(total) as total_gastado
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      AND "clienteNombre" IS NOT NULL
      AND "clienteNombre" != ''
      ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY "clienteNombre"
      ORDER BY compras DESC
      LIMIT 5
    `;
    
    // 7. Obtener nombres de usuarios para el reporte
    const usuarioIds = ventasPorUsuario.map(v => v.usuarioId);
    const usuarios = usuarioIds.length > 0 ? await prisma.user.findMany({
      where: { id: { in: usuarioIds } },
      select: { id: true, name: true, email: true }
    }) : [];
    
    const usuariosMap = new Map(usuarios.map(u => [u.id, u]));
    
    // Combinar datos de ventas por usuario con nombres
    const ventasPorUsuarioConNombres = ventasPorUsuario.map(v => ({
      ...v,
      usuario: usuariosMap.get(v.usuarioId)
    }));

    // 8. Transformar datos para respuesta - CORREGIR TIPOS BIGINT
    const responseData = {
      periodo: { inicio, fin },
      resumen: {
        ventasTotales: ventasTotales._sum.total || 0,
        cantidadVentas: ventasTotales._count,
        ticketPromedio: ventasTotales._avg.total || 0,
        descuentosTotales: ventasTotales._sum.descuento || 0,
        mediosPago: ventasPorMedioPago,
        porUsuario: ventasPorUsuarioConNombres,
        porProducto: ventasPorProducto.map(p => ({
          ...p,
          cantidad_vendida: Number(p.cantidad_vendida),
          total_vendido: Number(p.total_vendido),
          veces_vendido: Number(p.veces_vendido)
        })),
        porCategoria: ventasPorCategoria.map(c => ({
          ...c,
          cantidad_vendida: Number(c.cantidad_vendida),
          total_vendido: Number(c.total_vendido)
        })),
        porHora: ventasPorHora.map(h => ({
          ...h,
          hora: Number(h.hora),
          cantidad_ventas: Number(h.cantidad_ventas),
          total_vendido: Number(h.total_vendido)
        })),
        mejorDia: mejorDia[0] ? {
          dia: mejorDia[0].dia,
          ventas: Number(mejorDia[0].ventas),
          total: Number(mejorDia[0].total)
        } : null,
        clienteFrecuente: clienteFrecuente.map(c => ({
          ...c,
          compras: Number(c.compras),
          total_gastado: Number(c.total_gastado)
        }))
      },
      tendencia: ventasPorPeriodo.map(t => ({
        ...t,
        cantidad_ventas: Number(t.cantidad_ventas),
        total_vendido: Number(t.total_vendido),
        ticket_promedio: Number(t.ticket_promedio)
      }))
    };

    console.log(`[REPORTES] ✅ Reporte generado exitosamente - ${responseData.resumen.cantidadVentas} ventas, $${responseData.resumen.ventasTotales}`);
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Error en reporte detallado:', error);
    
    // Log más detallado del error
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    
    return NextResponse.json({ 
      error: 'Error al generar reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}