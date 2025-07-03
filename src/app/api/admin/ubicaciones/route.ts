// src/app/api/admin/ubicaciones/route.ts - VERSIÓN CORREGIDA PARA COMPATIBILIDAD
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

const crearUbicacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['fabrica', 'sucursal', 'oficina'], {
    errorMap: () => ({ message: 'El tipo debe ser fábrica, sucursal u oficina' })
  }),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  activo: z.boolean().default(true)
});

// ✅ FUNCIÓN HELPER PARA VERIFICAR SI ES ENTORNO DE DESARROLLO
function isDevelopmentBypass(req: NextRequest): boolean {
  const isDev = process.env.NODE_ENV === 'development';
  const userAgent = req.headers.get('user-agent') || '';
  const referer = req.headers.get('referer') || '';
  
  // Solo permitir bypass en desarrollo y si viene del frontend
  return isDev && (userAgent.includes('Mozilla') || referer.includes('localhost'));
}

export async function GET(req: NextRequest) {
  try {
    // ✅ BYPASS EN DESARROLLO PARA COMPATIBILIDAD
    if (!isDevelopmentBypass(req)) {
      const authError = await authMiddleware(req);
      if (authError) return authError;
    } else {
      console.log('[DEV] Permitiendo acceso sin autenticación a ubicaciones');
    }
    
    const ubicaciones = await prisma.ubicacion.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' }
    });
    
    return NextResponse.json(ubicaciones);
  } catch (error) {
    console.error('Error al obtener ubicaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener ubicaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // ✅ SIEMPRE REQUERIR AUTENTICACIÓN PARA CREAR UBICACIONES
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = crearUbicacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { 
          error: 'Datos inválidos', 
          details: validation.error.errors 
        },
        { status: 400 }
      );
    }
    
    const { nombre, tipo, direccion, telefono, activo } = validation.data;
    
    // Verificar que no exista una ubicación con el mismo nombre
    const ubicacionExistente = await prisma.ubicacion.findFirst({
      where: { 
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        }
      }
    });
    
    if (ubicacionExistente) {
      return NextResponse.json(
        { error: 'Ya existe una ubicación con ese nombre' },
        { status: 400 }
      );
    }
    
    // Crear la ubicación
    const nuevaUbicacion = await prisma.ubicacion.create({
      data: {
        nombre,
        tipo,
        direccion,
        telefono,
        activo
      }
    });
    
    return NextResponse.json(nuevaUbicacion, { status: 201 });
  } catch (error) {
    console.error('Error al crear ubicación:', error);
    return NextResponse.json(
      { error: 'Error al crear ubicación' },
      { status: 500 }
    );
  }
}