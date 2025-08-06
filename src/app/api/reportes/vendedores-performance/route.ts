// src/app/api/reportes/vendedores-performance/route.ts
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
    
    // Performance por vendedor
    const performanceSQL = `
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
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${vendedorId ? `AND u.id = '${vendedorId}'` : ''}
      GROUP BY u.id, u.name, u.email, ub.nombre
      ORDER BY ingresos_totales DESC
    `;
    
    const performance = await prisma.$queryRaw`${Prisma.raw(performanceSQL)}` as any[];
    
    // Productos más vendidos por vendedor (top 3 de cada uno)
    const productosVendedorSQL = `
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
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${vendedorId ? `AND u.id = '${vendedorId}'` : ''}
      GROUP BY u.id, u.name, p.nombre
      ORDER BY u.id, ingresos_producto DESC
    `;
    
    const productosVendedor = await prisma.$queryRaw`${Prisma.raw(productosVendedorSQL)}` as any[];
    
    // Tendencia diaria por vendedor (top 5 vendedores)
    const top5Vendedores = performance.slice(0, 5).map(v => `'${v.id}'`).join(',');
    
    const tendenciaSQL = top5Vendedores ? `
      SELECT 
        u.id as vendedor_id,
        u.name as vendedor,
        DATE(v.fecha) as fecha,
        COUNT(v.id) as ventas_dia,
        SUM(v.total) as ingresos_dia,
        AVG(v.total) as ticket_promedio_dia
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      WHERE u.id IN (${top5Vendedores})
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
        ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY u.id, u.name, DATE(v.fecha)
      ORDER BY u.name, fecha
    ` : '';
    
    const tendenciaVendedores = tendenciaSQL ? 
      await prisma.$queryRaw`${Prisma.raw(tendenciaSQL)}` as any[] : [];
    
    // Análisis de horarios por vendedor
    const horariosSQL = `
      SELECT 
        u.id as vendedor_id,
        u.name as vendedor,
        EXTRACT(HOUR FROM v.fecha) as hora,
        COUNT(v.id) as ventas_hora,
        SUM(v.total) as ingresos_hora
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${vendedorId ? `AND u.id = '${vendedorId}'` : ''}
      GROUP BY u.id, u.name, EXTRACT(HOUR FROM v.fecha)
      ORDER BY u.name, hora
    `;
    
    const analisisHorarios = await prisma.$queryRaw`${Prisma.raw(horariosSQL)}` as any[];
    
    // Medios de pago por vendedor
    const mediosPagoSQL = `
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
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${vendedorId ? `AND u.id = '${vendedorId}'` : ''}
      GROUP BY u.id, u.name, p."medioPago"
      ORDER BY u.name, monto_total DESC
    `;
    
    const mediosPagoVendedor = await prisma.$queryRaw`${Prisma.raw(mediosPagoSQL)}` as any[];
    
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
    
    return NextResponse.json({
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
    });

  } catch (error) {
    console.error('Error en reporte de vendedores:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}