// src/app/api/admin/configuracion-cierres/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import prisma from '@/server/db/client';
import { z } from 'zod';

const configuracionCierreSchema = z.object({
  sucursalId: z.string().uuid(),
  montoFijo: z.number().min(0).max(1000000),
});

// GET - Obtener configuraciones de cierres
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['admin'])(req);
  if (permError) return permError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (sucursalId) {
      // Obtener configuración específica de una sucursal
      let configuracion = await prisma.configuracionCierre.findUnique({
        where: { sucursalId },
        include: {
          sucursal: { select: { nombre: true } },
          usuario: { select: { name: true, email: true } }
        }
      });
      
      // Si no existe, crear una por defecto
      if (!configuracion) {
        const user = (req as any).user;
        configuracion = await prisma.configuracionCierre.create({
          data: {
            sucursalId,
            montoFijo: 10000,
            creadoPor: user.id
          },
          include: {
            sucursal: { select: { nombre: true } },
            usuario: { select: { name: true, email: true } }
          }
        });
      }
      
      return NextResponse.json(configuracion);
    } else {
      // Obtener todas las configuraciones
      const configuraciones = await prisma.configuracionCierre.findMany({
        include: {
          sucursal: { select: { nombre: true } },
          usuario: { select: { name: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      });
      
      return NextResponse.json(configuraciones);
    }
  } catch (error: any) {
    console.error('Error al obtener configuraciones de cierres:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener configuraciones' },
      { status: 500 }
    );
  }
}

// POST - Crear o actualizar configuración de cierre
export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const user = (req as any).user;
    
    const validation = configuracionCierreSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { sucursalId, montoFijo } = validation.data;
    
    // Verificar que la sucursal existe
    const sucursal = await prisma.ubicacion.findUnique({
      where: { id: sucursalId }
    });
    
    if (!sucursal) {
      return NextResponse.json(
        { error: 'Sucursal no encontrada' },
        { status: 404 }
      );
    }
    
    // Crear o actualizar configuración
    const configuracion = await prisma.configuracionCierre.upsert({
      where: { sucursalId },
      update: {
        montoFijo,
        creadoPor: user.id,
        updatedAt: new Date()
      },
      create: {
        sucursalId,
        montoFijo,
        creadoPor: user.id
      },
      include: {
        sucursal: { select: { nombre: true } },
        usuario: { select: { name: true, email: true } }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente',
      configuracion
    });
  } catch (error: any) {
    console.error('Error al guardar configuración de cierre:', error);
    return NextResponse.json(
      { error: error.message || 'Error al guardar configuración' },
      { status: 500 }
    );
  }
}

// DELETE - Restablecer configuración a valores por defecto
export async function DELETE(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['admin'])(req);
  if (permError) return permError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'ID de sucursal requerido' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    
    // Restablecer a valores por defecto
    const configuracion = await prisma.configuracionCierre.upsert({
      where: { sucursalId },
      update: {
        montoFijo: 10000,
        creadoPor: user.id,
        updatedAt: new Date()
      },
      create: {
        sucursalId,
        montoFijo: 10000,
        creadoPor: user.id
      },
      include: {
        sucursal: { select: { nombre: true } },
        usuario: { select: { name: true, email: true } }
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Configuración restablecida a valores por defecto',
      configuracion
    });
  } catch (error: any) {
    console.error('Error al restablecer configuración:', error);
    return NextResponse.json(
      { error: error.message || 'Error al restablecer configuración' },
      { status: 500 }
    );
  }
}