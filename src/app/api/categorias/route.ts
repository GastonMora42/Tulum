// src/app/api/categorias/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const includeProducts = searchParams.get('includeProducts') === 'true';
    
    console.log('[API Categorias] Obteniendo categorías...');
    
    // Obtener todas las categorías activas
    const categorias = await prisma.categoria.findMany({
      orderBy: {
        nombre: 'asc'
      },
      ...(includeProducts && {
        include: {
          productos: {
            where: {
              activo: true
            },
            select: {
              id: true,
              nombre: true,
              precio: true,
              codigoBarras: true,
              imagen: true
            }
          },
          _count: {
            select: {
              productos: {
                where: {
                  activo: true
                }
              }
            }
          }
        }
      })
    });

    console.log(`[API Categorias] Encontradas ${categorias.length} categorías`);

    // Si no se requieren productos, simplificar la respuesta
    if (!includeProducts) {
      const categoriasSimples = categorias.map(categoria => ({
        id: categoria.id,
        nombre: categoria.nombre,
        imagen: categoria.imagen || null
      }));
      
      return NextResponse.json(categoriasSimples);
    }

    return NextResponse.json(categorias);
  } catch (error: any) {
    console.error('[API Categorias] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const user = (req as any).user;
    
    // Solo admins pueden crear categorías
    if (user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para crear categorías' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { nombre, imagen } = body;

    if (!nombre) {
      return NextResponse.json(
        { error: 'El nombre de la categoría es obligatorio' },
        { status: 400 }
      );
    }

    // Verificar que no exista otra categoría con el mismo nombre
    const categoriaExistente = await prisma.categoria.findFirst({
      where: {
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        }
      }
    });

    if (categoriaExistente) {
      return NextResponse.json(
        { error: 'Ya existe una categoría con ese nombre' },
        { status: 400 }
      );
    }

    const nuevaCategoria = await prisma.categoria.create({
      data: {
        nombre: nombre.trim(),
        imagen: imagen || null
      }
    });

    console.log(`[API Categorias] Nueva categoría creada: ${nuevaCategoria.nombre} (${nuevaCategoria.id})`);

    return NextResponse.json(nuevaCategoria);
  } catch (error: any) {
    console.error('[API Categorias] Error al crear categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear categoría' },
      { status: 500 }
    );
  }
}