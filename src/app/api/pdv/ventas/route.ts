// src/app/api/pdv/ventas/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { ventaService } from '@/server/services/venta/ventaService';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('venta:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    
    // Parámetros
    const sucursalId = searchParams.get('sucursalId');
    const desde = searchParams.get('desde') ? new Date(searchParams.get('desde') as string) : undefined;
    const hasta = searchParams.get('hasta') ? new Date(searchParams.get('hasta') as string) : undefined;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // Si hay fechas, ajustar hora
    if (hasta) {
      hasta.setHours(23, 59, 59, 999);
    }
    
    // Obtener ventas
    const ventas = await ventaService.getVentas({
      sucursalId,
      desde,
      hasta
    });
    
    return NextResponse.json(ventas);
  } catch (error: any) {
    console.error('Error al obtener ventas:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener ventas' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('venta:crear')(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    
    // Validar datos mínimos requeridos
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json(
        { error: 'Se requieren items para la venta' },
        { status: 400 }
      );
    }
    
    if (!body.total || typeof body.total !== 'number' || body.total <= 0) {
      return NextResponse.json(
        { error: 'Se requiere un total válido para la venta' },
        { status: 400 }
      );
    }
    
    if (!body.metodoPago) {
      return NextResponse.json(
        { error: 'Se requiere un método de pago' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    const sucursalId = user.sucursalId || localStorage.getItem('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'No se ha configurado la sucursal para este usuario' },
        { status: 400 }
      );
    }
    
    // Crear pagos
    const pagos = [{
      medioPago: body.metodoPago,
      monto: body.total,
      referencia: body.referencia || null,
      datosPago: body.datosPago || null
    }];
    
    // Crear venta
    const venta = await ventaService.crearVenta({
      sucursalId,
      usuarioId: user.id,
      items: body.items,
      total: body.total,
      descuento: body.descuento || 0,
      codigoDescuento: body.codigoDescuento,
      facturar: body.facturar || false,
      clienteNombre: body.clienteNombre,
      clienteCuit: body.clienteCuit,
      pagos
    });
    
    return NextResponse.json(venta, { status: 201 });
  } catch (error: any) {
    console.error('Error al crear venta:', error);
    return NextResponse.json(
      { error: error.message || 'Error al crear venta' },
      { status: 500 }
    );
  }
}