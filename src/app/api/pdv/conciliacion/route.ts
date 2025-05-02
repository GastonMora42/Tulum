// src/app/api/pdv/conciliacion/route.ts
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
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Buscar conciliación activa
    // Verificar si hay una conciliación en proceso
    const conciliacionActiva = await prisma.conciliacion.findFirst({
      where: {
        sucursalId,
        estado: { not: 'completada' }
      },
      orderBy: {
        fecha: 'desc'
      }
    });
    
    if (!conciliacionActiva) {
      return NextResponse.json(
        { message: 'No hay conciliación activa' },
        { status: 404 }
      );
    }
    
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
    
    // Formatear datos para la respuesta
    const formattedData = {
      fecha: conciliacionActiva.fecha,
      estado: conciliacionActiva.estado,
      usuario: conciliacionActiva.usuarioId,
      productos: productos.map(stock => ({
        id: stock.productoId,
        nombre: stock.producto?.nombre || 'Producto desconocido',
        stockTeorico: stock.cantidad,
        stockFisico: conciliacionActiva.detalles?.find((d: any) => d.productoId === stock.productoId)?.stockFisico || null,
        diferencia: 0 // Se calculará en el frontend
      }))
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
    
    // Verificar si ya existe una conciliación en proceso
    const conciliacionExistente = await prisma.conciliacion.findFirst({
      where: {
        sucursalId,
        estado: { not: 'completada' }
      }
    });
    
    if (conciliacionExistente) {
      // Ya existe, retornar la existente
      return NextResponse.json(conciliacionExistente);
    }
    
    // Crear nueva conciliación
    const nuevaConciliacion = await prisma.conciliacion.create({
      data: {
        sucursalId,
        fecha: new Date(),
        estado: 'pendiente',
        usuarioId: user.id
      }
    });
    
    // Obtener datos de productos para la conciliación
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        productoId: { not: null }
      },
      include: {
        producto: true
      }
    });
    
    // Formatear datos para la respuesta
    const formattedData = {
      fecha: nuevaConciliacion.fecha,
      estado: nuevaConciliacion.estado,
      usuario: nuevaConciliacion.usuarioId,
      productos: productos.map(stock => ({
        id: stock.productoId,
        nombre: stock.producto?.nombre || 'Producto desconocido',
        stockTeorico: stock.cantidad,
        stockFisico: null,
        diferencia: 0 // Se calculará en el frontend
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