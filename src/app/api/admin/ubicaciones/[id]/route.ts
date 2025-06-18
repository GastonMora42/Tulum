// src/app/api/admin/ubicaciones/[id]/route.ts - VERSIÓN ACTUALIZADA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

const actualizarUbicacionSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  tipo: z.enum(['fabrica', 'sucursal', 'oficina'], {
    errorMap: () => ({ message: 'El tipo debe ser fábrica, sucursal u oficina' })
  }),
  direccion: z.string().optional(),
  telefono: z.string().optional(),
  activo: z.boolean().default(true)
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: params.id },
      include: {
        usuarios: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            usuarios: true,
            stocks: true,
            enviosOrigen: true,
            enviosDestino: true
          }
        }
      }
    });
    
    if (!ubicacion) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(ubicacion);
  } catch (error) {
    console.error('Error al obtener ubicación:', error);
    return NextResponse.json(
      { error: 'Error al obtener ubicación' },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos
    const validation = actualizarUbicacionSchema.safeParse(body);
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
    
    // Verificar que la ubicación existe
    const ubicacionExistente = await prisma.ubicacion.findUnique({
      where: { id: params.id }
    });
    
    if (!ubicacionExistente) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que no existe otra ubicación con el mismo nombre (excepto la actual)
    const ubicacionConMismoNombre = await prisma.ubicacion.findFirst({
      where: { 
        nombre: {
          equals: nombre,
          mode: 'insensitive'
        },
        id: {
          not: params.id
        }
      }
    });
    
    if (ubicacionConMismoNombre) {
      return NextResponse.json(
        { error: 'Ya existe otra ubicación con ese nombre' },
        { status: 400 }
      );
    }
    
    // Actualizar la ubicación
    const ubicacionActualizada = await prisma.ubicacion.update({
      where: { id: params.id },
      data: {
        nombre,
        tipo,
        direccion,
        telefono,
        activo
      },
      include: {
        usuarios: {
          select: {
            id: true,
            name: true,
            email: true,
            role: {
              select: {
                name: true
              }
            }
          }
        },
        _count: {
          select: {
            usuarios: true,
            stocks: true,
            enviosOrigen: true,
            enviosDestino: true
          }
        }
      }
    });
    
    return NextResponse.json(ubicacionActualizada);
  } catch (error) {
    console.error('Error al actualizar ubicación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar ubicación' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('admin')(req);
  if (permissionError) return permissionError;
  
  try {
    // Verificar que la ubicación existe
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: params.id },
      include: {
        usuarios: true,
        stocks: true,
        enviosOrigen: true,
        enviosDestino: true,
        ventas: true
      }
    });
    
    if (!ubicacion) {
      return NextResponse.json(
        { error: 'Ubicación no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar que no tiene dependencias críticas
    const tieneDependencias = 
      ubicacion.usuarios.length > 0 ||
      ubicacion.stocks.length > 0 ||
      ubicacion.enviosOrigen.length > 0 ||
      ubicacion.enviosDestino.length > 0 ||
      ubicacion.ventas.length > 0;
    
    if (tieneDependencias) {
      return NextResponse.json(
        { 
          error: 'No se puede eliminar la ubicación porque tiene datos asociados',
          details: {
            usuarios: ubicacion.usuarios.length,
            stocks: ubicacion.stocks.length,
            envios: ubicacion.enviosOrigen.length + ubicacion.enviosDestino.length,
            ventas: ubicacion.ventas.length
          }
        },
        { status: 400 }
      );
    }
    
    // Eliminar la ubicación
    await prisma.ubicacion.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Ubicación eliminada correctamente'
    });
  } catch (error) {
    console.error('Error al eliminar ubicación:', error);
    return NextResponse.json(
      { error: 'Error al eliminar ubicación' },
      { status: 500 }
    );
  }
}