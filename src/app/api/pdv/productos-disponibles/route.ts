// src/app/api/pdv/productos-disponibles/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('venta:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // Obtener productos con stock disponible
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        cantidad: { gt: 0 },
        productoId: { not: null },
        producto: {
          activo: true
        }
      },
      include: {
        producto: {
          include: {
            categoria: true
          }
        }
      }
    });
    
    // Transformar datos para respuesta
    const productosFormatted = productos.map(item => ({
      id: item.producto!.id,
      nombre: item.producto!.nombre,
      precio: item.producto!.precio,
      descripcion: item.producto!.descripcion,
      codigoBarras: item.producto!.codigoBarras,
      categoriaId: item.producto!.categoriaId,
      categoria: item.producto!.categoria,
      stock: item.cantidad
    }));
    
    return NextResponse.json(productosFormatted);
  } catch (error: any) {
    console.error('Error al obtener productos disponibles:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos disponibles' },
      { status: 500 }
    );
  }
}