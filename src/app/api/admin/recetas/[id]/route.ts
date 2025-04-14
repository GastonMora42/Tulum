// src/app/api/admin/recetas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { z } from 'zod';

// Esquema de validación para actualizar receta
const updateRecetaSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }).optional(),
  descripcion: z.string().optional(),
  rendimiento: z.number().int().positive({ message: 'El rendimiento debe ser un número positivo' }).optional(),
  items: z.array(z.object({
    id: z.string().optional(), // ID existente para actualización
    insumoId: z.string({ required_error: 'El insumo es requerido' }),
    cantidad: z.number().positive({ message: 'La cantidad debe ser mayor a 0' })
  })).optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const receta = await prisma.receta.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            insumo: true
          }
        },
        productoRecetas: {
          include: {
            producto: true
          }
        }
      }
    });
    
    if (!receta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(receta);
  } catch (error: any) {
    console.error('Error al obtener receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener receta' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = updateRecetaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { nombre, descripcion, rendimiento, items } = validation.data;
    
    // Verificar si la receta existe
    const existingReceta = await prisma.receta.findUnique({
      where: { id: params.id },
      include: {
        items: true
      }
    });
    
    if (!existingReceta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }
    
    // Actualizar receta en una transacción
    const recetaActualizada = await prisma.$transaction(async (tx) => {
      // Actualizar datos básicos de la receta
      const receta = await tx.receta.update({
        where: { id: params.id },
        data: {
          ...(nombre && { nombre }),
          ...(descripcion !== undefined && { descripcion }),
          ...(rendimiento && { rendimiento })
        }
      });
      
      // Actualizar items si se proporcionaron
      if (items && items.length > 0) {
        // Eliminar items existentes
        await tx.recetaItem.deleteMany({
          where: { recetaId: params.id }
        });
        
        // Crear nuevos items
        for (const item of items) {
          await tx.recetaItem.create({
            data: {
              recetaId: params.id,
              insumoId: item.insumoId,
              cantidad: item.cantidad
            }
          });
        }
      }
      
      // Retornar la receta completa actualizada
      return tx.receta.findUnique({
        where: { id: params.id },
        include: {
          items: {
            include: {
              insumo: true
            }
          },
          productoRecetas: {
            include: {
              producto: true
            }
          }
        }
      });
    });
    
    return NextResponse.json(recetaActualizada);
  } catch (error: any) {
    console.error('Error al actualizar receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar receta' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
    // Verificar si la receta existe
    const existingReceta = await prisma.receta.findUnique({
      where: { id: params.id },
      include: {
        productoRecetas: true,
        items: true
      }
    });
    
    if (!existingReceta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si la receta está en uso por algún producto
    if (existingReceta.productoRecetas.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar la receta porque está asociada a uno o más productos' },
        { status: 400 }
      );
    }
    
    // Eliminar receta en una transacción
    await prisma.$transaction(async (tx) => {
      // Eliminar items de la receta
      await tx.recetaItem.deleteMany({
        where: { recetaId: params.id }
      });
      
      // Eliminar la receta
      await tx.receta.delete({
        where: { id: params.id }
      });
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar receta' },
      { status: 500 }
    );
  }
}