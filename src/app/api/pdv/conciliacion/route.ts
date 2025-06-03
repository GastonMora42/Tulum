// src/app/api/pdv/conciliacion/route.ts - VERSIÓN CORREGIDA CON CATEGORÍAS
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { format } from 'date-fns';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    const categoriaId = searchParams.get('categoriaId'); // 🆕 Filtro por categoría
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a esta sucursal' },
        { status: 403 }
      );
    }
    
    // 🆕 VERIFICAR SOLO CONTINGENCIAS DE CONCILIACIÓN DE LA CATEGORÍA ESPECÍFICA
    let contingenciasBloqueo;
    if (categoriaId) {
      // Si es una categoría específica, buscar contingencias solo de esa categoría
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion',
          estado: { in: ['pendiente', 'en_revision'] },
          descripcion: { contains: `Categoría: ${categoriaId}` } // Buscar por descripción que contenga la categoría
        }
      });
    } else {
      // Si es conciliación general, verificar si hay contingencias generales
      contingenciasBloqueo = await prisma.contingencia.findMany({
        where: {
          ubicacionId: sucursalId,
          tipo: 'conciliacion_general', // 🆕 Nuevo tipo para conciliaciones generales
          estado: { in: ['pendiente', 'en_revision'] }
        }
      });
    }
    
    if (contingenciasBloqueo.length > 0) {
      return NextResponse.json(
        { 
          error: categoriaId 
            ? `Existe una contingencia de conciliación pendiente para esta categoría.`
            : `Existe una contingencia de conciliación general pendiente.`,
          contingencias: contingenciasBloqueo.map(c => ({
            id: c.id,
            titulo: c.titulo,
            fechaCreacion: c.fechaCreacion
          }))
        },
        { status: 409 }
      );
    }
    
    // 🆕 BUSCAR CONCILIACIÓN ACTIVA - ESPECÍFICA PARA LA CATEGORÍA O GENERAL
    const whereCondition: any = {
      sucursalId, 
      estado: { in: ['pendiente', 'en_proceso'] }
    };
    
    if (categoriaId) {
      whereCondition.observaciones = { contains: `Categoría: ${categoriaId}` };
    }
    
    const conciliacionActiva = await prisma.conciliacion.findFirst({
      where: whereCondition,
      orderBy: { fecha: 'desc' }
    });
    
    if (!conciliacionActiva) {
      return NextResponse.json(
        { message: 'No hay conciliación activa para esta categoría' },
        { status: 404 }
      );
    }
    
    // 🔧 OBTENER PRODUCTOS CON CATEGORÍAS INCLUIDAS
    const whereStockCondition: any = {
      ubicacionId: sucursalId,
      productoId: { not: null }
    };
    
    // 🆕 Si se especifica categoría, filtrar productos por categoría
    if (categoriaId) {
      whereStockCondition.producto = {
        categoriaId: categoriaId
      };
    }
    
    const productos = await prisma.stock.findMany({
      where: whereStockCondition,
      include: {
        producto: {
          include: {
            categoria: true // 🔧 INCLUIR CATEGORÍA
          }
        }
      }
    });
    
    const formattedData = {
      id: conciliacionActiva.id,
      fecha: conciliacionActiva.fecha,
      estado: conciliacionActiva.estado,
      usuario: conciliacionActiva.usuarioId,
      categoriaId: categoriaId || null, // 🆕 Incluir categoría en respuesta
      productos: productos.map(stock => {
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
          diferencia: stockFisico !== null ? stockFisico - stock.cantidad : 0,
          categoriaId: stock.producto?.categoriaId || 'sin-categoria', // 🔧 INCLUIR CATEGORIA ID
          categoria: {
            id: stock.producto?.categoria?.id || 'sin-categoria',
            nombre: stock.producto?.categoria?.nombre || 'Sin categoría'
          }
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
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { sucursalId, categoriaId } = body; // 🆕 Recibir categoriaId
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para crear conciliaciones en esta sucursal' },
        { status: 403 }
      );
    }
    
    // 🆕 VERIFICAR SI YA EXISTE UNA CONCILIACIÓN ACTIVA PARA ESTA CATEGORÍA
    const whereCondition: any = {
      sucursalId,
      estado: { in: ['pendiente', 'en_proceso'] }
    };
    
    if (categoriaId) {
      whereCondition.observaciones = { contains: `Categoría: ${categoriaId}` };
    }
    
    const conciliacionExistente = await prisma.conciliacion.findFirst({
      where: whereCondition
    });
    
    if (conciliacionExistente) {
      return NextResponse.json({
        id: conciliacionExistente.id,
        fecha: conciliacionExistente.fecha,
        estado: conciliacionExistente.estado,
        categoriaId: categoriaId || null,
        message: categoriaId 
          ? 'Ya existe una conciliación en proceso para esta categoría'
          : 'Ya existe una conciliación en proceso'
      });
    }
    
    // 🆕 OBTENER NOMBRE DE CATEGORÍA SI SE ESPECIFICA
    let categoriaNombre = '';
    if (categoriaId) {
      const categoria = await prisma.categoria.findUnique({
        where: { id: categoriaId }
      });
      categoriaNombre = categoria?.nombre || 'Categoría desconocida';
    }
    
    // 🔧 OBTENER PRODUCTOS FILTRADOS POR CATEGORÍA
    const whereStockCondition: any = {
      ubicacionId: sucursalId,
      productoId: { not: null }
    };
    
    if (categoriaId) {
      whereStockCondition.producto = {
        categoriaId: categoriaId
      };
    }
    
    const productos = await prisma.stock.findMany({
      where: whereStockCondition,
      include: {
        producto: {
          include: {
            categoria: true
          }
        }
      }
    });
    
    // 🆕 CREAR NUEVA CONCILIACIÓN CON IDENTIFICACIÓN DE CATEGORÍA
    const currentDate = new Date();
    const conciliacionId = categoriaId 
      ? `conciliacion-${format(currentDate, 'yyyyMMdd')}-${sucursalId}-${categoriaId}`
      : `conciliacion-${format(currentDate, 'yyyyMMdd')}-${sucursalId}`;
    
    const observacionesBase = categoriaId 
      ? `Conciliación de categoría: ${categoriaNombre} | Categoría: ${categoriaId}`
      : 'Conciliación general de inventario';
    
    const nuevaConciliacion = await prisma.conciliacion.create({
      data: {
        id: conciliacionId,
        sucursalId,
        fecha: currentDate,
        estado: 'pendiente',
        usuarioId: user.id,
        observaciones: observacionesBase,
        detalles: []
      }
    });
    
    // Preparar la respuesta
    const formattedData = {
      id: nuevaConciliacion.id,
      fecha: nuevaConciliacion.fecha,
      estado: nuevaConciliacion.estado,
      usuario: user.id,
      categoriaId: categoriaId || null,
      productos: productos.map(stock => ({
        id: stock.productoId || 'unknown',
        nombre: stock.producto?.nombre || 'Producto desconocido',
        stockTeorico: stock.cantidad,
        stockFisico: null,
        diferencia: 0,
        categoriaId: stock.producto?.categoriaId || 'sin-categoria',
        categoria: {
          id: stock.producto?.categoria?.id || 'sin-categoria',
          nombre: stock.producto?.categoria?.nombre || 'Sin categoría'
        }
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