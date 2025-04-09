// src/app/api/reportes/stock/bajo/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
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
    
    // Obtener todas las ubicaciones activas (sucursales)
    const ubicaciones = await prisma.ubicacion.findMany({
      where: {
        activo: true,
        tipo: 'sucursal'
      },
      select: {
        id: true,
        nombre: true
      }
    });
    
    // Para cada producto y ubicación, verificar si el stock está por debajo del mínimo
    const stockBajo = [];
    
    for (const producto of productos) {
      for (const ubicacion of ubicaciones) {
        // Obtener stock actual
        const stock = await prisma.stock.findFirst({
          where: {
            productoId: producto.id,
            ubicacionId: ubicacion.id
          }
        });
        
        const stockActual = stock?.cantidad || 0;
        
        // Si está por debajo del mínimo, agregarlo al resultado
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