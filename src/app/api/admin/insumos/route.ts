// src/app/api/admin/insumos/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear/actualizar insumo
const insumoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  unidadMedida: z.string().min(1, { message: 'La unidad de medida es requerida' }),
  stockMinimo: z.number().nonnegative(),
  proveedorId: z.string().optional().nullable(),
  activo: z.boolean().default(true)
});

// GET - Listar insumos
export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;

  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de paginación y filtrado
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const proveedorId = searchParams.get('proveedorId');
    const soloActivos = searchParams.get('soloActivos') === 'true';
    
    // Construir where para filtrado
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (proveedorId) {
      where.proveedorId = proveedorId;
    }
    
    if (soloActivos) {
      where.activo = true;
    }
    
    // Contar total de insumos
    const total = await prisma.insumo.count({ where });
    
    // Obtener insumos
    const insumos = await prisma.insumo.findMany({
      where,
      include: {
        proveedor: true
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json({
      data: insumos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error al obtener insumos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener insumos' },
      { status: 500 }
    );
  }
}

// POST - Crear insumo
export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission('insumo:crear')(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = insumoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Crear insumo
    const insumo = await prisma.insumo.create({
      data: validation.data,
      include: {
        proveedor: true
      }
    });
    
    return NextResponse.json(insumo, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear insumo:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear insumo' },
      { status: 500 }
    );
  }
}