// src/app/api/fabrica/produccion/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para actualización
const updateProduccionSchema = z.object({
  estado: z.enum(['pendiente', 'en_proceso', 'finalizada', 'con_contingencia']),
  observaciones: z.string().optional()
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: Promise<string> } }
) {
  // Primero realizar la autenticación antes de usar params
  const authError = await authMiddleware(request);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:ver')(request);
  if (permissionError) return permissionError;
  
  // Esperar a que el ID se resuelva
  const id = await params.id;
  
  try {
    // Verificar si el ID es válido (evitar problemas con "nueva" o "init")
    if (id === 'nueva' || id === 'init') {
      return NextResponse.json(
        { error: 'Ruta inválida' },
        { status: 404 }
      );
    }
    
    const produccion = await prisma.production.findUnique({
      where: { id },
      include: {
        receta: {
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
        },
        usuario: true,
        contingencias: {
          include: {
            usuario: true
          }
        }
      }
    });
    
    if (!produccion) {
      return NextResponse.json(
        { error: 'Producción no encontrada' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(produccion);
  } catch (error: any) {
    console.error('Error al obtener producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener producción' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: Promise<string> } }
) {
  // Primero realizar la autenticación antes de usar params
  const authError = await authMiddleware(request);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:editar')(request);
  if (permissionError) return permissionError;
  
  // Esperar a que el ID se resuelva
  const id = await params.id;
  
  try {
    // Obtener el cuerpo de la solicitud
    const body = await request.json();
    
    // Validar datos de entrada
    const validation = updateProduccionSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    const { estado, observaciones } = validation.data;
    
    // Verificar que la producción existe
    const existingProduccion = await prisma.production.findUnique({
      where: { id }
    });
    
    if (!existingProduccion) {
      return NextResponse.json(
        { error: 'Producción no encontrada' },
        { status: 404 }
      );
    }
    
    // Preparar los datos para actualizar
    const updateData: any = { estado };
    
    // Manejar observaciones (concatenar con existentes si las hay)
    if (observaciones) {
      updateData.observaciones = existingProduccion.observaciones
        ? `${existingProduccion.observaciones}\n${observaciones}`
        : observaciones;
    }
    
    // Agregar fecha de finalización si se está finalizando
    if (estado === 'finalizada' && existingProduccion.estado !== 'finalizada') {
      updateData.fechaFin = new Date();
    }
    
    // Actualizar producción
    const updatedProduccion = await prisma.production.update({
      where: { id },
      data: updateData,
      include: {
        receta: true,
        usuario: true
      }
    });
    
    return NextResponse.json(updatedProduccion);
  } catch (error: any) {
    console.error('Error al actualizar producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar producción' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: Promise<string> } }
) {
  // Primero realizar la autenticación antes de usar params
  const authError = await authMiddleware(request);
  if (authError) return authError;
  
  // Verificar permiso para eliminar
  const permissionError = await checkPermission('produccion:eliminar')(request);
  if (permissionError) return permissionError;
  
  // Esperar a que el ID se resuelva
  const id = await params.id;
  
  try {
    // Verificar que la producción existe
    const existingProduccion = await prisma.production.findUnique({
      where: { id },
      include: {
        contingencias: true
      }
    });
    
    if (!existingProduccion) {
      return NextResponse.json(
        { error: 'Producción no encontrada' },
        { status: 404 }
      );
    }
    
    // Verificar si se puede eliminar
    if (existingProduccion.estado === 'finalizada') {
      return NextResponse.json(
        { error: 'No se puede eliminar una producción finalizada' },
        { status: 400 }
      );
    }
    
    if (existingProduccion.contingencias.length > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una producción con contingencias' },
        { status: 400 }
      );
    }
    
    // Eliminar en una transacción
    await prisma.$transaction(async (tx) => {
      // Primero eliminar posibles movimientos de stock asociados
      await tx.movimientoStock.deleteMany({
        where: { produccionId: id }
      });
      
      // Luego eliminar la producción
      await tx.production.delete({
        where: { id }
      });
    });
    
    return NextResponse.json({
      success: true,
      message: 'Producción eliminada correctamente'
    });
  } catch (error: any) {
    console.error('Error al eliminar producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar producción' },
      { status: 500 }
    );
  }
}