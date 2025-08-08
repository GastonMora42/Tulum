// src/app/api/reportes/ventas-por-sucursal/route.ts - VERSIÓN CORREGIDA
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
    const agruparPor = searchParams.get('agruparPor') || 'dia';
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    console.log(`[REPORTES] Generando reporte ventas por sucursal: ${fechaInicio} a ${fechaFin}`);
    
    // Ventas por sucursal - CONSULTA CORREGIDA
    const ventasPorSucursalSQL = Prisma.sql`
      SELECT 
        ub.id,
        ub.nombre as sucursal,
        ub.direccion,
        ub.telefono,
        COUNT(v.id) as total_ventas,
        SUM(v.total) as ingresos_totales,
        AVG(v.total) as ticket_promedio,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) as ventas_facturadas,
        SUM(CASE WHEN v.facturada = true THEN v.total ELSE 0 END) as monto_facturado,
        COUNT(DISTINCT v."usuarioId") as vendedores_activos,
        COUNT(DISTINCT DATE(v.fecha)) as dias_con_ventas,
        MIN(v.fecha) as primera_venta,
        MAX(v.fecha) as ultima_venta
      FROM "Ubicacion" ub
      LEFT JOIN "Venta" v ON ub.id = v."sucursalId" 
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      WHERE ub.activo = true AND ub.tipo = 'sucursal'
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre, ub.direccion, ub.telefono
      HAVING COUNT(v.id) > 0 OR ${!sucursalId}
      ORDER BY ingresos_totales DESC NULLS LAST
    `;
    
    const ventasPorSucursal = await prisma.$queryRaw<Array<{
      id: string;
      sucursal: string;
      direccion: string | null;
      telefono: string | null;
      total_ventas: bigint;
      ingresos_totales: number;
      ticket_promedio: number;
      ventas_facturadas: bigint;
      monto_facturado: number;
      vendedores_activos: bigint;
      dias_con_ventas: bigint;
      primera_venta: Date | null;
      ultima_venta: Date | null;
    }>>`${ventasPorSucursalSQL}`;
    
    // Comparativa entre sucursales (métricas normalizadas) - CONSULTA CORREGIDA
    const comparativaSQL = Prisma.sql`
      SELECT 
        ub.id,
        ub.nombre as sucursal,
        COUNT(v.id) as ventas,
        SUM(v.total) as ingresos,
        AVG(v.total) as ticket_promedio,
        COUNT(v.id) * 1.0 / NULLIF(COUNT(DISTINCT DATE(v.fecha)), 0) as ventas_promedio_dia,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) * 1.0 / NULLIF(COUNT(v.id), 0) * 100 as porcentaje_facturacion
      FROM "Ubicacion" ub
      JOIN "Venta" v ON ub.id = v."sucursalId"
      WHERE ub.activo = true 
        AND ub.tipo = 'sucursal'
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre
      ORDER BY ingresos DESC
    `;
    
    const comparativa = await prisma.$queryRaw<Array<{
      id: string;
      sucursal: string;
      ventas: bigint;
      ingresos: number;
      ticket_promedio: number;
      ventas_promedio_dia: number;
      porcentaje_facturacion: number;
    }>>`${comparativaSQL}`;
    
    // Tendencia temporal por sucursal - CONSULTA CORREGIDA CON CONDICIONALES
    let tendencia: Array<{
      sucursal_id: string;
      sucursal: string;
      periodo: Date;
      ventas_periodo: bigint;
      ingresos_periodo: number;
      ticket_promedio_periodo: number;
    }> = [];
    
    if (agruparPor === 'dia') {
      const tendenciaSQL = Prisma.sql`
        SELECT 
          ub.id as sucursal_id,
          ub.nombre as sucursal,
          DATE(v.fecha) as periodo,
          COUNT(v.id) as ventas_periodo,
          SUM(v.total) as ingresos_periodo,
          AVG(v.total) as ticket_promedio_periodo
        FROM "Ubicacion" ub
        JOIN "Venta" v ON ub.id = v."sucursalId"
        WHERE ub.activo = true 
          AND ub.tipo = 'sucursal'
          AND v.fecha >= ${inicio} 
          AND v.fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
        GROUP BY ub.id, ub.nombre, DATE(v.fecha)
        ORDER BY ub.nombre, periodo
      `;
      
      tendencia = await prisma.$queryRaw<Array<{
        sucursal_id: string;
        sucursal: string;
        periodo: Date;
        ventas_periodo: bigint;
        ingresos_periodo: number;
        ticket_promedio_periodo: number;
      }>>`${tendenciaSQL}`;
    } else if (agruparPor === 'semana') {
      const tendenciaSQL = Prisma.sql`
        SELECT 
          ub.id as sucursal_id,
          ub.nombre as sucursal,
          DATE_TRUNC('week', v.fecha) as periodo,
          COUNT(v.id) as ventas_periodo,
          SUM(v.total) as ingresos_periodo,
          AVG(v.total) as ticket_promedio_periodo
        FROM "Ubicacion" ub
        JOIN "Venta" v ON ub.id = v."sucursalId"
        WHERE ub.activo = true 
          AND ub.tipo = 'sucursal'
          AND v.fecha >= ${inicio} 
          AND v.fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
        GROUP BY ub.id, ub.nombre, DATE_TRUNC('week', v.fecha)
        ORDER BY ub.nombre, periodo
      `;
      
      tendencia = await prisma.$queryRaw<Array<{
        sucursal_id: string;
        sucursal: string;
        periodo: Date;
        ventas_periodo: bigint;
        ingresos_periodo: number;
        ticket_promedio_periodo: number;
      }>>`${tendenciaSQL}`;
    } else {
      // Default a mes
      const tendenciaSQL = Prisma.sql`
        SELECT 
          ub.id as sucursal_id,
          ub.nombre as sucursal,
          DATE_TRUNC('month', v.fecha) as periodo,
          COUNT(v.id) as ventas_periodo,
          SUM(v.total) as ingresos_periodo,
          AVG(v.total) as ticket_promedio_periodo
        FROM "Ubicacion" ub
        JOIN "Venta" v ON ub.id = v."sucursalId"
        WHERE ub.activo = true 
          AND ub.tipo = 'sucursal'
          AND v.fecha >= ${inicio} 
          AND v.fecha <= ${fin}
        ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
        GROUP BY ub.id, ub.nombre, DATE_TRUNC('month', v.fecha)
        ORDER BY ub.nombre, periodo
      `;
      
      tendencia = await prisma.$queryRaw<Array<{
        sucursal_id: string;
        sucursal: string;
        periodo: Date;
        ventas_periodo: bigint;
        ingresos_periodo: number;
        ticket_promedio_periodo: number;
      }>>`${tendenciaSQL}`;
    }
    
    // Top productos por sucursal - CONSULTA CORREGIDA
    const topProductosSucursalSQL = Prisma.sql`
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal,
        p.nombre as producto,
        SUM(iv.cantidad) as cantidad_vendida,
        SUM(iv.cantidad * iv."precioUnitario") as ingresos_producto,
        ROW_NUMBER() OVER (PARTITION BY ub.id ORDER BY SUM(iv.cantidad * iv."precioUnitario") DESC) as rank
      FROM "Ubicacion" ub
      JOIN "Venta" v ON ub.id = v."sucursalId"
      JOIN "ItemVenta" iv ON v.id = iv."ventaId"
      JOIN "Producto" p ON iv."productoId" = p.id
      WHERE ub.activo = true 
        AND ub.tipo = 'sucursal'
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre, p.nombre
      ORDER BY ub.nombre, ingresos_producto DESC
    `;
    
    const topProductosSucursal = await prisma.$queryRaw<Array<{
      sucursal_id: string;
      sucursal: string;
      producto: string;
      cantidad_vendida: bigint;
      ingresos_producto: number;
      rank: bigint;
    }>>`${topProductosSucursalSQL}`;
    
    // Performance por vendedor por sucursal - CONSULTA CORREGIDA
    const vendedoresSucursalSQL = Prisma.sql`
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal,
        u.id as vendedor_id,
        u.name as vendedor,
        COUNT(v.id) as ventas,
        SUM(v.total) as ingresos,
        AVG(v.total) as ticket_promedio
      FROM "Ubicacion" ub
      JOIN "Venta" v ON ub.id = v."sucursalId"
      JOIN "User" u ON v."usuarioId" = u.id
      WHERE ub.activo = true 
        AND ub.tipo = 'sucursal'
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre, u.id, u.name
      ORDER BY ub.nombre, ingresos DESC
    `;
    
    const vendedoresSucursal = await prisma.$queryRaw<Array<{
      sucursal_id: string;
      sucursal: string;
      vendedor_id: string;
      vendedor: string;
      ventas: bigint;
      ingresos: number;
      ticket_promedio: number;
    }>>`${vendedoresSucursalSQL}`;
    
    // Análisis de horarios por sucursal - CONSULTA CORREGIDA
    const horariosSucursalSQL = Prisma.sql`
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal,
        EXTRACT(HOUR FROM v.fecha) as hora,
        COUNT(v.id) as ventas_hora,
        SUM(v.total) as ingresos_hora,
        AVG(v.total) as ticket_promedio_hora
      FROM "Ubicacion" ub
      JOIN "Venta" v ON ub.id = v."sucursalId"
      WHERE ub.activo = true 
        AND ub.tipo = 'sucursal'
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre, EXTRACT(HOUR FROM v.fecha)
      ORDER BY ub.nombre, hora
    `;
    
    const horariosSucursal = await prisma.$queryRaw<Array<{
      sucursal_id: string;
      sucursal: string;
      hora: number;
      ventas_hora: bigint;
      ingresos_hora: number;
      ticket_promedio_hora: number;
    }>>`${horariosSucursalSQL}`;
    
    // Medios de pago por sucursal - CONSULTA CORREGIDA
    const mediosPagoSucursalSQL = Prisma.sql`
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal,
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total,
        AVG(p.monto) as monto_promedio
      FROM "Ubicacion" ub
      JOIN "Venta" v ON ub.id = v."sucursalId"
      JOIN "Pago" p ON v.id = p."ventaId"
      WHERE ub.activo = true 
        AND ub.tipo = 'sucursal'
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre, p."medioPago"
      ORDER BY ub.nombre, monto_total DESC
    `;
    
    const mediosPagoSucursal = await prisma.$queryRaw<Array<{
      sucursal_id: string;
      sucursal: string;
      medioPago: string;
      transacciones: bigint;
      monto_total: number;
      monto_promedio: number;
    }>>`${mediosPagoSucursalSQL}`;
    
    // Estadísticas generales
    const totalSucursales = ventasPorSucursal.length;
    const ventasTotales = ventasPorSucursal.reduce((sum, s) => sum + Number(s.total_ventas), 0);
    const ingresosTotales = ventasPorSucursal.reduce((sum, s) => sum + Number(s.ingresos_totales), 0);
    
    const estadisticas = {
      totalSucursales,
      ventasTotales,
      ingresosTotales,
      ticketPromedioGeneral: ventasTotales > 0 ? ingresosTotales / ventasTotales : 0,
      sucursalMasVentas: ventasPorSucursal[0] ? {
        nombre: ventasPorSucursal[0].sucursal,
        ventas: Number(ventasPorSucursal[0].total_ventas),
        ingresos: Number(ventasPorSucursal[0].ingresos_totales)
      } : null,
      promedioVentasPorSucursal: totalSucursales > 0 ? ventasTotales / totalSucursales : 0,
      promedioIngresosPorSucursal: totalSucursales > 0 ? ingresosTotales / totalSucursales : 0
    };
    
    // Ranking de sucursales
    const ranking = comparativa.map((sucursal, index) => ({
      posicion: index + 1,
      sucursal_id: sucursal.id,
      sucursal: sucursal.sucursal,
      ventas: Number(sucursal.ventas),
      ingresos: Number(sucursal.ingresos),
      ticket_promedio: Number(sucursal.ticket_promedio),
      ventas_promedio_dia: Number(sucursal.ventas_promedio_dia),
      porcentaje_facturacion: Number(sucursal.porcentaje_facturacion),
      participacion_ventas: ventasTotales > 0 ? (Number(sucursal.ventas) / ventasTotales * 100).toFixed(1) : '0',
      participacion_ingresos: ingresosTotales > 0 ? (Number(sucursal.ingresos) / ingresosTotales * 100).toFixed(1) : '0'
    }));
    
    const responseData = {
      periodo: { inicio, fin },
      estadisticas,
      ventasPorSucursal: ventasPorSucursal.map(s => ({
        ...s,
        total_ventas: Number(s.total_ventas),
        ingresos_totales: Number(s.ingresos_totales),
        ticket_promedio: Number(s.ticket_promedio),
        ventas_facturadas: Number(s.ventas_facturadas),
        monto_facturado: Number(s.monto_facturado),
        vendedores_activos: Number(s.vendedores_activos),
        dias_con_ventas: Number(s.dias_con_ventas),
        porcentaje_facturacion: Number(s.total_ventas) > 0 ? 
          (Number(s.ventas_facturadas) / Number(s.total_ventas) * 100).toFixed(1) : '0'
      })),
      ranking,
      tendencia: tendencia.map(t => ({
        ...t,
        ventas_periodo: Number(t.ventas_periodo),
        ingresos_periodo: Number(t.ingresos_periodo),
        ticket_promedio_periodo: Number(t.ticket_promedio_periodo)
      })),
      topProductosSucursal: topProductosSucursal
        .filter(p => Number(p.rank) <= 5)
        .map(p => ({
          ...p,
          cantidad_vendida: Number(p.cantidad_vendida),
          ingresos_producto: Number(p.ingresos_producto),
          rank: Number(p.rank)
        })),
      vendedoresSucursal: vendedoresSucursal.map(v => ({
        ...v,
        ventas: Number(v.ventas),
        ingresos: Number(v.ingresos),
        ticket_promedio: Number(v.ticket_promedio)
      })),
      horariosSucursal: horariosSucursal.map(h => ({
        ...h,
        hora: Number(h.hora),
        ventas_hora: Number(h.ventas_hora),
        ingresos_hora: Number(h.ingresos_hora),
        ticket_promedio_hora: Number(h.ticket_promedio_hora)
      })),
      mediosPagoSucursal: mediosPagoSucursal.map(m => ({
        ...m,
        transacciones: Number(m.transacciones),
        monto_total: Number(m.monto_total),
        monto_promedio: Number(m.monto_promedio)
      }))
    };

    console.log(`[REPORTES] ✅ Reporte sucursales generado - ${estadisticas.totalSucursales} sucursales, $${estadisticas.ingresosTotales}`);
    
    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error en reporte de ventas por sucursal:', error);
    
    return NextResponse.json({ 
      error: 'Error al generar reporte',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}