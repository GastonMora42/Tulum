// src/app/api/admin/productos/[id]/route.ts - CORREGIR GET
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { z } from 'zod';

// Esquema de validación para actualizar producto
const updateProductoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }).optional(),
  descripcion: z.string().nullable().optional(),
  precio: z.number().positive({ message: 'El precio debe ser positivo' }).optional(),
  codigoBarras: z.string().nullable().optional(),
  imagen: z.string().nullable().optional(),
  categoriaId: z.string().optional(),
  stockMinimo: z.number().int().nonnegative().optional(),
  activo: z.boolean().optional()
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;

    console.log(`🔍 [API] Buscando producto con ID: ${productId}`);

    if (!productId || productId === 'undefined') {
      return NextResponse.json(
        { error: 'ID de producto no válido' },
        { status: 400 }
      );
    }

    const producto = await prisma.producto.findUnique({
      where: { id: productId },
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    if (!producto) {
      console.log(`❌ [API] Producto no encontrado: ${productId}`);
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    
    console.log(`✅ [API] Producto encontrado: ${producto.nombre}`);
    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('❌ [API] Error al obtener producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener producto' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('producto:editar')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;
    const body = await req.json();
    
    console.log(`💾 [API] Actualizando producto ${productId} con:`, body);
    
    // Validar datos de entrada
    const validation = updateProductoSchema.safeParse(body);
    if (!validation.success) {
      console.error('❌ [API] Datos inválidos:', validation.error.errors);
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: validation.error.errors },
        { status: 400 }
      );
    }
    
    // Verificar si el producto existe
    const existingProducto = await prisma.producto.findUnique({
      where: { id: productId }
    });
    
    if (!existingProducto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar código de barras único si se está actualizando
    if (validation.data.codigoBarras && validation.data.codigoBarras !== existingProducto.codigoBarras) {
      const productoConMismoCodigo = await prisma.producto.findFirst({
        where: { 
          codigoBarras: validation.data.codigoBarras,
          id: { not: productId }
        }
      });
      
      if (productoConMismoCodigo) {
        return NextResponse.json(
          { error: 'Ya existe otro producto con este código de barras' },
          { status: 400 }
        );
      }
    }
    
    // Actualizar producto
    const producto = await prisma.producto.update({
      where: { id: productId },
      data: validation.data,
      include: {
        categoria: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    console.log(`✅ [API] Producto actualizado: ${producto.nombre}`);
    return NextResponse.json(producto);
  } catch (error: any) {
    console.error('❌ [API] Error al actualizar producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('producto:eliminar')(req);
  if (permissionError) return permissionError;
  
  try {
    const resolvedParams = await params;
    const productId = resolvedParams.id;
    
    // Verificar si el producto existe
    const existingProducto = await prisma.producto.findUnique({
      where: { id: productId }
    });
    
    if (!existingProducto) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      );
    }
    
    // En lugar de eliminar, marcar como inactivo
    const producto = await prisma.producto.update({
      where: { id: productId },
      data: { activo: false }
    });
    
    return NextResponse.json({ 
      message: 'Producto desactivado correctamente',
      producto 
    });
  } catch (error: any) {
    console.error('Error al eliminar producto:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar producto' },
      { status: 500 }
    );
  }
}