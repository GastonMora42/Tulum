// src/app/api/admin/recetas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { z } from 'zod';

// Esquema de validación para crear/actualizar receta
const recetaSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  rendimiento: z.number().int().positive({ message: 'El rendimiento debe ser un número positivo' }),
  items: z.array(z.object({
    insumoId: z.string({ required_error: 'El insumo es requerido' }),
    cantidad: z.number().positive({ message: 'La cantidad debe ser mayor a 0' })
  })),
  productos: z.array(z.string()).optional()
});

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
    
    // Construir where para filtrado
    const where: any = {};
    
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // Contar total de recetas
    const total = await prisma.receta.count({ where });
    
    // Obtener recetas
    const recetas = await prisma.receta.findMany({
      where,
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
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: {
        nombre: 'asc'
      }
    });
    
    return NextResponse.json({
      data: recetas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error: any) {
    console.error('Error al obtener recetas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener recetas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
    const body = await req.json();
    
    // Validar datos de entrada
    const validation = recetaSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { nombre, descripcion, rendimiento, items, productos } = validation.data;
    
    // Crear receta en una transacción
    const receta = await prisma.$transaction(async (tx) => {
      // Crear la receta (código existente)
      const nuevaReceta = await tx.receta.create({
        data: {
          nombre,
          descripcion,
          rendimiento
        }
      });
      
      // Crear los items de la receta (código existente)
      for (const item of items) {
        await tx.recetaItem.create({
          data: {
            recetaId: nuevaReceta.id,
            insumoId: item.insumoId,
            cantidad: item.cantidad
          }
        });
      }
      
      // Asociar productos si se proporcionaron
      if (productos && productos.length > 0) {
        for (const productoId of productos) {
          await tx.productoReceta.create({
            data: {
              recetaId: nuevaReceta.id,
              productoId
            }
          });
        }
      }
      
      // Retornar la receta completa
      return tx.receta.findUnique({
        where: { id: nuevaReceta.id },
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
    
    return NextResponse.json(receta, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear receta' },
      { status: 500 }
    );
  }
}