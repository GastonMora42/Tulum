// src/app/api/pdv/ventas/sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { ventaService } from '@/server/services/venta/ventaService';

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const body = await req.json();
    
    // Validar datos mínimos
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'La venta debe contener al menos un ítem' },
        { status: 400 }
      );
    }
    
    // Recuperar usuario e información adicional
    const user = (req as any).user;
    const sucursalId = body.sucursalId || user.sucursalId;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'No se ha definido una sucursal para la venta' },
        { status: 400 }
      );
    }
    
    // Verificar si los productos existen y tienen stock
    const productIds = body.items.map((item: any) => item.productoId);
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productIds }
      }
    });
    
    // Verificar que todos los productos existen
    if (productos.length !== productIds.length) {
      return NextResponse.json(
        { error: 'Uno o más productos no existen en el sistema' },
        { status: 400 }
      );
    }
    
    // Construir pagos si no se proporcionaron
    const pagos = body.pagos || [{
      medioPago: 'efectivo',
      monto: body.total
    }];
    
    // Crear la venta
    const venta = await ventaService.crearVenta({
      sucursalId,
      usuarioId: user.id,
      items: body.items,
      total: body.total,
      descuento: body.descuento || 0,
      codigoDescuento: body.codigoDescuento,
      facturar: false, // No facturamos ventas offline
      pagos
    });
    
    return NextResponse.json({
      success: true,
      venta,
      message: 'Venta sincronizada correctamente'
    });
  } catch (error: any) {
    console.error('Error al sincronizar venta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al sincronizar venta' },
      { status: 500 }
    );
  }
}