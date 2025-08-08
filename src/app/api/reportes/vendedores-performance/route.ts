// src/app/api/reportes/vendedores-performance/route.ts - VERSIÓN CORREGIDA
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
    const vendedorId = searchParams.get('vendedorId');
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    console.log(`[REPORTES] Generando reporte vendedores: ${fechaInicio} a ${fechaFin}`);
    
    // Performance por vendedor - CONSULTA CORREGIDA
    const performanceSQL = Prisma.sql`
      SELECT 
        u.id,
        u.name,
        u.email,
        ub.nombre as sucursal_principal,
        COUNT(v.id) as total_ventas,
        SUM(v.total) as ingresos_totales,
        AVG(v.total) as ticket_promedio,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) as ventas_facturadas,
        COUNT(CASE WHEN v.descuento > 0 THEN 1 END) as ventas_con_descuento,
        SUM(v.descuento) as descuentos_aplicados,
        COUNT(DISTINCT DATE(v.fecha)) as dias_activos,
        MIN(v.fecha) as primera_venta,
        MAX(v.fecha) as ultima_venta
      FROM "User" u
      LEFT JOIN "Ubicacion" ub ON u."sucursalId" = ub.id
      JOIN "Venta" v ON u.id = v."usuarioId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      ${vendedorId ? Prisma.sql`AND u.id = ${vendedorId}` : Prisma.empty}
      GROUP BY u.id, u.name, u.email, ub.nombre
      ORDER BY ingresos_totales DESC
    `;
    
    const performance = await prisma.$queryRaw<Array<{
      id: string;
      name: string;
      email: string;
      sucursal_principal: string;
      total_ventas: bigint;
      ingresos_totales: number;
      ticket_promedio: number;
      ventas_facturadas: bigint;
      ventas_con_descuento: bigint;
      descuentos_aplicados: number;
      dias_activos: bigint;
      primera_venta: Date;
      ultima_venta: Date;
    }>>`${performanceSQL}`;
    
    // Productos más vendidos por vendedor (top 3 de cada uno) - CONSULTA CORREGIDA
    const productosVendedorSQL = Prisma.sql`
      SELECT 
        u.id as vendedor_id,
        u.name as vendedor,
        p.nombre as producto,
        SUM(iv.cantidad) as cantidad_vendida,
        SUM(iv.cantidad * iv."precioUnitario") as ingresos_producto,
        ROW_NUMBER() OVER (PARTITION BY u.id ORDER BY SUM(iv.cantidad * iv."precioUnitario") DESC) as rank
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      JOIN "ItemVenta" iv ON v.id = iv."ventaId"
      JOIN "Producto" p ON iv."productoId" = p.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      ${vendedorId ? Prisma.sql`AND u.id = ${vendedorId}` : Prisma.empty}
      GROUP BY u.id, u.name, p.nombre
      ORDER BY u.id, ingresos_producto DESC
    `;
    
    const productosVendedor = await prisma.$queryRaw<Array<{
      vendedor_id: string;
      vendedor: string;
      producto: string;
      cantidad_vendida: bigint;
      ingresos_producto: number;
      rank: bigint;
    }>>`${productosVendedorSQL}`;
    
    // Tendencia diaria por vendedor (top 5 vendedores) - CONSULTA CORREGIDA
    const top5Vendedores = performance.slice(0, 5).map(v => v.id);
    
    let tendenciaVendedores: Array<{
      vendedor_id: string;
      vendedor: string;
      fecha: Date;
      ventas_dia: bigint;
      ingresos_dia: number;
      ticket_promedio_dia: number;
    }> = [];
    
    if (top5Vendedores.length > 0) {
      const tendenciaSQL = Prisma.sql`
        SELECT 
          u.id as vendedor_id,
          u.name as vendedor,
          DATE(v.fecha) as fecha,
          COUNT(v.id) as ventas_dia,
          SUM(v.total) as ingresos_dia,
          AVG(v.total) as ticket_promedio_dia
        FROM "User" u
        JOIN "Venta" v ON u.id = v."usuarioId"
        WHERE u.id = ANY(${top5Vendedores})
          AND v.fecha >= ${inicio} 
          AND v.fecha <= ${fin}
          ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
        GROUP BY u.id, u.name, DATE(v.fecha)
        ORDER BY u.name, fecha
      `;
      
      tendenciaVendedores = await prisma.$queryRaw<Array<{
        vendedor_id: string;
        vendedor: string;
        fecha: Date;
        ventas_dia: bigint;
        ingresos_dia: number;
        ticket_promedio_dia: number;
      }>>`${tendenciaSQL}`;
    }
    
    // Análisis de horarios por vendedor - CONSULTA CORREGIDA
    const horariosSQL = Prisma.sql`
      SELECT 
        u.id as vendedor_id,
        u.name as vendedor,
        EXTRACT(HOUR FROM v.fecha) as hora,
        COUNT(v.id) as ventas_hora,
        SUM(v.total) as ingresos_hora
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      ${vendedorId ? Prisma.sql`AND u.id = ${vendedorId}` : Prisma.empty}
      GROUP BY u.id, u.name, EXTRACT(HOUR FROM v.fecha)
      ORDER BY u.name, hora
    `;
    
    const analisisHorarios = await prisma.$queryRaw<Array<{
      vendedor_id: string;
      vendedor: string;
      hora: number;
      ventas_hora: bigint;
      ingresos_hora: number;
    }>>`${horariosSQL}`;
    
    // Medios de pago por vendedor - CONSULTA CORREGIDA
    const mediosPagoSQL = Prisma.sql`
      SELECT 
        u.id as vendedor_id,
        u.name as vendedor,
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      JOIN "Pago" p ON v.id = p."ventaId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      ${vendedorId ? Prisma.sql`AND u.id = ${vendedorId}` : Prisma.empty}
      GROUP BY u.id, u.name, p."medioPago"
      ORDER BY u.name, monto_total DESC
    `;
    
    const mediosPagoVendedor = await prisma.$queryRaw<Array<{
      vendedor_id: string;
      vendedor: string;
      medioPago: string;
      transacciones: bigint;
      monto_total: number;
    }>>`${mediosPagoSQL}`;
    
    // Estadísticas generales
    const estadisticas = {
      totalVendedores: performance.length,
      ventasTotales: performance.reduce((sum, v) => sum + Number(v.total_ventas), 0),
      ingresosTotales: performance.reduce((sum, v) => sum + Number(v.ingresos_totales), 0),
      ticketPromedio: performance.length > 0 ? 
        performance.reduce((sum, v) => sum + Number(v.ticket_promedio), 0) / performance.length : 0,
      mejorVendedor: performance[0] ? {
        nombre: performance[0].name,
        ingresos: Number(performance[0].ingresos_totales),
        ventas: Number(performance[0].total_ventas)
      } : null
    };
    
    const responseData = {
      periodo: { inicio, fin },
      estadisticas,
      performance: performance.map(v => ({
        ...v,
        total_ventas: Number(v.total_ventas),
        ingresos_totales: Number(v.ingresos_totales),
        ticket_promedio: Number(v.ticket_promedio),
        ventas_facturadas: Number(v.ventas_facturadas),
        ventas_con_descuento: Number(v.ventas_con_descuento),
        descuentos_aplicados: Number(v.descuentos_aplicados),
        dias_activos: Number(v.dias_activos),
        porcentaje_facturacion: Number(v.total_ventas) > 0 ? 
          (Number(v.ventas_facturadas) / Number(v.total_ventas) * 100).toFixed(1) : '0'
      })),
      productosVendedor: productosVendedor
        .filter(p => Number(p.rank) <= 3)
        .map(p => ({
          ...p,
          cantidad_vendida: Number(p.cantidad_vendida),
          ingresos_producto: Number(p.ingresos_producto),
          rank: Number(p.rank)
        })),
      tendenciaVendedores: tendenciaVendedores.map(t => ({
        ...t,
        ventas_dia: Number(t.ventas_dia),
        ingresos_dia: Number(t.ingresos_dia),
        ticket_promedio_dia: Number(t.ticket_promedio_dia)
      })),
      analisisHorarios: analisisHorarios.map(h => ({
        ...h,
        hora: Number(h.hora),
        ventas_hora: Number(h.ventas_hora),
        ingresos_hora: Number(h.ingresos_hora)
      })),
      mediosPagoVendedor: mediosPagoVendedor.map(m => ({
        ...m,
        transacciones: Number(m.transacciones),
        monto_total: Number(m.monto_total)
      }))
    };

    console.log(`[REPORTES] ✅ Reporte vendedores generado - ${estadisticas.totalVendedores} vendedores, $${estadisticas.ingresosTotales}`);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error en reporte de vendedores:', error);
    
    return NextResponse.json({ 
      error: 'Error al generar reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}