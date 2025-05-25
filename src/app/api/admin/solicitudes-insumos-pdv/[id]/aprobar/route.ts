// src/app/api/admin/solicitudes-insumos-pdv/[id]/aprobar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission('admin:aprobar')(req);
  if (permissionError) return permissionError;

  try {
    const user = (req as any).user;
    const body = await req.json();
    const { items, observaciones } = body;

    const solicitud = await prisma.$transaction(async tx => {
      // Actualizar solicitud
      const solicitudActualizada = await tx.solicitudInsumoPdv.update({
        where: { id: params.id },
        data: {
          estado: 'aprobada',
          fechaRespuesta: new Date(),
          respondioPor: user.id,
          observaciones: observaciones || undefined
        }
      });

      // Actualizar items con cantidades aprobadas
      for (const item of items) {
        await tx.itemSolicitudInsumoPdv.update({
          where: { id: item.id },
          data: {
            cantidadAprobada: item.cantidadAprobada,
            observaciones: item.observaciones
          }
        });
      }

      // Crear envío automáticamente
      const envio = await tx.envioInsumoPdv.create({
        data: {
          solicitudId: params.id,
          origenId: 'admin-warehouse-id', // ID del almacén principal
          destinoId: solicitudActualizada.sucursalId,
          estado: 'pendiente',
          usuarioEnvio: user.id
        }
      });

      // Crear items del envío
      for (const item of items) {
        if (item.cantidadAprobada > 0) {
          await tx.itemEnvioInsumoPdv.create({
            data: {
              envioId: envio.id,
              insumoPdvId: item.insumoPdvId,
              cantidad: item.cantidadAprobada
            }
          });
        }
      }

      return tx.solicitudInsumoPdv.findUnique({
        where: { id: params.id },
        include: {
          sucursal: true,
          usuario: true,
          items: {
            include: {
              insumoPdv: true
            }
          },
          envio: {
            include: {
              items: {
                include: {
                  insumoPdv: true
                }
              }
            }
          }
        }
      });
    });

    return NextResponse.json(solicitud);
  } catch (error) {
    console.error('Error al aprobar solicitud:', error);
    return NextResponse.json(
      { error: 'Error al aprobar solicitud' },
      { status: 500 }
    );
  }
}