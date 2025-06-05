
// src/app/api/admin/sucursales/[id]/impresoras/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const sucursalId = params.id;
    
    const impresoras = await prisma.configuracionImpresora.findMany({
      where: {
        sucursalId,
        activa: true
      },
      orderBy: [
        { esPorDefecto: 'desc' },
        { nombre: 'asc' }
      ]
    });

    const formattedPrinters = impresoras.map(imp => ({
      id: imp.id,
      name: imp.nombre,
      type: imp.tipo,
      sucursalId: imp.sucursalId,
      isDefault: imp.esPorDefecto,
      settings: imp.configuracion
    }));

    return NextResponse.json(formattedPrinters);
  } catch (error) {
    console.error('Error obteniendo impresoras de sucursal:', error);
    return NextResponse.json(
      { error: 'Error al obtener impresoras' },
      { status: 500 }
    );
  }
}
