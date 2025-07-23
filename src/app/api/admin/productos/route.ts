// src/app/api/admin/productos/route.ts - AGREGAR MÉTODO POST
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

// 🆕 MÉTODO POST PARA CREAR PRODUCTOS
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