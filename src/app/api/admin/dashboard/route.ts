// src/app/api/admin/dashboard/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const periodo = searchParams.get('periodo') || 'hoy';
    const sucursalId = searchParams.get('sucursal');
    
    const ahora = new Date();
    const hoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const ayer = new Date(hoy.getTime() - 24 * 60 * 60 * 1000);
    
    // Calcular fechas según período
    let fechaInicio: Date;
    let fechaFin: Date = ahora;
    
    switch (periodo) {
      case 'semana':
        fechaInicio = new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'mes':
        fechaInicio = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
        break;
      default: // hoy
        fechaInicio = hoy;
    }

    // Ventas de hoy
    const ventasHoy = await prisma.venta.aggregate({
      where: {
        fecha: {
          gte: hoy,
          lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
        },
        ...(sucursalId && sucursalId !== 'todas' ? { sucursalId } : {})
      },
      _sum: { total: true }
    });

    // Ventas de ayer
    const ventasAyer = await prisma.venta.aggregate({
      where: {
        fecha: {
          gte: ayer,
          lt: hoy
        },
        ...(sucursalId && sucursalId !== 'todas' ? { sucursalId } : {})
      },
      _sum: { total: true }
    });

    // Ventas del mes actual
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
    const ventasMesActual = await prisma.venta.aggregate({
      where: {
        fecha: {
          gte: inicioMes,
          lt: ahora
        },
        ...(sucursalId && sucursalId !== 'todas' ? { sucursalId } : {})
      },
      _sum: { total: true }
    });

    // Ventas del mes anterior
    const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);
    const ventasMesAnterior = await prisma.venta.aggregate({
      where: {
        fecha: {
          gte: inicioMesAnterior,
          lt: finMesAnterior
        },
        ...(sucursalId && sucursalId !== 'todas' ? { sucursalId } : {})
      },
      _sum: { total: true }
    });

    // Productos con stock bajo
    const productosStock = await prisma.stock.findMany({
      where: {
        producto: {
          isNot: null
        }
      },
      include: {
        producto: true
      }
    });

    // Contingencias pendientes
    const contingenciasPendientes = await prisma.contingencia.count({
      where: {
        estado: 'pendiente'
      }
    });

    // Usuarios activos (login en últimos 7 días)
    const usuariosActivos = await prisma.user.count({
      where: {
        updatedAt: {
          gte: new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000)
        }
      }
    });

    // Métricas por sucursal
    const sucursales = await prisma.ubicacion.findMany({
      where: {
        tipo: 'sucursal',
        activo: true
      },
      include: {
        _count: {
          select: {
            stocks: {
              where: {
                cantidad: {
                  lte: 5 // Stock bajo arbitrario
                }
              }
            }
          }
        }
      }
    });

    const sucursalesMetrics = await Promise.all(
      sucursales.map(async (sucursal) => {
        // Ventas de hoy para esta sucursal
        const ventasHoySucursal = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: hoy,
              lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
            }
          },
          _sum: { total: true }
        });

        // Ventas de ayer para esta sucursal
        const ventasAyerSucursal = await prisma.venta.aggregate({
          where: {
            sucursalId: sucursal.id,
            fecha: {
              gte: ayer,
              lt: hoy
            }
          },
          _sum: { total: true }
        });

        // Última venta
        const ultimaVenta = await prisma.venta.findFirst({
          where: { sucursalId: sucursal.id },
          orderBy: { fecha: 'desc' },
          select: { fecha: true }
        });

        // Contingencias de esta sucursal
        const contingencias = await prisma.contingencia.count({
          where: {
            ubicacionId: sucursal.id,
            estado: 'pendiente'
          }
        });

        const ventasHoyNum = ventasHoySucursal._sum.total || 0;
        const ventasAyerNum = ventasAyerSucursal._sum.total || 0;
        const variacion = ventasAyerNum > 0 ? ((ventasHoyNum - ventasAyerNum) / ventasAyerNum) * 100 : 0;
        
        // Meta mensual ficticia - en producción vendría de configuración
        const metaMensual = 200000;
        const progresoMeta = (ventasHoyNum / metaMensual) * 100 * 30; // Estimación mensual

        let estado: 'excelente' | 'bien' | 'atencion' | 'critico';
        if (progresoMeta >= 90) estado = 'excelente';
        else if (progresoMeta >= 70) estado = 'bien';
        else if (progresoMeta >= 50) estado = 'atencion';
        else estado = 'critico';

        return {
          id: sucursal.id,
          nombre: sucursal.nombre,
          tipo: sucursal.tipo,
          ventasHoy: ventasHoyNum,
          ventasAyer: ventasAyerNum,
          variacion,
          metaMensual,
          progresoMeta,
          stockBajo: sucursal._count.stocks,
          contingencias,
          ultimaVenta: ultimaVenta?.fecha.toISOString() || new Date().toISOString(),
          estado
        };
      })
    );

    // Top productos
    const topProductos = await prisma.itemVenta.groupBy({
      by: ['productoId'],
      where: {
        venta: {
          fecha: {
            gte: hoy,
            lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      },
      _sum: {
        cantidad: true
      },
      _count: true,
      orderBy: {
        _sum: {
          cantidad: 'desc'
        }
      },
      take: 5
    });

    const topProductosDetalle = await Promise.all(
      topProductos.map(async (item) => {
        const producto = await prisma.producto.findUnique({
          where: { id: item.productoId },
          select: { nombre: true }
        });

        // Calcular ingresos
        const ingresos = await prisma.itemVenta.aggregate({
          where: {
            productoId: item.productoId,
            venta: {
              fecha: {
                gte: hoy,
                lt: new Date(hoy.getTime() + 24 * 60 * 60 * 1000)
              }
            }
          },
          _sum: {
            precioUnitario: true
          }
        });

        return {
          id: item.productoId,
          nombre: producto?.nombre || 'Producto desconocido',
          ventasHoy: item._sum.cantidad || 0,
          ingresos: (ingresos._sum.precioUnitario || 0) * (item._sum.cantidad || 0),
          variacion: Math.random() * 20 - 10 // Placeholder - calcular real
        };
      })
    );

    // Alertas del sistema
    const alertas = [
      {
        id: '1',
        tipo: 'stock' as const,
        titulo: 'Stock bajo detectado',
        descripcion: `${productosStock.length} productos con stock bajo`,
        urgencia: productosStock.length > 5 ? 'alta' as const : 'media' as const,
        timestamp: new Date().toISOString()
      },
      {
        id: '2',
        tipo: 'contingencia' as const,
        titulo: 'Contingencias pendientes',
        descripcion: `${contingenciasPendientes} contingencias requieren atención`,
        urgencia: contingenciasPendientes > 3 ? 'alta' as const : 'baja' as const,
        timestamp: new Date().toISOString()
      }
    ];

    const dashboardData = {
      totalVentas: ventasHoy._sum.total || 0,
      ventasHoy: ventasHoy._sum.total || 0,
      ventasAyer: ventasAyer._sum.total || 0,
      ventasMesActual: ventasMesActual._sum.total || 0,
      ventasMesAnterior: ventasMesAnterior._sum.total || 0,
      totalProductos: await prisma.producto.count(),
      productosAgotandose: productosStock.length,
      contingenciasPendientes,
      usuariosActivos,
      sucursales: sucursalesMetrics,
      topProductos: topProductosDetalle,
      alertas
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error('Error en dashboard:', error);
    return NextResponse.json(
      { error: 'Error al cargar dashboard' },
      { status: 500 }
    );
  }
}