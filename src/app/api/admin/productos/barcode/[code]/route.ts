// src/app/api/productos/barcode/[code]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  // Verificar autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const code = params.code;
    
    // Buscar producto por código de barras
    const producto = await prisma.producto.findFirst({
      where: {
        codigoBarras: code,
        activo: true
      },
      include: {
        categoria: true
      }
    });
    
    if (!producto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('Error al buscar producto por código de barras:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar producto' },
      { status: 500 }
    );
  }
}