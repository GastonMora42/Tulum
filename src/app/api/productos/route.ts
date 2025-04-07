// src/app/api/productos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtrado
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const categoriaId = searchParams.get('categoriaId');
    
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
  const authResponse = await authMiddleware(req);
  if (authResponse) {
    return authResponse;
  }
  
  // Verificar permiso
  const permissionResponse = await checkPermission('producto:crear')(req);
  if (permissionResponse) {
    return permissionResponse;
  }
  
  try {
    const body = await req.json();
    
    // Crear producto
    const producto = await prisma.producto.create({
      data: {
        nombre: body.nombre,
        descripcion: body.descripcion,
        precio: body.precio,
        codigoBarras: body.codigoBarras,
        imagen: body.imagen,
        categoriaId: body.categoriaId,
        stockMinimo: body.stockMinimo || 0,
        activo: true
      },
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