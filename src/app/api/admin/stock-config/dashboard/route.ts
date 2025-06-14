// src/app/api/admin/stock-config/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');

    // Obtener todas las configuraciones activas
    const configs = await prisma.stockConfigSucursal.findMany({
      where: {
        activo: true,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: {
        producto: true,
        sucursal: true
      }
    });

    // Obtener stocks actuales para todas las configuraciones
    const stocksActuales = await prisma.stock.findMany({
      where: {
        productoId: { in: configs.map(c => c.productoId) },
        ubicacionId: { in: configs.map(c => c.sucursalId) }
      }
    });

    // Crear mapa de stocks actuales para acceso rápido
    const stockMap = new Map();
    stocksActuales.forEach(stock => {
      const key = `${stock.productoId}-${stock.ubicacionId}`;
      stockMap.set(key, stock.cantidad);
    });

    // Calcular estadísticas por configuración
    const analisisStock = configs.map(config => {
      const key = `${config.productoId}-${config.sucursalId}`;
      const cantidadActual = stockMap.get(key) || 0;
      
      const diferencia = config.stockMaximo - cantidadActual;
      const porcentajeUso = config.stockMaximo > 0 ? (cantidadActual / config.stockMaximo) * 100 : 0;
      
      // Determinar estado
      let estado = 'normal';
      let prioridad = 0;
      
      if (cantidadActual <= config.stockMinimo) {
        estado = 'critico';
        prioridad = 4;
      } else if (cantidadActual <= config.puntoReposicion) {
        estado = 'bajo';
        prioridad = 3;
      } else if (cantidadActual > config.stockMaximo) {
        estado = 'exceso';
        prioridad = 2;
      } else {
        estado = 'normal';
        prioridad = 1;
      }

      return {
        id: config.id,
        producto: {
          id: config.producto.id,
          nombre: config.producto.nombre,
          codigoBarras: config.producto.codigoBarras
        },
        sucursal: {
          id: config.sucursal.id,
          nombre: config.sucursal.nombre,
          tipo: config.sucursal.tipo
        },
        configuracion: {
          stockMaximo: config.stockMaximo,
          stockMinimo: config.stockMinimo,
          puntoReposicion: config.puntoReposicion
        },
        stockActual: cantidadActual,
        diferencia,
        diferenciaPorcentual: config.stockMaximo > 0 ? Math.round((diferencia / config.stockMaximo) * 100) : 0,
        porcentajeUso: Math.round(porcentajeUso),
        estado,
        prioridad,
        acciones: {
          necesitaReposicion: cantidadActual <= config.puntoReposicion,
          puedeCargar: cantidadActual < config.stockMaximo,
          cantidadSugerida: Math.max(0, config.stockMaximo - cantidadActual),
          tieneExceso: cantidadActual > config.stockMaximo,
          excesoActual: Math.max(0, cantidadActual - config.stockMaximo)
        }
      };
    });

    // Estadísticas generales
    const estadisticas = {
      total: analisisStock.length,
      criticos: analisisStock.filter(a => a.estado === 'critico').length,
      bajos: analisisStock.filter(a => a.estado === 'bajo').length,
      normales: analisisStock.filter(a => a.estado === 'normal').length,
      excesos: analisisStock.filter(a => a.estado === 'exceso').length,
      necesitanReposicion: analisisStock.filter(a => a.acciones.necesitaReposicion).length,
      conExceso: analisisStock.filter(a => a.acciones.tieneExceso).length
    };

    // Resumen por sucursal
    const resumenSucursales = configs.reduce((acc, config) => {
      const analysis = analisisStock.find(a => a.sucursal.id === config.sucursalId);
      if (!analysis) return acc;

      if (!acc[config.sucursalId]) {
        acc[config.sucursalId] = {
          sucursal: analysis.sucursal,
          total: 0,
          criticos: 0,
          bajos: 0,
          normales: 0,
          excesos: 0
        };
      }

      acc[config.sucursalId].total++;
      acc[config.sucursalId][analysis.estado + 's']++;

      return acc;
    }, {} as Record<string, any>);

    // Top productos con mayor déficit
    const topDeficit = analisisStock
      .filter(a => a.diferencia > 0)
      .sort((a, b) => b.diferencia - a.diferencia)
      .slice(0, 10);

    // Top productos con mayor exceso
    const topExceso = analisisStock
      .filter(a => a.acciones.tieneExceso)
      .sort((a, b) => b.acciones.excesoActual - a.acciones.excesoActual)
      .slice(0, 10);

    return NextResponse.json({
      estadisticas,
      resumenSucursales: Object.values(resumenSucursales),
      analisisCompleto: analisisStock.sort((a, b) => b.prioridad - a.prioridad),
      topDeficit,
      topExceso,
      ultimaActualizacion: new Date()
    });

  } catch (error) {
    console.error('Error al generar dashboard de stock:', error);
    return NextResponse.json(
      { error: 'Error al generar dashboard de stock' },
      { status: 500 }
    );
  }
}