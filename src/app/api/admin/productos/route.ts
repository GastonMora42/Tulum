// src/app/api/admin/productos/route.ts - VERSIÓN CORREGIDA CON PAGINACIÓN
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para crear producto
const createProductoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().nullable(),
  precio: z.number().positive({ message: 'El precio debe ser positivo' }),
  codigoBarras: z.string().nullable(),
  imagen: z.string().nullable(),
  categoriaId: z.string().min(1, { message: 'Debe seleccionar una categoría' }),
  stockMinimo: z.number().int().nonnegative({ message: 'El stock mínimo debe ser un número positivo o cero' }),
  activo: z.boolean().default(true)
});

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // 🔧 CORRECCIÓN: Parámetros de paginación corregidos
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20'); // Aumentar límite por defecto
    const conStock = searchParams.get('conStock') === 'true';
    const categoriaId = searchParams.get('categoriaId');
    const ubicacionId = searchParams.get('ubicacionId');
    const soloActivos = searchParams.get('soloActivos') !== 'false'; // Por defecto true
    const search = searchParams.get('search');
    
    const user = (req as any).user;
    
    console.log(`[API Productos] Consultando página ${page}, límite ${limit}`);
    console.log(`[API Productos] Filtros:`, {
      conStock,
      categoriaId,
      ubicacionId,
      soloActivos,
      search,
      userRole: user.roleId
    });
    
    // 🔧 CORRECCIÓN: Construir condición WHERE más robusta
    const whereCondition: any = {};
    
    // Filtro por estado activo
    if (soloActivos) {
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
    
    // 🔧 CORRECCIÓN: Calcular offset para paginación
    const offset = (page - 1) * limit;
    
    if (conStock && ubicacionId) {
      // Consulta para productos con stock específico
      console.log(`[API Productos] Consultando productos con stock en ubicación ${ubicacionId}`);
      
      // Primero contar el total
      const totalStockQuery = await prisma.stock.count({
        where: {
          ubicacionId,
          productoId: { not: null },
          producto: whereCondition
        }
      });
      
      // Luego obtener los productos paginados
      const productosConStock = await prisma.stock.findMany({
        where: {
          ubicacionId,
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
        skip: offset,
        take: limit,
        orderBy: [
          { producto: { nombre: 'asc' } }
        ]
      });
      
      // Transformar datos
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
      
      console.log(`[API Productos] Devolviendo ${productos.length} productos con stock de ${totalStockQuery} total`);
      
      return NextResponse.json({
        data: productos,
        pagination: {
          page,
          limit,
          total: totalStockQuery,
          totalPages: Math.ceil(totalStockQuery / limit),
          hasNextPage: page * limit < totalStockQuery,
          hasPrevPage: page > 1
        }
      });
      
    } else {
      // 🔧 CORRECCIÓN: Consulta normal con paginación real
      console.log(`[API Productos] Consultando todos los productos con paginación`);
      
      // Contar total
      const total = await prisma.producto.count({
        where: whereCondition
      });
      
      // Obtener productos paginados
      const productos = await prisma.producto.findMany({
        where: whereCondition,
        include: {
          categoria: true,
          // Incluir stock si se especifica ubicación
          ...(ubicacionId ? {
            stocks: {
              where: { ubicacionId },
              select: { cantidad: true }
            }
          } : {})
        },
        skip: offset,
        take: limit,
        orderBy: [
          { nombre: 'asc' }
        ]
      });
      
      // Transformar datos incluyendo stock si está disponible
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
        // Incluir stock si está disponible
        stock: ubicacionId && producto.stocks && producto.stocks.length > 0 
          ? producto.stocks[0].cantidad 
          : undefined
      }));
      
      const totalPages = Math.ceil(total / limit);
      
      console.log(`[API Productos] Devolviendo ${productosTransformados.length} productos de ${total} total, página ${page}/${totalPages}`);
      
      return NextResponse.json({
        data: productosTransformados,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1,
          startIndex: offset + 1,
          endIndex: Math.min(offset + limit, total)
        }
      });
    }
    
  } catch (error: any) {
    console.error('❌ [API Productos] Error al obtener productos:', error);
    return NextResponse.json(
      { 
        error: error.message || 'Error al obtener productos',
        data: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNextPage: false,
          hasPrevPage: false
        }
      },
      { status: 500 }
    );
  }
}

// 🆕 MÉTODO POST PARA CREAR PRODUCTOS (mantener igual)
export async function POST(req: NextRequest) {
  console.log('🆕 [API] Iniciando creación de producto...');
  
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('producto:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    console.log('📝 [API] Datos recibidos:', body);
    
    // Validar datos de entrada
    const validation = createProductoSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ [API] Datos inválidos:', validation.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe un producto con el mismo código de barras
    if (validation.data.codigoBarras) {
      const existingProducto = await prisma.producto.findFirst({
        where: { codigoBarras: validation.data.codigoBarras }
      });
      
      if (existingProducto) {
        return NextResponse.json(
          { error: 'Ya existe un producto con este código de barras' },
          { status: 400 }
        );
      }
    }
    
    // Verificar que la categoría existe
    const categoria = await prisma.categoria.findUnique({
      where: { id: validation.data.categoriaId }
    });
    
    if (!categoria) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 400 }
      );
    }
    
    // Crear producto
    const producto = await prisma.producto.create({
      data: {
        nombre: validation.data.nombre,
        descripcion: validation.data.descripcion,
        precio: validation.data.precio,
        codigoBarras: validation.data.codigoBarras,
        imagen: validation.data.imagen,
        categoriaId: validation.data.categoriaId,
        stockMinimo: validation.data.stockMinimo,
        activo: validation.data.activo
      },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    console.log('✅ [API] Producto creado exitosamente:', producto.id);
    
    return NextResponse.json(producto, { status: 201 });
  } catch (error: any) {
    console.error('❌ [API] Error al crear producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear producto' },
      { status: 500 }
    );
  }
}