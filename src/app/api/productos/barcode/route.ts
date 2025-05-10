// src/app/api/productos/barcode/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    const sucursalId = searchParams.get('sucursalId');
    
    if (!code) {
      return NextResponse.json(
        { error: 'Se requiere un código de barras' },
        { status: 400 }
      );
    }
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere un ID de sucursal' },
        { status: 400 }
      );
    }
    
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
    
    // Obtener stock para este producto en la sucursal
    const stock = await prisma.stock.findFirst({
      where: {
        productoId: producto.id,
        ubicacionId: sucursalId
      }
    });
    
    // Retornar producto con su stock
    return NextResponse.json({
      ...producto,
      stock: stock?.cantidad || 0
    });
  } catch (error: any) {
    console.error('Error al buscar producto por código:', error);
    return NextResponse.json(
      { error: error.message || 'Error al buscar producto' },
      { status: 500 }
    );
  }
}