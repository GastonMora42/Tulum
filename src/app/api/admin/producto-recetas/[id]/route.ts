// src/app/api/admin/producto-recetas/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('productoReceta:eliminar')(req);
  if (permissionError) return permissionError;
  
  try {
    // Verificar si la asociación existe
    const productoReceta = await prisma.productoReceta.findUnique({
      where: { id: params.id }
    });
    
    if (!productoReceta) {
      return NextResponse.json(
        { error: 'Asociación no encontrada' },
        { status: 404 }
      );
    }
    
    // Eliminar la asociación
    await prisma.productoReceta.delete({
      where: { id: params.id }
    });
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error al eliminar asociación producto-receta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar asociación producto-receta' },
      { status: 500 }
    );
  }
}