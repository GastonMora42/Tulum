// src/app/api/pdv/productos-disponibles/route.ts - VERSIÓN CORREGIDA
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
    const categoriaId = searchParams.get('categoriaId'); // 🆕 Obtener categoriaId
    const search = searchParams.get('search'); // 🆕 Obtener término de búsqueda
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    console.log(`🔍 Filtrando productos - Sucursal: ${sucursalId}, Categoría: ${categoriaId || 'todas'}, Búsqueda: ${search || 'ninguna'}`);
    
    // 🆕 Construir filtro dinámico para productos
    const productoFilter: any = {
      activo: true
    };
    
    // 🆕 Filtrar por categoría si se especifica
    if (categoriaId) {
      productoFilter.categoriaId = categoriaId;
    }
    
    // 🆕 Filtrar por búsqueda si se especifica
    if (search) {
      const searchTerm = search.toLowerCase();
      productoFilter.OR = [
        { nombre: { contains: searchTerm, mode: 'insensitive' } },
        { descripcion: { contains: searchTerm, mode: 'insensitive' } },
        { codigoBarras: { contains: searchTerm } }
      ];
    }
    
    // Obtener productos con stock disponible y filtros aplicados
    const productos = await prisma.stock.findMany({
      where: {
        ubicacionId: sucursalId,
        cantidad: { gt: 0 },
        productoId: { not: null },
        producto: productoFilter // 🆕 Aplicar filtros dinámicos
      },
      include: {
        producto: {
          include: {
            categoria: true
          }
        }
      },
      orderBy: {
        producto: {
          nombre: 'asc'
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
      imagen: item.producto!.imagen, // 🆕 Incluir imagen
      categoriaId: item.producto!.categoriaId,
      categoria: item.producto!.categoria,
      stock: item.cantidad
    }));
    
    console.log(`✅ Devolviendo ${productosFormatted.length} productos filtrados`);
    
    return NextResponse.json(productosFormatted);
  } catch (error: any) {
    console.error('Error al obtener productos disponibles:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos disponibles' },
      { status: 500 }
    );
  }
}