// src/app/api/pdv/ventas/filtrar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission(['venta:ver', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Filtros opcionales
    const sucursalId = searchParams.get('sucursalId');
    const desde = searchParams.get('desde') ? new Date(searchParams.get('desde')!) : undefined;
    const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta')!) : undefined;
    const facturada = searchParams.get('facturada') === 'true' ? true : 
                     searchParams.get('facturada') === 'false' ? false : undefined;
    const medioPago = searchParams.get('medioPago');
    const clienteNombre = searchParams.get('cliente');
    const searchTerm = searchParams.get('search');
    
    // Construir objeto de filtros
    const where: any = {};
    
    if (sucursalId) where.sucursalId = sucursalId;
    
    if (desde || hasta) {
      where.fecha = {};
      if (desde) where.fecha.gte = desde;
      if (hasta) where.fecha.lte = hasta;
    }
    
    if (facturada !== undefined) where.facturada = facturada;
    
    if (clienteNombre) {
      where.clienteNombre = {
        contains: clienteNombre,
        mode: 'insensitive'
      };
    }
    // src/app/api/pdv/ventas/filtrar/route.ts (continuación)
    // Búsqueda general (término de búsqueda)
    if (searchTerm) {
        where.OR = [
          {
            id: {
              contains: searchTerm,
            }
          },
          {
            clienteNombre: {
              contains: searchTerm,
              mode: 'insensitive'
            }
          },
          {
            numeroFactura: {
              contains: searchTerm,
            }
          },
          {
            items: {
              some: {
                producto: {
                  nombre: {
                    contains: searchTerm,
                    mode: 'insensitive'
                  }
                }
              }
            }
          }
        ];
      }
      
      // Filtrar por método de pago
      if (medioPago) {
        where.pagos = {
          some: {
            medioPago
          }
        };
      }
      
      // Paginación
      const page = parseInt(searchParams.get('page') || '1');
      const limit = parseInt(searchParams.get('limit') || '10');
      const skip = (page - 1) * limit;
      
      // Obtener conteo total para paginación
      const totalCount = await prisma.venta.count({ where });
      
      // Obtener ventas con filtros y paginación
      const ventas = await prisma.venta.findMany({
        where,
        include: {
          items: {
            include: {
              producto: true
            }
          },
          pagos: true,
          sucursal: true,
          usuario: {
            select: {
              id: true,
              name: true,
              email: true
            }
          },
          facturaElectronica: {
            select: {
              id: true,
              tipoComprobante: true,
              numeroFactura: true,
              cae: true
            }
          }
        },
        orderBy: {
          fecha: 'desc'
        },
        skip,
        take: limit
      });
      
      // Calcular stats
      const stats = await prisma.$transaction([
        // Suma total
        prisma.venta.aggregate({
          where,
          _sum: {
            total: true
          }
        }),
        // Suma facturadas
        prisma.venta.aggregate({
          where: {
            ...where,
            facturada: true
          },
          _sum: {
            total: true
          }
        }),
        // Conteo por método de pago
        prisma.$queryRaw`
          SELECT "medioPago", COUNT(*) as "count", SUM("monto") as "total"
          FROM "Pago"
          WHERE "ventaId" IN (
            SELECT "id" FROM "Venta" 
            WHERE ${where.sucursalId ? prisma.Prisma.sql`"sucursalId" = ${where.sucursalId}` : prisma.Prisma.sql`1=1`}
            ${where.fecha?.gte ? prisma.Prisma.sql`AND "fecha" >= ${where.fecha.gte}` : prisma.Prisma.sql``}
            ${where.fecha?.lte ? prisma.Prisma.sql`AND "fecha" <= ${where.fecha.lte}` : prisma.Prisma.sql``}
            ${where.facturada !== undefined ? prisma.Prisma.sql`AND "facturada" = ${where.facturada}` : prisma.Prisma.sql``}
          )
          GROUP BY "medioPago"
        `
      ]);
      
      return NextResponse.json({
        data: ventas,
        pagination: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit)
        },
        stats: {
          total: stats[0]._sum.total || 0,
          totalFacturado: stats[1]._sum.total || 0,
          mediosPago: stats[2]
        }
      });
    } catch (error: any) {
      console.error('Error al obtener ventas:', error);
      return NextResponse.json(
        { error: error.message || 'Error al obtener ventas' },
        { status: 500 }
      );
    }
  }