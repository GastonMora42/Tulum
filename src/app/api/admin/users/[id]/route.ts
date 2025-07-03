// src/app/api/admin/users/[id]/route.ts - CORREGIDO PARA NEXT.JS 15
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { z } from 'zod';

// Esquema de validación para actualizar
const updateUserSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }).optional(),
  roleId: z.string().optional(),
  sucursalId: z.string().optional().nullable()
});

// ✅ CORREGIDO: await params en Next.js 15
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ AWAIT params antes de acceder a propiedades
    const { id } = await params;
    
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        sucursal: true
      }
    });
    
    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(user);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}

// ✅ CORREGIDO: await params en PATCH también
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // ✅ AWAIT params antes de acceder a propiedades
    const { id } = await params;
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = updateUserSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { name, roleId, sucursalId } = validation.data;
    
    // Verificar si el usuario existe
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });
    
    if (!existingUser) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }
    
    // Actualizar usuario
    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(roleId && { roleId }),
        sucursalId: sucursalId
      },
      include: {
        role: true,
        sucursal: true
      }
    });
    
    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return NextResponse.json(
      { error: 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}