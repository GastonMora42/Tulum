// src/app/api/admin/conciliaciones/[id]/route.ts - ACTUALIZACIÓN
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const conciliacion = await prisma.conciliacion.findUnique({
      where: { id: params.id },
      include: {
        sucursal: true,
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        contingencias: {
          include: {
            usuario: {
              select: {
                id: true,
                name: true
              }
            }
          },
          orderBy: {
            fechaCreacion: 'desc'
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
    
    return NextResponse.json(conciliacion);
  } catch (error) {
    console.error('Error al obtener conciliación:', error);
    return NextResponse.json(
      { error: 'Error al obtener conciliación' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('conciliacion:editar')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const { estado, observaciones, detalles } = body;
    
    const conciliacion = await prisma.conciliacion.update({
      where: { id: params.id },
      data: {
        ...(estado && { estado }),
        ...(observaciones !== undefined && { observaciones }),
        ...(detalles !== undefined && { detalles })
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
    
    return NextResponse.json(conciliacion);
  } catch (error) {
    console.error('Error al actualizar conciliación:', error);
    return NextResponse.json(
      { error: 'Error al actualizar conciliación' },
      { status: 500 }
    );
  }
}