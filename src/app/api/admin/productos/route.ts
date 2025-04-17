// src/app/api/admin/productos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear producto
const productoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  precio: z.number().positive({ message: 'El precio debe ser positivo' }),
  codigoBarras: z.string().optional(),
  imagen: z.string().optional(),
  categoriaId: z.string(),
  stockMinimo: z.number().int().nonnegative().optional().default(0),
  activo: z.boolean().optional().default(true)
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtrado
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoriaId = searchParams.get('categoriaId');
    const soloActivos = searchParams.get('soloActivos') === 'true';
    
    // Construir where para filtrado
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search } }
      ];
    }
    
    if (categoriaId) {
      where.categoriaId = categoriaId;
    }
    
    if (soloActivos) {
      where.activo = true;
    }
    
    // Contar total de productos
    const total = await prisma.producto.count({ where });
    
    // Obtener productos
    const productos = await prisma.producto.findMany({
      where,
      include: {
        categoria: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json({
      data: productos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('producto:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = productoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe un producto con el mismo código de barras
    if (validation.data.codigoBarras) {
      const existingProducto = await prisma.producto.findUnique({
        where: { codigoBarras: validation.data.codigoBarras }
      });
      
      if (existingProducto) {
        return NextResponse.json(
          { error: 'Ya existe un producto con este código de barras' },
          { status: 400 }
        );
      }
    }
    
    // Obtener usuario de la request
    const user = (req as any).user;
    console.log(`Usuario ${user.name} está creando un producto:`, validation.data.nombre);
    
    // Crear producto
    const producto = await prisma.producto.create({
      data: validation.data,
      include: {
        categoria: true
      }
    });
    
    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear producto' },
      { status: 500 }
    );
  }
}