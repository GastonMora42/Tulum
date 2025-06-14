// src/app/api/admin/stock-config/route.ts
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
    const productoId = searchParams.get('productoId');
    const includeStats = searchParams.get('includeStats') === 'true';

    const where: any = {};
    if (sucursalId) where.sucursalId = sucursalId;
    if (productoId) where.productoId = productoId;

    const configs = await prisma.stockConfigSucursal.findMany({
      where,
      include: {
        producto: true,
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      },
      orderBy: [
        { sucursal: { nombre: 'asc' } },
        { producto: { nombre: 'asc' } }
      ]
    });

    // Si se solicitan estadísticas, agregar stock actual
    if (includeStats) {
      const configsWithStats = await Promise.all(configs.map(async (config) => {
        const stockActual = await prisma.stock.findFirst({
          where: {
            productoId: config.productoId,
            ubicacionId: config.sucursalId
          }
        });

        const cantidadActual = stockActual?.cantidad || 0;
        const diferencia = config.stockMaximo - cantidadActual;
        const porcentajeUso = config.stockMaximo > 0 ? (cantidadActual / config.stockMaximo) * 100 : 0;
        
        const estado = cantidadActual <= config.stockMinimo ? 'critico' :
                      cantidadActual <= config.puntoReposicion ? 'bajo' :
                      cantidadActual >= config.stockMaximo ? 'exceso' : 'normal';

        return {
          ...config,
          stockActual: {
            cantidad: cantidadActual,
            diferencia,
            porcentajeUso: Math.round(porcentajeUso),
            estado,
            necesitaReposicion: cantidadActual <= config.puntoReposicion,
            tieneExceso: cantidadActual > config.stockMaximo
          }
        };
      }));

      return NextResponse.json(configsWithStats);
    }

    return NextResponse.json(configs);
  } catch (error) {
    console.error('Error al obtener configuraciones de stock:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones de stock' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permError = await checkPermission('admin')(req);
  if (permError) return permError;

  try {
    const body = await req.json();
    const user = (req as any).user;
    
    const { productoId, sucursalId, stockMaximo, stockMinimo, puntoReposicion } = body;

    // Validaciones
    if (!productoId || !sucursalId) {
      return NextResponse.json(
        { error: 'Producto y sucursal son requeridos' },
        { status: 400 }
      );
    }

    if (stockMaximo < 0 || stockMinimo < 0 || puntoReposicion < 0) {
      return NextResponse.json(
        { error: 'Los valores de stock no pueden ser negativos' },
        { status: 400 }
      );
    }

    if (stockMinimo > stockMaximo) {
      return NextResponse.json(
        { error: 'El stock mínimo no puede ser mayor al máximo' },
        { status: 400 }
      );
    }

    if (puntoReposicion > stockMaximo) {
      return NextResponse.json(
        { error: 'El punto de reposición no puede ser mayor al stock máximo' },
        { status: 400 }
      );
    }

    // Verificar que el producto y sucursal existen
    const [producto, sucursal] = await Promise.all([
      prisma.producto.findUnique({ where: { id: productoId } }),
      prisma.ubicacion.findUnique({ where: { id: sucursalId } })
    ]);

    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }

    // Crear o actualizar configuración
    const config = await prisma.stockConfigSucursal.upsert({
      where: {
        productoId_sucursalId: {
          productoId,
          sucursalId
        }
      },
      update: {
        stockMaximo,
        stockMinimo,
        puntoReposicion,
        updatedAt: new Date()
      },
      create: {
        productoId,
        sucursalId,
        stockMaximo,
        stockMinimo,
        puntoReposicion,
        creadoPor: user.id
      },
      include: {
        producto: true,
        sucursal: true,
        usuario: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Error al crear/actualizar configuración de stock:', error);
    return NextResponse.json(
      { error: 'Error al procesar configuración de stock' },
      { status: 500 }
    );
  }
}