// src/app/api/admin/stock-config/dashboard/route.ts - VERSIÓN FINAL CORREGIDA
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

    console.log(`[Dashboard API] 🚀 Generando dashboard para sucursal: ${sucursalId || 'todas'}`);

    // ✅ PASO 1: Obtener configuraciones explícitas CON categorías
    const configs = await prisma.stockConfigSucursal.findMany({
      where: {
        activo: true,
        ...(sucursalId ? { sucursalId } : {})
      },
      include: {
        producto: {
          include: {
            categoria: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        sucursal: {
          select: {
            id: true,
            nombre: true,
            tipo: true
          }
        }
      }
    });

    console.log(`[Dashboard API] ✅ Configuraciones encontradas: ${configs.length}`);

    // ✅ PASO 2: Obtener stocks actuales para configuraciones existentes
    const stocksActuales = await prisma.stock.findMany({
      where: {
        productoId: { in: configs.map(c => c.productoId) },
        ubicacionId: { in: configs.map(c => c.sucursalId) }
      }
    });

    // Crear mapa de stocks para acceso rápido
    const stockMap = new Map();
    stocksActuales.forEach(stock => {
      const key = `${stock.productoId}-${stock.ubicacionId}`;
      stockMap.set(key, stock.cantidad);
    });

    // ✅ PASO 3: Calcular análisis para productos CON configuración
    const analisisConConfig = configs.map(config => {
      const key = `${config.productoId}-${config.sucursalId}`;
      const cantidadActual = stockMap.get(key) || 0;
      
      const diferencia = config.stockMaximo - cantidadActual;
      const porcentajeUso = config.stockMaximo > 0 ? (cantidadActual / config.stockMaximo) * 100 : 0;
      
      // Determinar estado
      let estado = 'normal';
      let prioridad = 1;
      
      if (cantidadActual <= config.stockMinimo) {
        estado = 'critico';
        prioridad = 4;
      } else if (cantidadActual <= config.puntoReposicion) {
        estado = 'bajo';
        prioridad = 3;
      } else if (cantidadActual > config.stockMaximo) {
        estado = 'exceso';
        prioridad = 2;
      }

      return {
        id: config.id,
        producto: {
          id: config.producto.id,
          nombre: config.producto.nombre,
          codigoBarras: config.producto.codigoBarras,
          categoriaId: config.producto.categoriaId,
          categoria: config.producto.categoria // ✅ GARANTIZAR que siempre existe
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
        tieneConfiguracion: true,
        acciones: {
          necesitaReposicion: cantidadActual <= config.puntoReposicion,
          puedeCargar: cantidadActual < config.stockMaximo,
          cantidadSugerida: Math.max(0, config.stockMaximo - cantidadActual),
          tieneExceso: cantidadActual > config.stockMaximo,
          excesoActual: Math.max(0, cantidadActual - config.stockMaximo)
        }
      };
    });

    // ✅ PASO 4: Obtener productos con stock SIN configuración
    const stocksSinConfig = await prisma.stock.findMany({
      where: {
        ...(sucursalId ? { ubicacionId: sucursalId } : {}),
        productoId: { not: null },
        cantidad: { gt: 0 },
        // Excluir productos que ya tienen configuración
        NOT: {
          productoId: {
            in: configs.map(c => c.productoId)
          }
        }
      },
      include: {
        producto: {
          include: {
            categoria: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        ubicacion: {
          select: {
            id: true,
            nombre: true,
            tipo: true
          }
        }
      }
    });

    console.log(`[Dashboard API] ✅ Productos sin configuración: ${stocksSinConfig.length}`);

    // ✅ PASO 5: Analizar productos SIN configuración
    const analisisSinConfig = stocksSinConfig
      .filter(stock => stock.producto) // Filtrar productos válidos
      .map((stock) => {
        const producto = stock.producto!;
        const stockActual = stock.cantidad;
        
        // Valores por defecto inteligentes
        const stockMinimo = Math.max(producto.stockMinimo || 1, 1);
        const stockMaximo = Math.max(stockActual * 3, stockMinimo * 5, 10);
        const puntoReposicion = Math.ceil(stockMinimo * 1.5);
        
        const configuracionPorDefecto = {
          stockMaximo,
          stockMinimo,
          puntoReposicion
        };
        
        // Calcular estado con configuración por defecto
        const diferencia = stockMaximo - stockActual;
        const porcentajeUso = stockMaximo > 0 ? (stockActual / stockMaximo) * 100 : 0;
        
        let estado = 'normal';
        let prioridad = 1;
        
        if (stockActual <= stockMinimo) {
          estado = 'critico';
          prioridad = 4;
        } else if (stockActual <= puntoReposicion) {
          estado = 'bajo';
          prioridad = 3;
        } else if (stockActual > stockMaximo) {
          estado = 'exceso';
          prioridad = 2;
        }

        return {
          id: `sin-config-${stock.id}`,
          producto: {
            id: producto.id,
            nombre: producto.nombre,
            codigoBarras: producto.codigoBarras,
            categoriaId: producto.categoriaId,
            categoria: producto.categoria // ✅ INCLUIR categoría (puede ser null)
          },
          sucursal: {
            id: stock.ubicacion.id,
            nombre: stock.ubicacion.nombre,
            tipo: stock.ubicacion.tipo
          },
          configuracion: configuracionPorDefecto,
          stockActual,
          diferencia,
          diferenciaPorcentual: stockMaximo > 0 ? Math.round((diferencia / stockMaximo) * 100) : 0,
          porcentajeUso: Math.round(porcentajeUso),
          estado,
          prioridad,
          tieneConfiguracion: false,
          requiereConfiguracion: true,
          acciones: {
            necesitaReposicion: stockActual <= puntoReposicion,
            puedeCargar: stockActual < stockMaximo,
            cantidadSugerida: Math.max(0, stockMaximo - stockActual),
            tieneExceso: stockActual > stockMaximo,
            excesoActual: Math.max(0, stockActual - stockMaximo)
          }
        };
      });

    // ✅ PASO 6: COMBINAR Y ORDENAR ALFABÉTICAMENTE
    const analisisCompleto = [...analisisConConfig, ...analisisSinConfig]
      .sort((a, b) => {
        // Ordenamiento alfabético mejorado A-Z
        return a.producto.nombre.localeCompare(b.producto.nombre, 'es', {
          sensitivity: 'base',
          numeric: true,
          caseFirst: 'lower'
        });
      });

    console.log(`[Dashboard API] ✅ Análisis completo: ${analisisCompleto.length} productos (${analisisConConfig.length} con config + ${analisisSinConfig.length} sin config) - Ordenados A-Z`);

    // ✅ PASO 7: Calcular estadísticas
    const estadisticas = {
      total: analisisCompleto.length,
      conConfiguracion: analisisConConfig.length,
      sinConfiguracion: analisisSinConfig.length,
      criticos: analisisCompleto.filter(a => a.estado === 'critico').length,
      bajos: analisisCompleto.filter(a => a.estado === 'bajo').length,
      normales: analisisCompleto.filter(a => a.estado === 'normal').length,
      excesos: analisisCompleto.filter(a => a.estado === 'exceso').length,
      necesitanReposicion: analisisCompleto.filter(a => a.acciones.necesitaReposicion).length,
      conExceso: analisisCompleto.filter(a => a.acciones.tieneExceso).length
    };

    // ✅ PASO 8: Resumen por sucursal
    const resumenSucursales = analisisCompleto.reduce((acc, item) => {
      const sucursalId = item.sucursal.id;
      
      if (!acc[sucursalId]) {
        acc[sucursalId] = {
          sucursal: item.sucursal,
          total: 0,
          criticos: 0,
          bajos: 0,
          normales: 0,
          excesos: 0,
          conConfiguracion: 0,
          sinConfiguracion: 0
        };
      }

      acc[sucursalId].total++;
      acc[sucursalId][item.estado + 's']++;
      
      if (item.tieneConfiguracion) {
        acc[sucursalId].conConfiguracion++;
      } else {
        acc[sucursalId].sinConfiguracion++;
      }

      return acc;
    }, {} as Record<string, any>);

    // ✅ PASO 9: Top productos (mantener orden después de análisis)
    const topDeficit = analisisCompleto
      .filter(a => a.diferencia > 0)
      .sort((a, b) => {
        const deficitDiff = b.diferencia - a.diferencia;
        return deficitDiff !== 0 ? deficitDiff : a.producto.nombre.localeCompare(b.producto.nombre, 'es');
      })
      .slice(0, 10);
      
    const topExceso = analisisCompleto
      .filter(a => a.acciones.tieneExceso)
      .sort((a, b) => {
        const excesoDiff = b.acciones.excesoActual - a.acciones.excesoActual;
        return excesoDiff !== 0 ? excesoDiff : a.producto.nombre.localeCompare(b.producto.nombre, 'es');
      })
      .slice(0, 10);

    // ✅ RESPUESTA FINAL
    const response = {
      estadisticas,
      resumenSucursales: Object.values(resumenSucursales),
      analisisCompleto,
      topDeficit,
      topExceso,
      ultimaActualizacion: new Date()
    };

    console.log(`[Dashboard API] 🏁 Dashboard generado exitosamente:`, {
      totalProductos: estadisticas.total,
      conCategoria: analisisCompleto.filter(a => a.producto.categoria).length,
      sinCategoria: analisisCompleto.filter(a => !a.producto.categoria).length,
      categorias: [...new Set(analisisCompleto.map(a => a.producto.categoria?.nombre).filter(Boolean))].slice(0, 5)
    });

    return NextResponse.json(response);

  } catch (error) {
    console.error('[Dashboard API] ❌ Error al generar dashboard:', error);
    return NextResponse.json(
      { error: 'Error al generar dashboard de stock' },
      { status: 500 }
    );
  }
}