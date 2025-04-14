// src/app/api/admin/insumos/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para actualizar insumo
const updateInsumoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }).optional(),
  descripcion: z.string().optional().nullable(),
  unidadMedida: z.string().min(1, { message: 'La unidad de medida es requerida' }).optional(),
  stockMinimo: z.number().nonnegative().optional(),
  proveedorId: z.string().optional().nullable(),
  activo: z.boolean().optional()
});

// GET - Obtener un insumo por ID
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const insumo = await prisma.insumo.findUnique({
      where: { id: params.id },
      include: {
        proveedor: true
      }
    });
    
    if (!insumo) {
      return NextResponse.json(
        { error: 'Insumo no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(insumo);
  } catch (error: any) {
    console.error('Error al obtener insumo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener insumo' },
      { status: 500 }
    );
  }
}

// PATCH - Actualizar insumo
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission('insumo:editar')(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = updateInsumoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si el insumo existe
    const existingInsumo = await prisma.insumo.findUnique({
      where: { id: params.id }
    });
    
    if (!existingInsumo) {
      return NextResponse.json(
        { error: 'Insumo no encontrado' },
        { status: 404 }
      );
    }
    
    // Actualizar insumo
    const insumo = await prisma.insumo.update({
      where: { id: params.id },
      data: validation.data,
      include: {
        proveedor: true
      }
    });
    
    return NextResponse.json(insumo);
  } catch (error: any) {
    console.error('Error al actualizar insumo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar insumo' },
      { status: 500 }
    );
  }
}

// DELETE - Desactivar insumo (no eliminación física)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission('insumo:eliminar')(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    // Verificar si el insumo existe
    const existingInsumo = await prisma.insumo.findUnique({
      where: { id: params.id }
    });
    
    if (!existingInsumo) {
      return NextResponse.json(
        { error: 'Insumo no encontrado' },
        { status: 404 }
      );
    }
    
    // Desactivar insumo (no eliminar físicamente)
    const insumo = await prisma.insumo.update({
      where: { id: params.id },
      data: { activo: false }
    });
    
    return NextResponse.json({ message: 'Insumo desactivado correctamente' });
  } catch (error: any) {
    console.error('Error al desactivar insumo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al desactivar insumo' },
      { status: 500 }
    );
  }
}