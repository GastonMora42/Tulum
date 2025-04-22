// src/app/api/fabrica/produccion/[id]/estado/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema para actualizar estado
const updateEstadoSchema = z.object({
  estado: z.enum(['en_proceso', 'finalizada', 'con_contingencia'])
});

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(request);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('produccion:editar')(request);
  if (permissionError) return permissionError;
  
  const id = context.params.id;
  
  try {
    const body = await request.json();
    
    // Validar datos de entrada
    const validation = updateEstadoSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Estado inválido', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si la producción existe
    const existingProduccion = await prisma.production.findUnique({
      where: { id }
    });
    
    if (!existingProduccion) {
      return NextResponse.json(
        { error: 'Producción no encontrada' },
        { status: 404 }
      );
    }
    
    // Actualizar solo el estado
    const produccion = await prisma.production.update({
      where: { id },
      data: {
        estado: validation.data.estado,
        // Si se finaliza, establecer fecha de fin
        ...(validation.data.estado === 'finalizada' ? { fechaFin: new Date() } : {})
      }
    });
    
    return NextResponse.json(produccion);
  } catch (error: any) {
    console.error('Error al actualizar estado de producción:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar estado de producción' },
      { status: 500 }
    );
  }
}