// src/app/api/admin/ubicaciones/route.ts - VERSIÓN MEJORADA
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

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
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