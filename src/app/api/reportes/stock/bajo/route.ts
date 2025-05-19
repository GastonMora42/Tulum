// src/app/api/reportes/stock/bajo/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    console.log(`Generando reporte de stock bajo para sucursal: ${sucursalId || 'todas'}`);
    
    // Si no se proporciona sucursalId, obtener todas las ubicaciones activas
    const ubicaciones = sucursalId ? 
      [await prisma.ubicacion.findUnique({ where: { id: sucursalId } })] :
      await prisma.ubicacion.findMany({ where: { activo: true, tipo: 'sucursal' } });
    
    if (ubicaciones.length === 0 || (sucursalId && !ubicaciones[0])) {
      return NextResponse.json([]);
    }
    
    // Obtener todos los productos con su stock mínimo
    const productos = await prisma.producto.findMany({
      where: {
        activo: true
      },
      select: {
        id: true,
        nombre: true,
        stockMinimo: true
      }
    });
    
    const stockBajo = [];
    
    // Para cada ubicación seleccionada, verificar productos con stock bajo
    for (const ubicacion of ubicaciones) {
      if (!ubicacion) continue;
      
      // Consultar stock de productos en esta ubicación
      const stocks = await prisma.stock.findMany({
        where: {
          ubicacionId: ubicacion.id,
          productoId: { 
            in: productos.map(p => p.id) 
          }
        }
      });
      
      // Crear map para acceso rápido
      const stockMap = new Map();
      stocks.forEach(stock => {
        stockMap.set(stock.productoId, stock.cantidad);
      });
      
      // Para cada producto, verificar si su stock está bajo el mínimo
      for (const producto of productos) {
        const stockActual = stockMap.get(producto.id) || 0;
        
        if (stockActual < producto.stockMinimo) {
          stockBajo.push({
            id: `${producto.id}-${ubicacion.id}`,
            productoId: producto.id,
            nombre: producto.nombre,
            ubicacionId: ubicacion.id,
            sucursal: ubicacion.nombre,
            stock: stockActual,
            stockMinimo: producto.stockMinimo
          });
        }
      }
    }
    
    return NextResponse.json(stockBajo);
  } catch (error) {
    console.error('Error al generar reporte de stock bajo:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de stock bajo' },
      { status: 500 }
    );
  }
}