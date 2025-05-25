// src/app/api/admin/insumos-pdv/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { z } from 'zod';

const crearInsumoPdvSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  unidadMedida: z.string().min(1, { message: 'La unidad de medida es requerida' }),
  stockMinimo: z.number().nonnegative({ message: 'El stock mínimo debe ser mayor o igual a 0' }),
  activo: z.boolean().default(true)
});

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    const soloActivos = searchParams.get('soloActivos') === 'true';

    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (soloActivos) {
      where.activo = true;
    }

    const [insumos, total] = await Promise.all([
      prisma.insumoPdv.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { nombre: 'asc' }
      }),
      prisma.insumoPdv.count({ where })
    ]);

    return NextResponse.json({
      data: insumos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Error al obtener insumos PDV:', error);
    return NextResponse.json(
      { error: 'Error al obtener insumos PDV' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  const permissionError = await checkPermission('admin:crear')(req);
  if (permissionError) return permissionError;

  try {
    const body = await req.json();
    const validation = crearInsumoPdvSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }

    const insumo = await prisma.insumoPdv.create({
      data: validation.data
    });

    return NextResponse.json(insumo, { status: 201 });
  } catch (error) {
    console.error('Error al crear insumo PDV:', error);
    return NextResponse.json(
      { error: 'Error al crear insumo PDV' },
      { status: 500 }
    );
  }
}