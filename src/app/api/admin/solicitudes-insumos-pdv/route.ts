// src/app/api/admin/solicitudes-insumos-pdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const estado = searchParams.get('estado');
    const sucursalId = searchParams.get('sucursalId');

    const where: any = {};
    
    if (estado) {
      where.estado = estado;
    }
    
    if (sucursalId) {
      where.sucursalId = sucursalId;
    }

    const solicitudes = await prisma.solicitudInsumoPdv.findMany({
      where,
      include: {
        sucursal: true,
        usuario: true,
        items: {
          include: {
            insumoPdv: true
          }
        }
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    return NextResponse.json(solicitudes);
  } catch (error) {
    console.error('Error al obtener solicitudes:', error);
    return NextResponse.json(
      { error: 'Error al obtener solicitudes' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const user = (req as any).user;
    const body = await req.json();
    const { sucursalId, items, observaciones } = body;

    if (!items || items.length === 0) {
      return NextResponse.json(
        { error: 'Debe incluir al menos un insumo' },
        { status: 400 }
      );
    }

    const solicitud = await prisma.$transaction(async tx => {
      // Crear solicitud
      const nuevaSolicitud = await tx.solicitudInsumoPdv.create({
        data: {
          sucursalId,
          usuarioId: user.id,
          estado: 'pendiente',
          observaciones
        }
      });

      // Crear items
      for (const item of items) {
        await tx.itemSolicitudInsumoPdv.create({
          data: {
            solicitudId: nuevaSolicitud.id,
            insumoPdvId: item.insumoPdvId,
            cantidadSolicitada: item.cantidad,
            observaciones: item.observaciones
          }
        });
      }

      return tx.solicitudInsumoPdv.findUnique({
        where: { id: nuevaSolicitud.id },
        include: {
          sucursal: true,
          usuario: true,
          items: {
            include: {
              insumoPdv: true
            }
          }
        }
      });
    });

    return NextResponse.json(solicitud, { status: 201 });
  } catch (error) {
    console.error('Error al crear solicitud:', error);
    return NextResponse.json(
      { error: 'Error al crear solicitud' },
      { status: 500 }
    );
  }
}