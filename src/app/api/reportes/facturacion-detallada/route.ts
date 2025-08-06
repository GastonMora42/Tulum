// src/app/api/reportes/facturacion-detallada/route.ts
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
    const tipoFactura = searchParams.get('tipoFactura'); // A, B, C
    const estado = searchParams.get('estado'); // completada, error, pendiente
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    // Filtros base para ventas
    const whereVentas: any = {
      fecha: { gte: inicio, lte: fin }
    };
    
    if (sucursalId) {
      whereVentas.sucursalId = sucursalId;
    }

    // Filtros para facturas electrónicas
    const whereFacturas: any = {
      fechaEmision: { gte: inicio, lte: fin }
    };
    
    if (sucursalId) {
      whereFacturas.sucursalId = sucursalId;
    }
    
    if (tipoFactura) {
      whereFacturas.tipoComprobante = tipoFactura;
    }
    
    if (estado) {
      whereFacturas.estado = estado;
    }

    // 1. Estadísticas generales de facturación
    const estadisticasGenerales = await prisma.venta.aggregate({
      where: whereVentas,
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    const ventasFacturadas = await prisma.venta.aggregate({
      where: {
        ...whereVentas,
        facturada: true
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    const ventasNoFacturadas = await prisma.venta.aggregate({
      where: {
        ...whereVentas,
        facturada: false
      },
      _count: {
        id: true
      },
      _sum: {
        total: true
      }
    });

    // 2. Distribución por tipo de factura
    const distribucionTipoFactura = await prisma.venta.groupBy({
      by: ['tipoFactura'],
      where: {
        ...whereVentas,
        facturada: true,
        tipoFactura: { not: null }
      },
      _count: true,
      _sum: {
        total: true
      }
    });

    // 3. Estado de facturas electrónicas
    const estadoFacturas = await prisma.facturaElectronica.groupBy({
      by: ['estado'],
      where: whereFacturas,
      _count: true
    });

    // 4. Facturas electrónicas detalladas
    const facturasDetalladas = await prisma.facturaElectronica.findMany({
      where: whereFacturas,
      include: {
        venta: {
          include: {
            usuario: {
              select: { name: true }
            },
            items: {
              include: {
                producto: {
                  select: { nombre: true }
                }
              }
            }
          }
        },
        sucursal: {
          select: { nombre: true }
        }
      },
      orderBy: {
        fechaEmision: 'desc'
      },
      take: 100 // Limitar para performance
    });

    // 5. Análisis por sucursal
    const facturacionPorSucursal = await prisma.$queryRaw`
      SELECT 
        ub.id as sucursal_id,
        ub.nombre as sucursal_nombre,
        COUNT(v.id) as total_ventas,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) as ventas_facturadas,
        COUNT(CASE WHEN v.facturada = false THEN 1 END) as ventas_no_facturadas,
        SUM(v.total) as total_vendido,
        SUM(CASE WHEN v.facturada = true THEN v.total ELSE 0 END) as monto_facturado,
        SUM(CASE WHEN v.facturada = false THEN v.total ELSE 0 END) as monto_no_facturado,
        COUNT(fe.id) as facturas_electronicas,
        COUNT(CASE WHEN fe.estado = 'completada' THEN 1 END) as facturas_exitosas,
        COUNT(CASE WHEN fe.estado = 'error' THEN 1 END) as facturas_con_error
      FROM "Ubicacion" ub
      LEFT JOIN "Venta" v ON ub.id = v."sucursalId" 
        AND v.fecha >= ${inicio} 
        AND v.fecha <= ${fin}
      LEFT JOIN "FacturaElectronica" fe ON v.id = fe."ventaId"
      WHERE ub.activo = true
      ${sucursalId ? Prisma.sql`AND ub.id = ${sucursalId}` : Prisma.empty}
      GROUP BY ub.id, ub.nombre
      HAVING COUNT(v.id) > 0 OR ${!sucursalId}
      ORDER BY monto_facturado DESC NULLS LAST
    ` as Array<{
      sucursal_id: string;
      sucursal_nombre: string;
      total_ventas: number;
      ventas_facturadas: number;
      ventas_no_facturadas: number;
      total_vendido: number;
      monto_facturado: number;
      monto_no_facturado: number;
      facturas_electronicas: number;
      facturas_exitosas: number;
      facturas_con_error: number;
    }>;

    // 6. Tendencia de facturación
    const tendenciaFacturacion = await prisma.$queryRaw`
      SELECT 
        DATE(v.fecha) as dia,
        COUNT(v.id) as total_ventas,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) as ventas_facturadas,
        SUM(v.total) as monto_total,
        SUM(CASE WHEN v.facturada = true THEN v.total ELSE 0 END) as monto_facturado,
        COUNT(fe.id) as facturas_generadas,
        COUNT(CASE WHEN fe.estado = 'completada' THEN 1 END) as facturas_exitosas
      FROM "Venta" v
      LEFT JOIN "FacturaElectronica" fe ON v.id = fe."ventaId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY DATE(v.fecha)
      ORDER BY dia
    ` as Array<{
      dia: Date;
      total_ventas: number;
      ventas_facturadas: number;
      monto_total: number;
      monto_facturado: number;
      facturas_generadas: number;
      facturas_exitosas: number;
    }>;

    // 7. Errores más comunes
    const erroresComunes = await prisma.$queryRaw`
      SELECT 
        error,
        COUNT(*) as cantidad,
        MAX("updatedAt") as ultimo_error
      FROM "FacturaElectronica"
      WHERE "fechaEmision" >= ${inicio} 
        AND "fechaEmision" <= ${fin}
        AND estado = 'error'
        AND error IS NOT NULL
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY error
      ORDER BY cantidad DESC
      LIMIT 10
    ` as Array<{
      error: string;
      cantidad: number;
      ultimo_error: Date;
    }>;

    // 8. Facturas pendientes de procesamiento
    const facturasPendientes = await prisma.facturaElectronica.findMany({
      where: {
        estado: { in: ['pendiente', 'procesando'] },
        ...(sucursalId && { sucursalId })
      },
      include: {
        venta: {
          select: {
            id: true,
            fecha: true,
            total: true,
            clienteNombre: true
          }
        },
        sucursal: {
          select: { nombre: true }
        }
      },
      orderBy: {
        fechaEmision: 'asc'
      }
    });

    // 9. Análisis de CAE (Códigos de Autorización Electrónica)
    const analisisCAE = await prisma.$queryRaw`
      SELECT 
        COUNT(*) as total_facturas,
        COUNT(CASE WHEN cae IS NOT NULL AND cae != '' THEN 1 END) as con_cae,
        COUNT(CASE WHEN cae IS NULL OR cae = '' THEN 1 END) as sin_cae,
        COUNT(CASE WHEN "vencimientoCae" > NOW() THEN 1 END) as cae_vigente,
        COUNT(CASE WHEN "vencimientoCae" <= NOW() THEN 1 END) as cae_vencido
      FROM "FacturaElectronica"
      WHERE "fechaEmision" >= ${inicio} 
        AND "fechaEmision" <= ${fin}
        ${sucursalId ? Prisma.sql`AND "sucursalId" = ${sucursalId}` : Prisma.empty}
    ` as Array<{
      total_facturas: number;
      con_cae: number;
      sin_cae: number;
      cae_vigente: number;
      cae_vencido: number;
    }>;

    // 10. Ranking de vendedores por facturación
    const vendedoresPorFacturacion = await prisma.$queryRaw`
      SELECT 
        u.id,
        u.name,
        COUNT(v.id) as total_ventas,
        COUNT(CASE WHEN v.facturada = true THEN 1 END) as ventas_facturadas,
        SUM(CASE WHEN v.facturada = true THEN v.total ELSE 0 END) as monto_facturado,
        (COUNT(CASE WHEN v.facturada = true THEN 1 END)::float / COUNT(v.id) * 100) as porcentaje_facturacion
      FROM "User" u
      JOIN "Venta" v ON u.id = v."usuarioId"
      WHERE v.fecha >= ${inicio} AND v.fecha <= ${fin}
      ${sucursalId ? Prisma.sql`AND v."sucursalId" = ${sucursalId}` : Prisma.empty}
      GROUP BY u.id, u.name
      HAVING COUNT(v.id) > 0
      ORDER BY monto_facturado DESC
    ` as Array<{
      id: string;
      name: string;
      total_ventas: number;
      ventas_facturadas: number;
      monto_facturado: number;
      porcentaje_facturacion: number;
    }>;

    // 11. Calcular métricas adicionales
    const porcentajeFacturacion = estadisticasGenerales._count.id > 0 
      ? (ventasFacturadas._count.id / estadisticasGenerales._count.id) * 100 
      : 0;
    
    const porcentajeExitoFacturacion = facturasDetalladas.length > 0
      ? (facturasDetalladas.filter(f => f.estado === 'completada').length / facturasDetalladas.length) * 100
      : 0;

    return NextResponse.json({
      periodo: { inicio, fin },
      resumen: {
        totalVentas: estadisticasGenerales._count.id,
        montoTotal: estadisticasGenerales._sum.total || 0,
        ventasFacturadas: ventasFacturadas._count.id,
        montoFacturado: ventasFacturadas._sum.total || 0,
        ventasNoFacturadas: ventasNoFacturadas._count.id,
        montoNoFacturado: ventasNoFacturadas._sum.total || 0,
        porcentajeFacturacion: Math.round(porcentajeFacturacion * 100) / 100,
        porcentajeExitoFacturacion: Math.round(porcentajeExitoFacturacion * 100) / 100
      },
      distribucionTipoFactura: distribucionTipoFactura.map(d => ({
        tipo: d.tipoFactura || 'No especificado',
        cantidad: d._count,
        monto: d._sum.total || 0
      })),
      estadoFacturas: estadoFacturas.map(e => ({
        estado: e.estado,
        cantidad: e._count
      })),
      facturacionPorSucursal: facturacionPorSucursal.map(f => ({
        ...f,
        total_ventas: Number(f.total_ventas),
        ventas_facturadas: Number(f.ventas_facturadas),
        ventas_no_facturadas: Number(f.ventas_no_facturadas),
        total_vendido: Number(f.total_vendido),
        monto_facturado: Number(f.monto_facturado),
        monto_no_facturado: Number(f.monto_no_facturado),
        facturas_electronicas: Number(f.facturas_electronicas),
        facturas_exitosas: Number(f.facturas_exitosas),
        facturas_con_error: Number(f.facturas_con_error),
        porcentajeFacturacion: Number(f.total_ventas) > 0 
          ? Math.round((Number(f.ventas_facturadas) / Number(f.total_ventas)) * 10000) / 100 
          : 0,
        tasaExito: Number(f.facturas_electronicas) > 0 
          ? Math.round((Number(f.facturas_exitosas) / Number(f.facturas_electronicas)) * 10000) / 100 
          : 0
      })),
      tendencia: tendenciaFacturacion.map(t => ({
        ...t,
        total_ventas: Number(t.total_ventas),
        ventas_facturadas: Number(t.ventas_facturadas),
        monto_total: Number(t.monto_total),
        monto_facturado: Number(t.monto_facturado),
        facturas_generadas: Number(t.facturas_generadas),
        facturas_exitosas: Number(t.facturas_exitosas),
        porcentajeFacturacion: Number(t.total_ventas) > 0 
          ? Math.round((Number(t.ventas_facturadas) / Number(t.total_ventas)) * 10000) / 100 
          : 0
      })),
      erroresComunes: erroresComunes.map(e => ({
        ...e,
        cantidad: Number(e.cantidad)
      })),
      facturasPendientes,
      analisisCAE: analisisCAE[0] ? {
        total_facturas: Number(analisisCAE[0].total_facturas),
        con_cae: Number(analisisCAE[0].con_cae),
        sin_cae: Number(analisisCAE[0].sin_cae),
        cae_vigente: Number(analisisCAE[0].cae_vigente),
        cae_vencido: Number(analisisCAE[0].cae_vencido)
      } : null,
      vendedores: vendedoresPorFacturacion.map(v => ({
        ...v,
        total_ventas: Number(v.total_ventas),
        ventas_facturadas: Number(v.ventas_facturadas),
        monto_facturado: Number(v.monto_facturado),
        porcentaje_facturacion: Number(v.porcentaje_facturacion)
      })),
      facturasRecientes: facturasDetalladas.slice(0, 20).map(f => ({
        id: f.id,
        numeroFactura: f.numeroFactura,
        tipoComprobante: f.tipoComprobante,
        estado: f.estado,
        fechaEmision: f.fechaEmision,
        cae: f.cae,
        monto: f.venta?.total || 0,
        cliente: f.venta?.clienteNombre || 'Consumidor Final',
        vendedor: f.venta?.usuario?.name || 'N/A',
        sucursal: f.sucursal?.nombre || 'N/A',
        error: f.error
      }))
    });

  } catch (error) {
    console.error('Error en reporte de facturación detallada:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}