// src/app/api/admin/insumos-pdv/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { z } from 'zod';

const updateInsumoPdvSchema = z.object({
  nombre: z.string().min(3).optional(),
  descripcion: z.string().optional(),
  unidadMedida: z.string().min(1).optional(),
  stockMinimo: z.number().nonnegative().optional(),
  activo: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const insumo = await prisma.insumoPdv.findUnique({
      where: { id: params.id }
    });

    if (!insumo) {
      return NextResponse.json(
        { error: 'Insumo no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json(insumo);
  } catch (error) {
    console.error('Error al obtener insumo:', error);
    return NextResponse.json(
      { error: 'Error al obtener insumo' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission('admin:editar')(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const validation = updateInsumoPdvSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const insumo = await prisma.insumoPdv.update({
      where: { id: params.id },
      data: validation.data
    });

    return NextResponse.json(insumo);
  } catch (error) {
    console.error('Error al actualizar insumo:', error);
    return NextResponse.json(
      { error: 'Error al actualizar insumo' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission('admin:eliminar')(req);
  if (permissionError) return permissionError;

  try {
    // En lugar de eliminar, desactivar
    await prisma.insumoPdv.update({
      where: { id: params.id },
      data: { activo: false }
    });

    return NextResponse.json({ message: 'Insumo desactivado correctamente' });
  } catch (error) {
    console.error('Error al desactivar insumo:', error);
    return NextResponse.json(
      { error: 'Error al desactivar insumo' },
      { status: 500 }
    );
  }
}