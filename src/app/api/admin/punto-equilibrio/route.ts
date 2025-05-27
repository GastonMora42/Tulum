// src/app/api/admin/punto-equilibrio/route.ts - VERSIÓN MEJORADA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const mesParam = searchParams.get('mes') || new Date().toISOString().substring(0, 7);
    const [año, mes] = mesParam.split('-');
    
    // Obtener sucursales activas
    const sucursales = await prisma.ubicacion.findMany({
      where: { 
        tipo: 'sucursal',
        activo: true 
      },
      select: {
        id: true,
        nombre: true,
        direccion: true
      }
    });

    // Obtener configuraciones para el mes específico
    const configuraciones = await prisma.puntoEquilibrioConfig.findMany({
      where: {
        año: parseInt(año),
        mes: parseInt(mes)
      },
      include: {
        usuario: {
          select: {
            name: true
          }
        }
      }
    });

    const configMap = configuraciones.reduce((acc: { [x: string]: any; }, config: { sucursalId: string | number; }) => {
      acc[config.sucursalId] = config;
      return acc;
    }, {} as Record<string, any>);

    // Calcular datos para cada sucursal
    const sucursalesData = await Promise.all(
      sucursales.map(async (sucursal) => {
        const inicioMes = new Date(`${año}-${mes}-01`);
        const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
        
        // Ventas del mes actual
        const ventasMes = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: inicioMes,
              lte: finMes
            }
          },
          _sum: { total: true },
          _count: true
        });

        // Ventas del mes anterior para comparación
        const inicioMesAnterior = new Date(inicioMes.getFullYear(), inicioMes.getMonth() - 1, 1);
        const finMesAnterior = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), 0);
        
        const ventasAnterior = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: inicioMesAnterior,
              lte: finMesAnterior
            }
          },
          _sum: { total: true }
        });

        // Ventas por día del mes para gráfico
        const ventasPorDia = await prisma.$queryRaw`
          SELECT 
            DATE(fecha) as dia,
            SUM(total) as total,
            COUNT(*) as cantidad
          FROM "Venta" 
          WHERE "sucursalId" = ${sucursal.id}
            AND fecha >= ${inicioMes}
            AND fecha <= ${finMes}
          GROUP BY DATE(fecha)
          ORDER BY dia
        ` as Array<{ dia: Date; total: number; cantidad: number }>;

        const config = configMap[sucursal.id];
        const costosFijos = config?.costosFijos || 50000;
        const costosVariables = config?.costosVariables || 30;
        const metaMensual = config?.metaMensual || 200000;
        
        const ventasActuales = ventasMes._sum.total || 0;
        const ventasPrevias = ventasAnterior._sum.total || 0;
        const cantidadVentas = ventasMes._count || 0;
        
        // Cálculos financieros
        const margenContribucion = 100 - costosVariables;
        const puntoEquilibrio = costosFijos / (margenContribucion / 100);
        const progreso = metaMensual > 0 ? (ventasActuales / metaMensual) * 100 : 0;
        const crecimientoMensual = ventasPrevias > 0 ? ((ventasActuales - ventasPrevias) / ventasPrevias) * 100 : 0;
        
        // Proyección para fin de mes
        const diasTranscurridos = new Date().getDate();
        const diasDelMes = finMes.getDate();
        const proyeccionMes = diasTranscurridos > 0 ? (ventasActuales / diasTranscurridos) * diasDelMes : 0;
        
        let estado: 'critico' | 'por_debajo' | 'en_meta' | 'superando';
        if (progreso < 50) estado = 'critico';
        else if (progreso < 80) estado = 'por_debajo';
        else if (progreso < 100) estado = 'en_meta';
        else estado = 'superando';

        return {
          id: sucursal.id,
          nombre: sucursal.nombre,
          direccion: sucursal.direccion,
          ventasMes: ventasActuales,
          ventasAnterior: ventasPrevias,
          cantidadVentas,
          costosFijos,
          costosVariables,
          metaMensual,
          puntoEquilibrio,
          margenContribucion,
          progreso,
          estado,
          crecimientoMensual,
          proyeccionMes,
          ventasPorDia: ventasPorDia.map(v => ({
            fecha: v.dia.toISOString().split('T')[0],
            total: Number(v.total),
            cantidad: Number(v.cantidad)
          })),
          configurado: !!config,
          ultimaActualizacion: config?.updatedAt
        };
      })
    );

    return NextResponse.json({
      sucursales: sucursalesData,
      configuraciones: configMap,
      resumen: {
        totalVentas: sucursalesData.reduce((sum, s) => sum + s.ventasMes, 0),
        totalMetas: sucursalesData.reduce((sum, s) => sum + s.metaMensual, 0),
        promedioProgreso: sucursalesData.reduce((sum, s) => sum + s.progreso, 0) / sucursalesData.length,
        sucursalesConfiguradas: sucursalesData.filter(s => s.configurado).length,
        sucursalesEnMeta: sucursalesData.filter(s => s.progreso >= 80).length
      }
    });
  } catch (error) {
    console.error('Error en punto de equilibrio:', error);
    return NextResponse.json(
      { error: 'Error al calcular punto de equilibrio' },
      { status: 500 }
    );
  }
}