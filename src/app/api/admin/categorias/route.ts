// src/app/api/admin/categorias/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear/actualizar categoría
const categoriaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const categorias = await prisma.categoria.findMany({
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json(categorias);
  } catch (error: any) {
    console.error('Error al obtener categorías:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('categoria:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = categoriaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe una categoría con el mismo nombre
    const existingCategoria = await prisma.categoria.findUnique({
      where: { nombre: validation.data.nombre }
    });
    
    if (existingCategoria) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con este nombre' },
        { status: 400 }
      );
    }
    
    // Crear categoría
    const categoria = await prisma.categoria.create({
      data: validation.data
    });
    
    return NextResponse.json(categoria, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear categoría' },
      { status: 500 }
    );
  }
}