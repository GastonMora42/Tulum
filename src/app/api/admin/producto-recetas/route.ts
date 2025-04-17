// src/app/api/admin/producto-recetas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación
const productoRecetaSchema = z.object({
  productoId: z.string({ required_error: 'El producto es requerido' }),
  recetaId: z.string({ required_error: 'La receta es requerida' })
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const productoId = searchParams.get('productoId');
    const recetaId = searchParams.get('recetaId');
    
    const where: any = {};
    
    if (productoId) {
      where.productoId = productoId;
    }
    
    if (recetaId) {
      where.recetaId = recetaId;
    }
    
    const asociaciones = await prisma.productoReceta.findMany({
      where,
      include: {
        producto: true,
        receta: true
      }
    });
    
    return NextResponse.json(asociaciones);
  } catch (error: any) {
    console.error('Error al obtener asociaciones:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener asociaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('productoReceta:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = productoRecetaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { productoId, recetaId } = validation.data;
    
    // Verificar si el producto existe
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });
    
    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar si la receta existe
    const receta = await prisma.receta.findUnique({
      where: { id: recetaId }
    });
    
    if (!receta) {
      return NextResponse.json(
        { error: 'Receta no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si ya existe esta asociación
    const existingAsociacion = await prisma.productoReceta.findFirst({
      where: {
        productoId,
        recetaId
      }
    });
    
    if (existingAsociacion) {
      return NextResponse.json(
        { error: 'Esta asociación ya existe' },
        { status: 400 }
      );
    }
    
    // Crear la asociación
    const productoReceta = await prisma.productoReceta.create({
      data: {
        productoId,
        recetaId
      },
      include: {
        producto: true,
        receta: true
      }
    });
    
    return NextResponse.json(productoReceta, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear asociación producto-receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear asociación producto-receta' },
      { status: 500 }
    );
  }
}