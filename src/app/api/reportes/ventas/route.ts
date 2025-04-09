// src/app/api/reportes/ventas/route.ts

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { parse, format } from 'date-fns';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  try {
    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');
    
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'Se requieren fechas de inicio y fin' },
        { status: 400 }
      );
    }
    
    // Convertir a objetos Date para usar en la consulta
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999); // Incluir todo el día final
    
    // Obtener ventas en el rango de fechas
    const ventas = await prisma.venta.findMany({
      where: {
        fecha: {
          gte: start,
          lte: end
        }
      },
      include: {
        items: {
          include: {
            producto: true
          }
        }
      },
      orderBy: {
        fecha: 'asc'
      }
    });
    
    // Procesar para obtener ventas por día
    const ventasPorDia = new Map<string, { total: number; cantidad: number }>();
    ventas.forEach(venta => {
      const fecha = format(venta.fecha, 'yyyy-MM-dd');
      const actual = ventasPorDia.get(fecha) || { total: 0, cantidad: 0 };
      
      ventasPorDia.set(fecha, {
        total: actual.total + venta.total,
        cantidad: actual.cantidad + 1
      });
    });
    
    // Convertir a array para la respuesta
    const ventasPorDiaArray = Array.from(ventasPorDia.entries()).map(([fecha, datos]) => ({
      fecha,
      total: datos.total,
      cantidad: datos.cantidad
    }));
    
    // Procesar para obtener ventas por producto
    const ventasPorProducto = new Map<string, { 
      productoId: string; 
      nombre: string; 
      cantidad: number; 
      total: number 
    }>();
    
    ventas.forEach(venta => {
      venta.items.forEach(item => {
        const productoId = item.productoId;
        const actual = ventasPorProducto.get(productoId) || { 
          productoId, 
          nombre: item.producto.nombre, 
          cantidad: 0, 
          total: 0 
        };
        
        ventasPorProducto.set(productoId, {
          ...actual,
          cantidad: actual.cantidad + item.cantidad,
          total: actual.total + (item.precioUnitario * item.cantidad * (1 - item.descuento / 100))
        });
      });
    });
    
    // Convertir a array para la respuesta
    const ventasPorProductoArray = Array.from(ventasPorProducto.values());
    
    return NextResponse.json({
      ventasPorDia: ventasPorDiaArray,
      ventasPorProducto: ventasPorProductoArray
    });
  } catch (error) {
    console.error('Error al generar reporte de ventas:', error);
    return NextResponse.json(
      { error: 'Error al generar reporte de ventas' },
      { status: 500 }
    );
  }
}