// src/app/api/admin/ubicaciones/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const ubicacion = await prisma.ubicacion.findUnique({
      where: { id: params.id }
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