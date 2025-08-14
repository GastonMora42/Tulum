// src/app/api/admin/productos/route.ts - VERSIÓN SEGURA QUE PRESERVA CÓDIGOS EXISTENTES
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { barcodeService } from '@/server/services/producto/barcodeService';
import { z } from 'zod';

// Esquema de validación actualizado con sucursales
const createProductoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().nullable(),
  precio: z.number().positive({ message: 'El precio debe ser positivo' }),
  codigoBarras: z.string().nullable().optional(),
  imagen: z.string().nullable(),
  categoriaId: z.string().min(1, { message: 'Debe seleccionar una categoría' }),
  stockMinimo: z.number().int().nonnegative({ message: 'El stock mínimo debe ser un número positivo o cero' }),
  activo: z.boolean().default(true),
  generarCodigoAutomatico: z.boolean().optional().default(false),
  
  // 🆕 NUEVOS CAMPOS PARA CONFIGURACIÓN AUTOMÁTICA
  crearConfiguracionStock: z.boolean().optional().default(true),
  sucursalesConfig: z.array(z.object({
    sucursalId: z.string(),
    stockMaximo: z.number().int().nonnegative().default(10),
    puntoReposicion: z.number().int().nonnegative().optional()
  })).optional()
});

export async function GET(req: NextRequest) {
  // ... código GET mantiene sin cambios ...
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const conStock = searchParams.get('conStock') === 'true';
    const categoriaId = searchParams.get('categoriaId');
    const ubicacionId = searchParams.get('ubicacionId');
    const soloActivos = searchParams.get('soloActivos') !== 'false';
    const search = searchParams.get('search');
    
    console.log(`[API Productos] Consultando página ${page}, límite ${limit}`);
    
    const whereCondition: any = {};
    
    if (soloActivos) {
      whereCondition.activo = true;
    }
    
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
    
    const offset = (page - 1) * limit;
    
    if (conStock && ubicacionId) {
      const totalStockQuery = await prisma.stock.count({
        where: {
          ubicacionId,
          productoId: { not: null },
          producto: whereCondition
        }
      });
      
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
      const total = await prisma.producto.count({
        where: whereCondition
      });
      
      const productos = await prisma.producto.findMany({
        where: whereCondition,
        include: {
          categoria: true,
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
        stock: ubicacionId && producto.stocks && producto.stocks.length > 0 
          ? producto.stocks[0].cantidad 
          : undefined
      }));
      
      const totalPages = Math.ceil(total / limit);
      
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




export async function POST(req: NextRequest) {
  console.log('🆕 [API] Iniciando creación de producto con configuración automática...');
  
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission('producto:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    console.log('📝 [API] Datos recibidos:', body);
    
    const validation = createProductoSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ [API] Datos inválidos:', validation.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // 🔒 GENERACIÓN SEGURA DE CÓDIGO DE BARRAS (mantener igual)
    let codigoBarras = validation.data.codigoBarras;
    
    if (validation.data.generarCodigoAutomatico && !codigoBarras) {
      console.log('🔄 [API] Generando código compatible...');
      try {
        codigoBarras = await barcodeService.generateBarcodeForNewProduct();
        console.log(`✅ [API] Código generado: ${codigoBarras}`);
      } catch (barcodeError) {
        console.error('❌ [API] Error al generar código:', barcodeError);
        return NextResponse.json(
          { error: `Error al generar código de barras: ${barcodeError}` },
          { status: 500 }
        );
      }
    }
    
    // 🔒 VERIFICAR CÓDIGO ÚNICO (mantener igual)
    if (codigoBarras) {
      const isValid = barcodeService.validateBarcode(codigoBarras);
      if (!isValid) {
        return NextResponse.json(
          { error: 'El formato del código de barras no es válido' },
          { status: 400 }
        );
      }
      
      const existingProducto = await prisma.producto.findFirst({
        where: { codigoBarras: codigoBarras }
      });
      
      if (existingProducto) {
        return NextResponse.json(
          { error: `Ya existe un producto con el código de barras: ${codigoBarras}` },
          { status: 400 }
        );
      }
    }
    
    // Verificar categoría (mantener igual)
    const categoria = await prisma.categoria.findUnique({
      where: { id: validation.data.categoriaId }
    });
    
    if (!categoria) {
      return NextResponse.json(
        { error: 'La categoría seleccionada no existe' },
        { status: 400 }
      );
    }
    
    // 🔒 CREAR PRODUCTO (mantener igual)
    const producto = await prisma.producto.create({
      data: {
        nombre: validation.data.nombre,
        descripcion: validation.data.descripcion,
        precio: validation.data.precio,
        codigoBarras: codigoBarras,
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
    
    // 🆕 CREAR CONFIGURACIONES DE STOCK AUTOMÁTICAMENTE
    let configuracionesCreadas = 0;
    
    if (validation.data.crearConfiguracionStock) {
      console.log('⚙️ [API] Creando configuraciones de stock automáticas...');
      
      const user = (req as any).user;
      let sucursalesParaConfig = validation.data.sucursalesConfig || [];
      
      // Si no se especificaron sucursales, obtener todas las activas
      if (sucursalesParaConfig.length === 0) {
        console.log('🏢 [API] No se especificaron sucursales, obteniendo todas las activas...');
        
        const sucursalesActivas = await prisma.ubicacion.findMany({
          where: { 
            tipo: 'sucursal',
            activo: true 
          },
          select: { id: true, nombre: true }
        });
        
        // Configuración por defecto inteligente
        const stockMaximoPorDefecto = Math.max(validation.data.stockMinimo * 5, 10);
        
        sucursalesParaConfig = sucursalesActivas.map(sucursal => ({
          sucursalId: sucursal.id,
          stockMaximo: stockMaximoPorDefecto,
          puntoReposicion: Math.ceil(stockMaximoPorDefecto * 0.3)
        }));
        
        console.log(`📋 [API] Configurando para ${sucursalesParaConfig.length} sucursales activas`);
      }
      
      // Crear configuraciones para cada sucursal
      for (const configSucursal of sucursalesParaConfig) {
        try {
          const stockMaximo = configSucursal.stockMaximo;
          const stockMinimo = validation.data.stockMinimo;
          const puntoReposicion = configSucursal.puntoReposicion || Math.ceil(stockMaximo * 0.3);
          
          await prisma.stockConfigSucursal.create({
            data: {
              productoId: producto.id,
              sucursalId: configSucursal.sucursalId,
              stockMaximo,
              stockMinimo,
              puntoReposicion,
              creadoPor: user.id,
              activo: true
            }
          });
          
          configuracionesCreadas++;
          
        } catch (configError) {
          console.error(`⚠️ [API] Error creando configuración para sucursal ${configSucursal.sucursalId}:`, configError);
          // No fallar por errores individuales de configuración
        }
      }
      
      console.log(`✅ [API] ${configuracionesCreadas} configuraciones de stock creadas`);
    }
    
    // 🆕 RESPUESTA MEJORADA CON INFO DE CONFIGURACIONES
    const response = {
      ...producto,
      metadata: {
        codigoGenerado: !!validation.data.generarCodigoAutomatico && !!codigoBarras,
        configuracionesStock: configuracionesCreadas,
        visibleEnStockSucursales: configuracionesCreadas > 0
      }
    };
    
    console.log('🎉 [API] Producto creado con configuraciones:', {
      productoId: producto.id,
      nombre: producto.nombre,
      configuraciones: configuracionesCreadas,
      codigoBarras: !!codigoBarras
    });
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error: any) {
    console.error('❌ [API] Error al crear producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear producto' },
      { status: 500 }
    );
  }
}