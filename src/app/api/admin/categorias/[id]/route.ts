// src/app/api/admin/categorias/[id]/route.ts - VERSIÓN CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para actualizar categoría
const updateCategoriaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  imagen: z.string().nullable().optional() // 🆕 Agregar campo imagen
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 🔧 Cambiar a Promise
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const resolvedParams = await params; // 🔧 Await params
    const categoria = await prisma.categoria.findUnique({
      where: { id: resolvedParams.id }
    });
    
    if (!categoria) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(categoria);
  } catch (error: any) {
    console.error('Error al obtener categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener categoría' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 🔧 Cambiar a Promise
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('categoria:editar')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params; // 🔧 Await params
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = updateCategoriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si la categoría existe
    const existingCategoria = await prisma.categoria.findUnique({
      where: { id: resolvedParams.id }
    });
    
    if (!existingCategoria) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si existe otra categoría con el mismo nombre
    if (validation.data.nombre !== existingCategoria.nombre) {
      const categoriaConMismoNombre = await prisma.categoria.findUnique({
        where: { nombre: validation.data.nombre }
      });
      
      if (categoriaConMismoNombre) {
        return NextResponse.json(
          { error: 'Ya existe otra categoría con este nombre' },
          { status: 400 }
        );
      }
    }
    
    // Actualizar categoría con imagen
    const categoria = await prisma.categoria.update({
      where: { id: resolvedParams.id },
      data: {
        nombre: validation.data.nombre,
        imagen: validation.data.imagen
      }
    });
    
    return NextResponse.json(categoria);
  } catch (error: any) {
    console.error('Error al actualizar categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar categoría' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // 🔧 Cambiar a Promise
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('categoria:eliminar')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params; // 🔧 Await params
    
    // Verificar si la categoría existe
    const existingCategoria = await prisma.categoria.findUnique({
      where: { id: resolvedParams.id }
    });
    
    if (!existingCategoria) {
      return NextResponse.json(
        { error: 'Categoría no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si hay productos asociados a esta categoría
    const productosAsociados = await prisma.producto.count({
      where: { categoriaId: resolvedParams.id }
    });
    
    if (productosAsociados > 0) {
      return NextResponse.json(
        { error: `No se puede eliminar la categoría porque tiene ${productosAsociados} productos asociados` },
        { status: 400 }
      );
    }
    
    // Eliminar categoría
    await prisma.categoria.delete({
      where: { id: resolvedParams.id }
    });
    
    return NextResponse.json({ message: 'Categoría eliminada correctamente' });
  } catch (error: any) {
    console.error('Error al eliminar categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar categoría' },
      { status: 500 }
    );
  }
}