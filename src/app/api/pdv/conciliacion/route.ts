// src/app/api/pdv/conciliacion/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Use findFirst with custom table query since conciliacion might not be in the schema yet
    const conciliacionActiva = await prisma.$queryRaw`
      SELECT * FROM "Conciliacion" 
      WHERE "sucursalId" = ${sucursalId} 
      AND "estado" != 'completada' 
      ORDER BY "fecha" DESC 
      LIMIT 1
    `;
    
    // If no reconciliation in process
    if (!conciliacionActiva || (Array.isArray(conciliacionActiva) && conciliacionActiva.length === 0)) {
      return NextResponse.json(
        { message: 'No hay conciliación activa' },
        { status: 404 }
      );
    }
    
    // Get the active reconciliation (first item if array)
    const conciliacion = Array.isArray(conciliacionActiva) ? conciliacionActiva[0] : conciliacionActiva;
    
    // Obtener datos de productos
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: true
      }
    });
    
    // Explicitly declare diferenciasPorProducto as an array type
    const diferenciasPorProducto: Array<{
      id: string;
      nombre: string;
      stockTeorico: number;
      stockFisico: number | null;
      diferencia: number;
    }> = [];
    
    // Formatear datos para la respuesta
    const formattedData = {
      fecha: conciliacion.fecha,
      estado: conciliacion.estado,
      usuario: conciliacion.usuarioId,
      productos: productos.map(stock => {
        // Make sure stock.producto exists
        if (!stock.producto) {
          return {
            id: stock.productoId || 'unknown',
            nombre: 'Producto desconocido',
            stockTeorico: stock.cantidad,
            stockFisico: null,
            diferencia: 0
          };
        }
        
        // Find stockFisico in detalles if it exists
        let stockFisico = null;
        if (conciliacion.detalles) {
          // Ensure detalles is properly parsed
          const detalles = typeof conciliacion.detalles === 'string' 
            ? JSON.parse(conciliacion.detalles) 
            : conciliacion.detalles;
            
          const item = detalles.find((d: any) => d.productoId === stock.productoId);
          if (item) {
            stockFisico = item.stockFisico;
          }
        }
        
        return {
          id: stock.productoId || 'unknown',
          nombre: stock.producto.nombre || 'Producto desconocido',
          stockTeorico: stock.cantidad,
          stockFisico: stockFisico,
          diferencia: stockFisico !== null ? stockFisico - stock.cantidad : 0
        };
      })
    };
    
    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Error al obtener conciliación:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener conciliación' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { sucursalId } = body;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Check if a conciliation is already in progress using raw query
    const conciliacionExistente = await prisma.$queryRaw`
      SELECT * FROM "Conciliacion" 
      WHERE "sucursalId" = ${sucursalId} 
      AND "estado" != 'completada' 
      LIMIT 1
    `;
    
    if (conciliacionExistente && (
      !Array.isArray(conciliacionExistente) || conciliacionExistente.length > 0
    )) {
      // Ya existe, retornar la existente
      const conciliacion = Array.isArray(conciliacionExistente) 
        ? conciliacionExistente[0] 
        : conciliacionExistente;
        
      return NextResponse.json(conciliacion);
    }
    
    // Create new conciliation using raw query if the table exists
    const currentDate = new Date();
    const formattedDate = format(currentDate, 'yyyy-MM-dd');
    
    // Create a unique ID based on date
    const id = `conciliacion-${formattedDate}-${sucursalId}`;
    
    await prisma.$executeRaw`
      INSERT INTO "Conciliacion" ("id", "sucursalId", "fecha", "estado", "usuarioId", "detalles")
      VALUES (${id}, ${sucursalId}, ${currentDate}, 'pendiente', ${user.id}, '[]')
    `;
    
    // Get products for the conciliation
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: true
      }
    });
    
    // Prepare empty diferenciasPorProducto array with correct type
    const diferenciasPorProducto: Array<{
      id: string;
      nombre: string;
      stockTeorico: number;
      stockFisico: number | null;
      diferencia: number;
    }> = [];
    
    // Format response data
    const formattedData = {
      id,
      fecha: currentDate,
      estado: 'pendiente',
      usuario: user.id,
      productos: productos.map(stock => ({
        id: stock.productoId || 'unknown',
        nombre: stock.producto?.nombre || 'Producto desconocido',
        stockTeorico: stock.cantidad,
        stockFisico: null,
        diferencia: 0
      }))
    };
    
    return NextResponse.json(formattedData);
  } catch (error: any) {
    console.error('Error al crear conciliación:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear conciliación' },
      { status: 500 }
    );
  }
}