// src/app/api/admin/punto-equilibrio/route.ts
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
    
    // Obtener sucursales
    const sucursales = await prisma.ubicacion.findMany({
      where: { 
        tipo: 'sucursal',
        activo: true 
      },
      select: {
        id: true,
        nombre: true
      }
    });

    // Obtener configuraciones
    const configuraciones = await prisma.puntoEquilibrioConfig.findMany({
      where: {
        año: parseInt(año),
        mes: parseInt(mes)
      }
    });

    const configMap = configuraciones.reduce((acc: { [x: string]: any; }, config: { sucursalId: string | number; }) => {
      acc[config.sucursalId] = config;
      return acc;
    }, {} as Record<string, any>);

    // Calcular datos para cada sucursal
    const sucursalesData = await Promise.all(
      sucursales.map(async (sucursal) => {
        // Ventas del mes actual
        const ventasMes = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: new Date(`${año}-${mes}-01`),
              lt: new Date(`${año}-${String(parseInt(mes) + 1).padStart(2, '0')}-01`)
            }
          },
          _sum: { total: true }
        });

        // Ventas del mes anterior
        const mesAnterior = parseInt(mes) === 1 ? 12 : parseInt(mes) - 1;
        const añoAnterior = parseInt(mes) === 1 ? parseInt(año) - 1 : parseInt(año);
        
        const ventasAnterior = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: new Date(`${añoAnterior}-${String(mesAnterior).padStart(2, '0')}-01`),
              lt: new Date(`${añoAnterior}-${String(mesAnterior + 1).padStart(2, '0')}-01`)
            }
          },
          _sum: { total: true }
        });

        const config = configMap[sucursal.id];
        const costosFijos = config?.costosFijos || 50000;
        const costosVariables = config?.costosVariables || 30;
        const metaMensual = config?.metaMensual || 200000;
        
        const ventasActuales = ventasMes._sum.total || 0;
        const ventasPrevias = ventasAnterior._sum.total || 0;
        
        // Cálculos financieros
        const margenContribucion = 100 - costosVariables;
        const puntoEquilibrio = costosFijos / (margenContribucion / 100);
        const progreso = metaMensual > 0 ? (ventasActuales / metaMensual) * 100 : 0;
        
        let estado: 'por_debajo' | 'en_meta' | 'superando';
        if (progreso >= 100) estado = 'superando';
        else if (progreso >= 80) estado = 'en_meta';
        else estado = 'por_debajo';

        return {
          id: sucursal.id,
          nombre: sucursal.nombre,
          ventasMes: ventasActuales,
          ventasAnterior: ventasPrevias,
          costosFijos,
          costosVariables,
          metaMensual,
          puntoEquilibrio,
          margenContribucion,
          progreso,
          estado
        };
      })
    );

    return NextResponse.json({
      sucursales: sucursalesData,
      configuraciones: configMap
    });
  } catch (error) {
    console.error('Error en punto de equilibrio:', error);
    return NextResponse.json(
      { error: 'Error al calcular punto de equilibrio' },
      { status: 500 }
    );
  }
}