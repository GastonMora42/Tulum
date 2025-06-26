// src/app/api/admin/productos/route.ts - VERSIÓN CORREGIDA PARA FÁBRICA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const conStock = searchParams.get('conStock') === 'true';
    const categoriaId = searchParams.get('categoriaId');
    const ubicacionId = searchParams.get('ubicacionId');
    const incluirInactivos = searchParams.get('incluirInactivos') === 'true';
    const limit = parseInt(searchParams.get('limit') || '1000'); // 🔧 AUMENTAR LÍMITE
    const search = searchParams.get('search');
    
    const user = (req as any).user;
    
    // 🔧 CORRECCIÓN: Construir where condition más flexible
    const whereCondition: any = {};
    
    // Solo filtrar por activo si no se especifica incluirInactivos
    if (!incluirInactivos) {
      whereCondition.activo = true;
    }
    
    // Filtro por categoría
    if (categoriaId) {
      whereCondition.categoriaId = categoriaId;
    }
    
    // Filtro de búsqueda
    if (search) {
      whereCondition.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    console.log(`[API Productos] Buscando productos con filtros:`, {
      conStock,
      categoriaId,
      ubicacionId,
      incluirInactivos,
      limit,
      search,
      userRole: user.roleId
    });
    
    if (conStock && ubicacionId) {
      // 🔧 CORRECCIÓN: Consulta optimizada para productos con stock
      const productosConStock = await prisma.stock.findMany({
        where: {
          ubicacionId,
          productoId: { not: null },
          producto: whereCondition // 🔧 Aplicar filtros a productos
        },
        include: {
          producto: {
            include: {
              categoria: true
            }
          }
        },
        take: limit,
        orderBy: [
          { producto: { nombre: 'asc' } }
        ]
      });
      
      // Transformar datos
      const productos = productosConStock
        .filter(stock => stock.producto) // 🔧 Asegurar que el producto existe
        .map(stock => ({
          id: stock.producto!.id,
          nombre: stock.producto!.nombre,
          descripcion: stock.producto!.descripcion,
          precio: stock.producto!.precio,
          codigoBarras: stock.producto!.codigoBarras,
          imagen: stock.producto!.imagen,
          categoriaId: stock.producto!.categoriaId,
          categoria: stock.producto!.categoria,
          stockMinimo: stock.producto!.stockMinimo,
          activo: stock.producto!.activo,
          stock: stock.cantidad // Stock actual en la ubicación
        }));
      
      console.log(`[API Productos] Encontrados ${productos.length} productos con stock`);
      return NextResponse.json(productos);
      
    } else {
      // 🔧 CORRECCIÓN: Consulta para todos los productos sin filtro de stock
      const productos = await prisma.producto.findMany({
        where: whereCondition,
        include: {
          categoria: true,
          // 🆕 INCLUIR STOCK PARA REFERENCIA (opcional)
          stocks: ubicacionId ? {
            where: { ubicacionId },
            select: { cantidad: true }
          } : false
        },
        take: limit,
        orderBy: [
          { nombre: 'asc' }
        ]
      });
      
      // 🔧 TRANSFORMAR DATOS INCLUYENDO STOCK SI ESTÁ DISPONIBLE
      const productosTransformados = productos.map(producto => ({
        id: producto.id,
        nombre: producto.nombre,
        descripcion: producto.descripcion,
        precio: producto.precio,
        codigoBarras: producto.codigoBarras,
        imagen: producto.imagen,
        categoriaId: producto.categoriaId,
        categoria: producto.categoria,
        stockMinimo: producto.stockMinimo,
        activo: producto.activo,
        // 🆕 INCLUIR STOCK SI ESTÁ DISPONIBLE
        stock: ubicacionId && producto.stocks && producto.stocks.length > 0 
          ? producto.stocks[0].cantidad 
          : undefined
      }));
      
      console.log(`[API Productos] Encontrados ${productosTransformados.length} productos totales`);
      return NextResponse.json(productosTransformados);
    }
    
  } catch (error: any) {
    console.error('Error al obtener productos:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

// 🆕 NUEVA API ESPECÍFICA PARA FÁBRICA
// src/app/api/fabrica/productos/route.ts
export async function getFabricaProductos(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const categoriaId = searchParams.get('categoriaId');
    const limit = parseInt(searchParams.get('limit') || '1000');
    
    const user = (req as any).user;
    
    // 🔧 DETERMINAR ID DE FÁBRICA
    let fabricaId = 'ubicacion-fabrica'; // ID por defecto
    
    // Si el usuario tiene una sucursal asignada y es de tipo fábrica, usarla
    if (user.sucursalId) {
      const sucursalUsuario = await prisma.ubicacion.findUnique({
        where: { id: user.sucursalId }
      });
      
      if (sucursalUsuario && sucursalUsuario.tipo === 'fabrica') {
        fabricaId = user.sucursalId;
      }
    }
    
    console.log(`[API Fábrica Productos] Obteniendo productos para fábrica: ${fabricaId}`);
    
    // Construir filtros
    const whereCondition: any = {
      activo: true // Solo productos activos por defecto
    };
    
    if (categoriaId) {
      whereCondition.categoriaId = categoriaId;
    }
    
    if (search) {
      whereCondition.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    // 🔧 OBTENER TODOS LOS PRODUCTOS CON SU STOCK EN FÁBRICA
    const productos = await prisma.producto.findMany({
      where: whereCondition,
      include: {
        categoria: true,
        stocks: {
          where: { ubicacionId: fabricaId },
          select: { cantidad: true }
        }
      },
      take: limit,
      orderBy: [
        { categoria: { nombre: 'asc' } },
        { nombre: 'asc' }
      ]
    });
    
    // Transformar datos para incluir stock
    const productosConStock = productos.map(producto => ({
      id: producto.id,
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio,
      codigoBarras: producto.codigoBarras,
      imagen: producto.imagen,
      categoriaId: producto.categoriaId,
      categoria: producto.categoria,
      stockMinimo: producto.stockMinimo,
      activo: producto.activo,
      stock: producto.stocks && producto.stocks.length > 0 ? producto.stocks[0].cantidad : 0
    }));
    
    console.log(`[API Fábrica Productos] Encontrados ${productosConStock.length} productos`);
    
    return NextResponse.json(productosConStock);
    
  } catch (error: any) {
    console.error('Error al obtener productos de fábrica:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos de fábrica' },
      { status: 500 }
    );
  }
}