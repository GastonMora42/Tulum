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
    
    // Verificar que el usuario tenga acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a esta sucursal' },
        { status: 403 }
      );
    }
    
    // Buscar conciliación activa
    const conciliacionActiva = await prisma.conciliacion.findFirst({
      where: { 
        sucursalId, 
        estado: { in: ['pendiente', 'en_proceso'] } 
      },
      orderBy: { fecha: 'desc' }
    });
    
    if (!conciliacionActiva) {
      return NextResponse.json(
        { message: 'No hay conciliación activa' },
        { status: 404 }
      );
    }
    
    // Obtener productos con stock en esta sucursal
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: true
      }
    });
    
    // Preparar la respuesta con formato correcto
    const formattedData = {
      id: conciliacionActiva.id,
      fecha: conciliacionActiva.fecha,
      estado: conciliacionActiva.estado,
      usuario: conciliacionActiva.usuarioId,
      productos: productos.map(stock => {
        // Verificar si hay datos previos en detalles
        let stockFisico = null;
        if (conciliacionActiva.detalles) {
          const detalles = typeof conciliacionActiva.detalles === 'string' 
            ? JSON.parse(conciliacionActiva.detalles) 
            : conciliacionActiva.detalles;
            
          const item = detalles.find((d: any) => d.productoId === stock.productoId);
          if (item) {
            stockFisico = item.stockFisico;
          }
        }
        
        return {
          id: stock.productoId || 'unknown',
          nombre: stock.producto?.nombre || 'Producto desconocido',
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
    
    // Verificar que el usuario tenga acceso a esta sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para crear conciliaciones en esta sucursal' },
        { status: 403 }
      );
    }
    
    // Verificar si ya existe una conciliación activa
    const conciliacionExistente = await prisma.conciliacion.findFirst({
      where: {
        sucursalId,
        estado: { in: ['pendiente', 'en_proceso'] }
      }
    });
    
    if (conciliacionExistente) {
      return NextResponse.json({
        id: conciliacionExistente.id,
        fecha: conciliacionExistente.fecha,
        estado: conciliacionExistente.estado,
        message: 'Ya existe una conciliación en proceso'
      });
    }
    
    // Obtener productos para la conciliación
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: true
      }
    });
    
    // Crear nueva conciliación
    const currentDate = new Date();
    const conciliacionId = `conciliacion-${format(currentDate, 'yyyyMMdd')}-${sucursalId}`;
    
    const nuevaConciliacion = await prisma.conciliacion.create({
      data: {
        id: conciliacionId,
        sucursalId,
        fecha: currentDate,
        estado: 'pendiente',
        usuarioId: user.id,
        detalles: [] // Inicialmente vacío
      }
    });
    
    // Preparar la respuesta
    const formattedData = {
      id: nuevaConciliacion.id,
      fecha: nuevaConciliacion.fecha,
      estado: nuevaConciliacion.estado,
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