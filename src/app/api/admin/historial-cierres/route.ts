// src/app/api/admin/historial-cierres/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

// GET - Obtener historial de cierres con filtros y paginación
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['admin'])(req);
  if (permError) return permError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Filtros
    const sucursalId = searchParams.get('sucursalId');
    const estado = searchParams.get('estado');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const usuarioId = searchParams.get('usuarioId');
    
    // Paginación
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skip = (page - 1) * limit;
    
    // Construir filtros
    const where: any = {
      fechaCierre: { not: null } // Solo cierres completados
    };
    
    if (sucursalId) where.sucursalId = sucursalId;
    if (estado) where.estado = estado;
    if (usuarioId) where.usuarioCierre = usuarioId;
    
    if (fechaDesde || fechaHasta) {
      where.fechaCierre = {};
      if (fechaDesde) where.fechaCierre.gte = new Date(fechaDesde);
      if (fechaHasta) {
        const fechaFin = new Date(fechaHasta);
        fechaFin.setHours(23, 59, 59, 999);
        where.fechaCierre.lte = fechaFin;
      }
    }
    
    // Obtener total para paginación
    const total = await prisma.cierreCaja.count({ where });
    
    // Obtener cierres
    const cierres = await prisma.cierreCaja.findMany({
      where,
      include: {
        egresos: {
          include: {
            usuario: { select: { name: true } }
          }
        },
        recuperosAplicados: {
          include: {
            cierreCajaOrigen: {
              select: { 
                fechaApertura: true,
                fechaCierre: true,
                montoInicial: true 
              }
            }
          }
        },
        recuperosGenerados: {
          include: {
            cierreCaja: {
              select: { 
                fechaApertura: true,
                fechaCierre: true 
              }
            }
          }
        }
      },
      orderBy: { fechaCierre: 'desc' },
      skip,
      take: limit
    });
    
    // Obtener información adicional de usuarios y sucursales
    const cierresConInfo = await Promise.all(
      cierres.map(async (cierre) => {
        // Obtener info de usuarios
        const [usuarioApertura, usuarioCierre, sucursal] = await Promise.all([
          prisma.user.findUnique({
            where: { id: cierre.usuarioApertura },
            select: { name: true, email: true }
          }),
          cierre.usuarioCierre ? prisma.user.findUnique({
            where: { id: cierre.usuarioCierre },
            select: { name: true, email: true }
          }) : null,
          prisma.ubicacion.findUnique({
            where: { id: cierre.sucursalId },
            select: { nombre: true }
          })
        ]);
        
        // Obtener ventas del turno
        const ventas = await prisma.venta.findMany({
          where: {
            sucursalId: cierre.sucursalId,
            fecha: {
              gte: cierre.fechaApertura,
              lte: cierre.fechaCierre || new Date()
            }
          },
          include: { pagos: true }
        });
        
        // Calcular estadísticas del turno
        const totalVentas = ventas.reduce((sum, v) => sum + v.total, 0);
        const ventasEfectivo = ventas.reduce((sum, v) => 
          sum + v.pagos.filter(p => p.medioPago === 'efectivo').reduce((s, p) => s + p.monto, 0), 0
        );
        
        return {
          ...cierre,
          usuarioApertura,
          usuarioCierre,
          sucursal,
          estadisticas: {
            totalVentas,
            ventasEfectivo,
            cantidadVentas: ventas.length,
            totalEgresos: cierre.egresos.reduce((sum, e) => sum + e.monto, 0),
            duracionTurno: cierre.fechaCierre 
              ? Math.round((cierre.fechaCierre.getTime() - cierre.fechaApertura.getTime()) / (1000 * 60 * 60)) 
              : null
          }
        };
      })
    );
    
    // Calcular estadísticas generales
    const estadisticasGenerales = await prisma.cierreCaja.aggregate({
      where,
      _sum: {
        montoInicial: true,
        montoFinal: true,
        diferencia: true,
        totalEgresos: true,
        recuperoFondo: true
      },
      _avg: {
        montoInicial: true,
        montoFinal: true,
        diferencia: true
      },
      _count: true
    });
    
    return NextResponse.json({
      data: cierresConInfo,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      estadisticas: {
        totalCierres: estadisticasGenerales._count,
        promedioMontoInicial: estadisticasGenerales._avg.montoInicial || 0,
        promedioMontoFinal: estadisticasGenerales._avg.montoFinal || 0,
        promedioDiferencia: estadisticasGenerales._avg.diferencia || 0,
        totalEgresos: estadisticasGenerales._sum.totalEgresos || 0,
        totalRecuperos: estadisticasGenerales._sum.recuperoFondo || 0
      }
    });
  } catch (error: any) {
    console.error('Error al obtener historial de cierres:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener historial' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar cierres en lote
export async function DELETE(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { cierreIds } = body;
    
    if (!Array.isArray(cierreIds) || cierreIds.length === 0) {
      return NextResponse.json(
        { error: 'Se requiere un array de IDs de cierres' },
        { status: 400 }
      );
    }
    
    // Verificar que todos los cierres existen y están cerrados
    const cierres = await prisma.cierreCaja.findMany({
      where: {
        id: { in: cierreIds },
        fechaCierre: { not: null } // Solo cierres completados
      }
    });
    
    if (cierres.length !== cierreIds.length) {
      return NextResponse.json(
        { error: 'Algunos cierres no existen o no están completados' },
        { status: 400 }
      );
    }
    
    // Verificar que no hay cierres muy recientes (últimas 24 horas)
    const hace24Horas = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const cierresRecientes = cierres.filter(c => 
      c.fechaCierre && c.fechaCierre > hace24Horas
    );
    
    if (cierresRecientes.length > 0) {
      return NextResponse.json(
        { 
          error: 'No se pueden eliminar cierres de las últimas 24 horas',
          cierresRecientes: cierresRecientes.length
        },
        { status: 400 }
      );
    }
    
    // Eliminar en transacción
    const resultado = await prisma.$transaction(async (tx) => {
      // Eliminar egresos relacionados
      await tx.cajaEgreso.deleteMany({
        where: { cierreCajaId: { in: cierreIds } }
      });
      
      // Eliminar recuperos relacionados
      await tx.recuperoFondo.deleteMany({
        where: { 
          OR: [
            { cierreCajaId: { in: cierreIds } },
            { cierreCajaOrigenId: { in: cierreIds } }
          ]
        }
      });
      
      // Eliminar cierres
      const eliminados = await tx.cierreCaja.deleteMany({
        where: { id: { in: cierreIds } }
      });
      
      return eliminados;
    });
    
    return NextResponse.json({
      success: true,
      message: `Se eliminaron ${resultado.count} cierres correctamente`,
      eliminados: resultado.count
    });
  } catch (error: any) {
    console.error('Error al eliminar cierres:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar cierres' },
      { status: 500 }
    );
  }
}