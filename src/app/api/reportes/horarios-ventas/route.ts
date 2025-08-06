// src/app/api/reportes/horarios-ventas/route.ts
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
    
    if (!fechaInicio || !fechaFin) {
      return NextResponse.json({ error: 'Se requieren fechas' }, { status: 400 });
    }
    
    const inicio = startOfDay(new Date(fechaInicio));
    const fin = endOfDay(new Date(fechaFin));
    
    // Mapa de calor: ventas por hora y día de la semana
    const mapaCalorSQL = `
      SELECT 
        EXTRACT(HOUR FROM fecha) as hora,
        EXTRACT(DOW FROM fecha) as dia_semana,
        COUNT(*) as cantidad_ventas,
        SUM(total) as total_vendido,
        AVG(total) as ticket_promedio
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? `AND "sucursalId" = '${sucursalId}'` : ''}
      GROUP BY EXTRACT(HOUR FROM fecha), EXTRACT(DOW FROM fecha)
      ORDER BY dia_semana, hora
    `;
    
    const mapaCalor = await prisma.$queryRaw`${Prisma.raw(mapaCalorSQL)}` as any[];
    
    // Ventas por hora (promedio)
    const ventasPorHoraSQL = `
      SELECT 
        EXTRACT(HOUR FROM fecha) as hora,
        COUNT(*) as total_ventas,
        SUM(total) as ingresos_totales,
        AVG(total) as ticket_promedio,
        COUNT(*) * 1.0 / COUNT(DISTINCT DATE(fecha)) as promedio_ventas_por_dia
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? `AND "sucursalId" = '${sucursalId}'` : ''}
      GROUP BY EXTRACT(HOUR FROM fecha)
      ORDER BY hora
    `;
    
    const ventasPorHora = await prisma.$queryRaw`${Prisma.raw(ventasPorHoraSQL)}` as any[];
    
    // Ventas por día de la semana
    const ventasPorDiaSQL = `
      SELECT 
        EXTRACT(DOW FROM fecha) as dia_semana,
        CASE EXTRACT(DOW FROM fecha)
          WHEN 0 THEN 'Domingo'
          WHEN 1 THEN 'Lunes'
          WHEN 2 THEN 'Martes'
          WHEN 3 THEN 'Miércoles'
          WHEN 4 THEN 'Jueves'
          WHEN 5 THEN 'Viernes'
          WHEN 6 THEN 'Sábado'
        END as nombre_dia,
        COUNT(*) as total_ventas,
        SUM(total) as ingresos_totales,
        AVG(total) as ticket_promedio
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? `AND "sucursalId" = '${sucursalId}'` : ''}
      GROUP BY EXTRACT(DOW FROM fecha)
      ORDER BY dia_semana
    `;
    
    const ventasPorDia = await prisma.$queryRaw`${Prisma.raw(ventasPorDiaSQL)}` as any[];
    
    // Horas pico (top 5)
    const horasPicoSQL = `
      SELECT 
        EXTRACT(HOUR FROM fecha) as hora,
        COUNT(*) as ventas,
        SUM(total) as ingresos,
        CASE 
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 6 AND 11 THEN 'Mañana'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 12 AND 17 THEN 'Tarde'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 18 AND 23 THEN 'Noche'
          ELSE 'Madrugada'
        END as periodo
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? `AND "sucursalId" = '${sucursalId}'` : ''}
      GROUP BY EXTRACT(HOUR FROM fecha)
      ORDER BY ventas DESC
      LIMIT 5
    `;
    
    const horasPico = await prisma.$queryRaw`${Prisma.raw(horasPicoSQL)}` as any[];
    
    // Análisis de períodos
    const analisisPeriodosSQL = `
      SELECT 
        CASE 
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 6 AND 11 THEN 'Mañana'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 12 AND 17 THEN 'Tarde'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 18 AND 23 THEN 'Noche'
          ELSE 'Madrugada'
        END as periodo,
        COUNT(*) as total_ventas,
        SUM(total) as ingresos_totales,
        AVG(total) as ticket_promedio,
        MIN(EXTRACT(HOUR FROM fecha)) as hora_inicio,
        MAX(EXTRACT(HOUR FROM fecha)) as hora_fin
      FROM "Venta"
      WHERE fecha >= ${inicio} AND fecha <= ${fin}
      ${sucursalId ? `AND "sucursalId" = '${sucursalId}'` : ''}
      GROUP BY 
        CASE 
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 6 AND 11 THEN 'Mañana'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 12 AND 17 THEN 'Tarde'
          WHEN EXTRACT(HOUR FROM fecha) BETWEEN 18 AND 23 THEN 'Noche'
          ELSE 'Madrugada'
        END
      ORDER BY total_ventas DESC
    `;
    
    const analisisPeriodos = await prisma.$queryRaw`${Prisma.raw(analisisPeriodosSQL)}` as any[];
    
    // Estadísticas generales
    const estadisticas = {
      totalVentas: ventasPorHora.reduce((sum, h) => sum + Number(h.total_ventas), 0),
      ingresosTotales: ventasPorHora.reduce((sum, h) => sum + Number(h.ingresos_totales), 0),
      horaMasConcurrida: horasPico[0] ? {
        hora: Number(horasPico[0].hora),
        ventas: Number(horasPico[0].ventas),
        ingresos: Number(horasPico[0].ingresos)
      } : null,
      diaMasConcurrido: ventasPorDia.reduce((max, dia) => 
        Number(dia.total_ventas) > Number(max.total_ventas) ? dia : max, ventasPorDia[0]
      ),
      periodoMasActivo: analisisPeriodos[0]?.periodo || 'N/A'
    };
    
    // Transformar datos para el mapa de calor
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const mapaCalorFormateado = [];
    
    for (let hora = 0; hora < 24; hora++) {
      for (let dia = 0; dia < 7; dia++) {
        const dato = mapaCalor.find(m => 
          Number(m.hora) === hora && Number(m.dia_semana) === dia
        );
        
        mapaCalorFormateado.push({
          hora,
          dia,
          nombre_dia: diasSemana[dia],
          cantidad_ventas: dato ? Number(dato.cantidad_ventas) : 0,
          total_vendido: dato ? Number(dato.total_vendido) : 0,
          ticket_promedio: dato ? Number(dato.ticket_promedio) : 0,
          intensidad: dato ? Number(dato.cantidad_ventas) : 0
        });
      }
    }
    
    return NextResponse.json({
      periodo: { inicio, fin },
      estadisticas,
      mapaCalor: mapaCalorFormateado,
      ventasPorHora: ventasPorHora.map(h => ({
        ...h,
        hora: Number(h.hora),
        total_ventas: Number(h.total_ventas),
        ingresos_totales: Number(h.ingresos_totales),
        ticket_promedio: Number(h.ticket_promedio),
        promedio_ventas_por_dia: Number(h.promedio_ventas_por_dia)
      })),
      ventasPorDia: ventasPorDia.map(d => ({
        ...d,
        dia_semana: Number(d.dia_semana),
        total_ventas: Number(d.total_ventas),
        ingresos_totales: Number(d.ingresos_totales),
        ticket_promedio: Number(d.ticket_promedio)
      })),
      horasPico: horasPico.map(h => ({
        ...h,
        hora: Number(h.hora),
        ventas: Number(h.ventas),
        ingresos: Number(h.ingresos)
      })),
      analisisPeriodos: analisisPeriodos.map(p => ({
        ...p,
        total_ventas: Number(p.total_ventas),
        ingresos_totales: Number(p.ingresos_totales),
        ticket_promedio: Number(p.ticket_promedio),
        hora_inicio: Number(p.hora_inicio),
        hora_fin: Number(p.hora_fin)
      }))
    });

  } catch (error) {
    console.error('Error en reporte de horarios:', error);
    return NextResponse.json({ error: 'Error al generar reporte' }, { status: 500 });
  }
}