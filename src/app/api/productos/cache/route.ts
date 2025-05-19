// src/app/api/productos/cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    console.log(`Obteniendo caché de productos para sucursal: ${sucursalId}`);
    
    // Obtener productos con su stock actual en esta sucursal
    const productosConStock = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: {
          include: {
            categoria: true
          }
        }
      }
    });
    
    // Transformar datos para enviar solo lo necesario
    const productos = productosConStock
      .filter(stock => stock.producto) // Asegurar que el producto existe
      .map(stock => ({
        id: stock.producto!.id,
        nombre: stock.producto!.nombre,
        descripcion: stock.producto!.descripcion,
        precio: stock.producto!.precio,
        codigoBarras: stock.producto!.codigoBarras,
        imagen: stock.producto!.imagen,
        categoriaId: stock.producto!.categoriaId,
        categoria: stock.producto!.categoria ? {
          id: stock.producto!.categoria.id,
          nombre: stock.producto!.categoria.nombre
        } : null,
        stock: stock.cantidad
      }));
    
    console.log(`Retornando ${productos.length} productos para caché`);
    return NextResponse.json(productos);
  } catch (error: any) {
    console.error('Error al obtener caché de productos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener caché de productos' },
      { status: 500 }
    );
  }
}