// src/app/api/reportes/medios-pago/route.ts
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
    const medioPago = searchParams.get('medioPago');
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    // Distribución por medios de pago
    const distribucionSQL = `
      SELECT 
        p."medioPago",
        COUNT(p.id) as cantidad_transacciones,
        SUM(p.monto) as monto_total,
        AVG(p.monto) as monto_promedio,
        MIN(p.monto) as monto_minimo,
        MAX(p.monto) as monto_maximo,
        COUNT(DISTINCT v.id) as ventas_distintas,
        COUNT(DISTINCT v."usuarioId") as vendedores_distintos
      FROM "Pago" p
      JOIN "Venta" v ON p."ventaId" = v.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${medioPago ? `AND p."medioPago" = '${medioPago}'` : ''}
      GROUP BY p."medioPago"
      ORDER BY monto_total DESC
    `;
    
    const distribucion = await prisma.$queryRaw`${Prisma.raw(distribucionSQL)}` as any[];
    
    // Tendencia por día
    const tendenciaSQL = `
      SELECT 
        DATE(v.fecha) as fecha,
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total
      FROM "Pago" p
      JOIN "Venta" v ON p."ventaId" = v.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      ${medioPago ? `AND p."medioPago" = '${medioPago}'` : ''}
      GROUP BY DATE(v.fecha), p."medioPago"
      ORDER BY fecha, p."medioPago"
    `;
    
    const tendencia = await prisma.$queryRaw`${Prisma.raw(tendenciaSQL)}` as any[];
    
    // Análisis por horario
    const horarioSQL = `
      SELECT 
        EXTRACT(HOUR FROM v.fecha) as hora,
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total
      FROM "Pago" p
      JOIN "Venta" v ON p."ventaId" = v.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY EXTRACT(HOUR FROM v.fecha), p."medioPago"
      ORDER BY hora, p."medioPago"
    `;
    
    const analisisHorario = await prisma.$queryRaw`${Prisma.raw(horarioSQL)}` as any[];
    
    // Análisis por sucursal (si no hay filtro de sucursal)
    const sucursalesSQL = !sucursalId ? `
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal,
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total
      FROM "Pago" p
      JOIN "Venta" v ON p."ventaId" = v.id
      JOIN "Ubicacion" ub ON v."sucursalId" = ub.id
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${medioPago ? `AND p."medioPago" = '${medioPago}'` : ''}
      GROUP BY ub.id, ub.nombre, p."medioPago"
      ORDER BY ub.nombre, monto_total DESC
    ` : '';
    
    const analisisSucursales = sucursalesSQL ? 
      await prisma.$queryRaw`${Prisma.raw(sucursalesSQL)}` as any[] : [];
    
    // Comparativa con período anterior
    const diasPeriodo = Math.ceil((fin.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
    const inicioAnterior = new Date(inicio);
    inicioAnterior.setDate(inicioAnterior.getDate() - diasPeriodo);
    const finAnterior = new Date(inicio);
    finAnterior.setDate(finAnterior.getDate() - 1);
    
    const comparativaSQL = `
      SELECT 
        p."medioPago",
        COUNT(p.id) as transacciones,
        SUM(p.monto) as monto_total
      FROM "Pago" p
      JOIN "Venta" v ON p."ventaId" = v.id
      WHERE v.fecha >= ${inicioAnterior} AND v.fecha <= ${finAnterior}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY p."medioPago"
    `;
    
    const periodoAnterior = await prisma.$queryRaw`${Prisma.raw(comparativaSQL)}` as any[];
    
    // Ventas con múltiples medios de pago
    const ventasMultiplesPagosSQL = `
      SELECT 
        v.id,
        v.total as total_venta,
        COUNT(p.id) as cantidad_pagos,
        ARRAY_AGG(p."medioPago") as medios_utilizados,
        ARRAY_AGG(p.monto) as montos
      FROM "Venta" v
      JOIN "Pago" p ON v.id = p."ventaId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? `AND v."sucursalId" = '${sucursalId}'` : ''}
      GROUP BY v.id, v.total
      HAVING COUNT(p.id) > 1
      ORDER BY cantidad_pagos DESC, total_venta DESC
      LIMIT 20
    `;
    
    const ventasMultiplesPagos = await prisma.$queryRaw`${Prisma.raw(ventasMultiplesPagosSQL)}` as any[];
    
    // Estadísticas generales
    const totalTransacciones = distribucion.reduce((sum, d) => sum + Number(d.cantidad_transacciones), 0);
    const montoTotal = distribucion.reduce((sum, d) => sum + Number(d.monto_total), 0);
    
    const estadisticas = {
      totalTransacciones,
      montoTotal,
      medioMasUsado: distribucion[0] ? {
        medio: distribucion[0].medioPago,
        transacciones: Number(distribucion[0].cantidad_transacciones),
        monto: Number(distribucion[0].monto_total),
        porcentaje: totalTransacciones > 0 ? 
          (Number(distribucion[0].cantidad_transacciones) / totalTransacciones * 100).toFixed(1) : '0'
      } : null,
      ventasConMultiplesPagos: ventasMultiplesPagos.length,
      promedioTransaccionPorVenta: totalTransacciones > 0 ? 
        (totalTransacciones / distribucion.reduce((sum, d) => sum + Number(d.ventas_distintas), 0)).toFixed(2) : '0'
    };
    
    // Calcular comparativa con período anterior
    const comparativa = distribucion.map(actual => {
      const anterior = periodoAnterior.find(p => p.medioPago === actual.medioPago);
      const montoActual = Number(actual.monto_total);
      const montoAnterior = anterior ? Number(anterior.monto_total) : 0;
      
      return {
        medioPago: actual.medioPago,
        actual: montoActual,
        anterior: montoAnterior,
        cambio: montoAnterior > 0 ? ((montoActual - montoAnterior) / montoAnterior * 100).toFixed(1) : '100',
        tendencia: montoActual > montoAnterior ? 'up' : montoActual < montoAnterior ? 'down' : 'stable'
      };
    });
    
    return NextResponse.json({
      periodo: { inicio, fin },
      estadisticas,
      distribucion: distribucion.map(d => ({
        ...d,
        cantidad_transacciones: Number(d.cantidad_transacciones),
        monto_total: Number(d.monto_total),
        monto_promedio: Number(d.monto_promedio),
        monto_minimo: Number(d.monto_minimo),
        monto_maximo: Number(d.monto_maximo),
        ventas_distintas: Number(d.ventas_distintas),
        vendedores_distintos: Number(d.vendedores_distintos),
        porcentaje: totalTransacciones > 0 ? 
          (Number(d.cantidad_transacciones) / totalTransacciones * 100).toFixed(1) : '0'
      })),
      tendencia: tendencia.map(t => ({
        ...t,
        transacciones: Number(t.transacciones),
        monto_total: Number(t.monto_total)
      })),
      analisisHorario: analisisHorario.map(h => ({
        ...h,
        hora: Number(h.hora),
        transacciones: Number(h.transacciones),
        monto_total: Number(h.monto_total)
      })),
      analisisSucursales: analisisSucursales.map(s => ({
        ...s,
        transacciones: Number(s.transacciones),
        monto_total: Number(s.monto_total)
      })),
      ventasMultiplesPagos: ventasMultiplesPagos.map(v => ({
        ...v,
        total_venta: Number(v.total_venta),
        cantidad_pagos: Number(v.cantidad_pagos)
      })),
      comparativa
    });

  } catch (error) {
    console.error('Error en reporte de medios de pago:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}