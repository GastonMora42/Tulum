// src/app/api/admin/facturas/reintentos/[facturaId]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: { facturaId: string } }
) {
  // Autenticar y autorizar
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['admin', 'factura:ver'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { facturaId } = params;
    
    const reintentos = await prisma.facturaReintento.findMany({
      where: { facturaId },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: { iniciadoEn: 'desc' }
    });
    
    return NextResponse.json(reintentos);
  } catch (error: any) {
    console.error('Error al obtener reintentos de factura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener reintentos' },
      { status: 500 }
    );
  }
}