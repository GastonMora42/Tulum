// src/app/api/fabrica/productos/route.ts - NUEVA API ESPECÍFICA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const categoriaId = searchParams.get('categoriaId');
    const limit = parseInt(searchParams.get('limit') || '1000');
    const conStock = searchParams.get('conStock') === 'true';
    
    const user = (req as any).user;
    
    // 🔧 DETERMINAR ID DE FÁBRICA DE MANERA ROBUSTA
    let fabricaId = 'ubicacion-fabrica'; // ID por defecto
    
    if (user.sucursalId) {
      const sucursalUsuario = await prisma.ubicacion.findUnique({
        where: { id: user.sucursalId }
      });
      
      if (sucursalUsuario && sucursalUsuario.tipo === 'fabrica') {
        fabricaId = user.sucursalId;
      }
    }
    
    console.log(`[API Fábrica Productos] Obteniendo productos para fábrica: ${fabricaId}`);
    console.log(`[API Fábrica Productos] Parámetros: search=${search}, categoriaId=${categoriaId}, conStock=${conStock}`);
    
    // Construir filtros para productos
    const whereCondition: any = {
      activo: true // Solo productos activos
    };
    
    if (categoriaId && categoriaId !== 'all') {
      whereCondition.categoriaId = categoriaId;
    }
    
    if (search) {
      whereCondition.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { descripcion: { contains: search, mode: 'insensitive' } },
        { codigoBarras: { contains: search, mode: 'insensitive' } }
      ];
    }
    
    if (conStock) {
      // 🔧 OPCIÓN 1: Solo productos que tienen stock > 0
      const productosConStock = await prisma.stock.findMany({
        where: {
          ubicacionId: fabricaId,
          cantidad: { gt: 0 },
          productoId: { not: null },
          producto: whereCondition
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
          { producto: { categoria: { nombre: 'asc' } } },
          { producto: { nombre: 'asc' } }
        ]
      });
      
      const productos = productosConStock
        .filter(stock => stock.producto)
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
          stock: stock.cantidad
        }));
      
      console.log(`[API Fábrica Productos] Encontrados ${productos.length} productos con stock > 0`);
      return NextResponse.json(productos);
      
    } else {
      // 🔧 OPCIÓN 2: Todos los productos con información de stock
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
      
      console.log(`[API Fábrica Productos] Encontrados ${productosConStock.length} productos totales`);
      return NextResponse.json(productosConStock);
    }
    
  } catch (error: any) {
    console.error('Error al obtener productos de fábrica:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener productos de fábrica' },
      { status: 500 }
    );
  }
}

// 🆕 ENDPOINT PARA OBTENER CATEGORÍAS DE PRODUCTOS EN FÁBRICA
export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    const { action } = body;
    
    if (action === 'getCategorias') {
      const categorias = await prisma.categoria.findMany({
        include: {
          _count: {
            select: {
              productos: {
                where: { activo: true }
              }
            }
          }
        },
        orderBy: { nombre: 'asc' }
      });
      
      const categoriasConProductos = categorias
        .filter(cat => cat._count.productos > 0)
        .map(cat => ({
          id: cat.id,
          nombre: cat.nombre,
          imagen: cat.imagen,
          productCount: cat._count.productos
        }));
      
      return NextResponse.json(categoriasConProductos);
    }
    
    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    
  } catch (error: any) {
    console.error('Error en POST /api/fabrica/productos:', error);
    return NextResponse.json(
      { error: error.message || 'Error en la operación' },
      { status: 500 }
    );
  }
}