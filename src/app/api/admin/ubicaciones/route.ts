import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest) {
  try {
    const ubicaciones = await prisma.ubicacion.findMany({
      where: { activo: true }
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