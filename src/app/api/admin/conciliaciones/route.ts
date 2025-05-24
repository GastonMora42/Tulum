// src/app/api/admin/conciliaciones/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

const crearConciliacionSchema = z.object({
  sucursalId: z.string(),
  observaciones: z.string().optional(),
  detalles: z.any().optional() // JSON con productos y cantidades
});

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros de filtrado
    const estado = searchParams.get('estado');
    const sucursalId = searchParams.get('sucursalId');
    const fechaDesde = searchParams.get('fechaDesde');
    const fechaHasta = searchParams.get('fechaHasta');
    const usuarioId = searchParams.get('usuarioId');
    
    // Construir filtro
    const where: any = {};
    
    if (estado) {
      where.estado = estado;
    }
    
    if (sucursalId) {
      where.sucursalId = sucursalId;
    }
    
    if (usuarioId) {
      where.usuarioId = usuarioId;
    }
    
    if (fechaDesde) {
      where.fecha = {
        ...where.fecha,
        gte: new Date(fechaDesde)
      };
    }
    
    if (fechaHasta) {
      where.fecha = {
        ...where.fecha,
        lte: new Date(fechaHasta)
      };
    }
    
    const conciliaciones = await prisma.conciliacion.findMany({
      where,
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            contingencias: true
          }
        }
      },
      orderBy: {
        fecha: 'desc'
      }
    });
    
    return NextResponse.json(conciliaciones);
  } catch (error) {
    console.error('Error al obtener conciliaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener conciliaciones' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('conciliacion:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const user = (req as any).user;
    
    const validation = crearConciliacionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { sucursalId, observaciones, detalles } = validation.data;
    
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
    
    // Crear conciliación
    const conciliacion = await prisma.conciliacion.create({
      data: {
        sucursalId,
        estado: 'pendiente',
        usuarioId: user.id,
        observaciones,
        detalles,
        fecha: new Date()
      },
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });
    
    return NextResponse.json(conciliacion, { status: 201 });
  } catch (error) {
    console.error('Error al crear conciliación:', error);
    return NextResponse.json(
      { error: 'Error al crear conciliación' },
      { status: 500 }
    );
  }
}