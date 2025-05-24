// src/app/api/admin/conciliaciones/[id]/completar/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('conciliacion:completar')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const { observaciones } = body;
    
    // Verificar que la conciliación existe y está pendiente
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id: params.id },
      include: {
        contingencias: {
          where: {
            estado: { in: ['pendiente', 'en_revision'] }
          }
        }
      }
    });
    
    if (!conciliacion) {
      return NextResponse.json(
        { error: 'Conciliación no encontrada' },
        { status: 404 }
      );
    }
    
    if (conciliacion.estado === 'completada') {
      return NextResponse.json(
        { error: 'La conciliación ya está completada' },
        { status: 400 }
      );
    }
    
    // Verificar si hay contingencias pendientes
    if (conciliacion.contingencias.length > 0) {
      return NextResponse.json(
        { error: 'No se puede completar la conciliación con contingencias pendientes' },
        { status: 400 }
      );
    }
    
    // Completar conciliación
    const conciliacionActualizada = await prisma.conciliacion.update({
      where: { id: params.id },
      data: {
        estado: 'completada',
        observaciones: observaciones || conciliacion.observaciones
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
    
    return NextResponse.json(conciliacionActualizada);
  } catch (error) {
    console.error('Error al completar conciliación:', error);
    return NextResponse.json(
      { error: 'Error al completar conciliación' },
      { status: 500 }
    );
  }
}