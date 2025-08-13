// src/app/api/admin/categorias/route.ts - FORMATO CONSISTENTE CORREGIDO
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear/actualizar categoría con imagen
const categoriaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' }),
  imagen: z.string().nullable().optional()
});

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(req.url);
    const includeProducts = searchParams.get('includeProducts') === 'true';
    const includeCount = searchParams.get('includeCount') === 'true';
    
    console.log('[API Categorias] ✅ Obteniendo categorías...', {
      includeProducts,
      includeCount
    });
    
    // ✅ CONSULTA OPTIMIZADA Y CONSISTENTE
    const categorias = await prisma.categoria.findMany({
      orderBy: {
        nombre: 'asc'
      },
      ...(includeProducts && {
        include: {
          productos: {
            where: { activo: true },
            select: {
              id: true,
              nombre: true,
              precio: true,
              codigoBarras: true,
              imagen: true,
              stockMinimo: true,
              activo: true
            }
          }
        }
      }),
      ...(includeCount && {
        include: {
          _count: {
            select: {
              productos: {
                where: { activo: true }
              }
            }
          }
        }
      })
    });

    console.log(`[API Categorias] ✅ Encontradas ${categorias.length} categorías`);

    // ✅ FORMATO CONSISTENTE - SIEMPRE DEVOLVER ARRAY SIMPLE
    const categoriasFormateadas = categorias.map(categoria => ({
      id: categoria.id,
      nombre: categoria.nombre,
      imagen: categoria.imagen || null,
      // Solo incluir productos si se solicita
      ...(includeProducts && {
        productos: (categoria as any).productos || []
      }),
      // Solo incluir conteo si se solicita
      ...(includeCount && {
        _count: (categoria as any)._count || { productos: 0 }
      })
    }));

    // ✅ RESPUESTA CONSISTENTE - SIEMPRE ARRAY DIRECTO
    return NextResponse.json(categoriasFormateadas);
  } catch (error: any) {
    console.error('[API Categorias] ❌ Error:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener categorías' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
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
    
    // Crear categoría con imagen
    const categoria = await prisma.categoria.create({
      data: {
        nombre: validation.data.nombre,
        imagen: validation.data.imagen
      }
    });
    
    console.log(`[API Categorias] ✅ Nueva categoría creada: ${categoria.nombre} (${categoria.id})`);
    
    return NextResponse.json(categoria, { status: 201 });
  } catch (error: any) {
    console.error('[API Categorias] ❌ Error al crear categoría:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear categoría' },
      { status: 500 }
    );
  }
}