import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

// GET - Obtener caja abierta para sucursal
export async function GET(req: NextRequest) {
  // Autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permError = await checkPermission(['caja:ver', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Buscar caja abierta para la sucursal
    const cierreCaja = await prisma.cierreCaja.findFirst({
      where: { 
        sucursalId, 
        estado: 'abierto' 
      }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { error: 'No hay una caja abierta para esta sucursal' },
        { status: 404 }
      );
    }
    
    // Obtener ventas realizadas en esta caja
    const ventas = await prisma.venta.findMany({
      where: {
        sucursalId,
        fecha: {
          gte: cierreCaja.fechaApertura
        }
      },
      include: {
        pagos: true
      }
    });
    
    // Calcular totales por método de pago
    let totalVentas = 0;
    let ventasEfectivo = 0;
    let ventasDigital = 0;
    
    const detallesPorMedioPago: any[] = [];
    const medioPagos = new Map();
    
    for (const venta of ventas) {
      totalVentas += venta.total;
      
      for (const pago of venta.pagos) {
        const entry = medioPagos.get(pago.medioPago) || { medioPago: pago.medioPago, monto: 0, cantidad: 0 };
        entry.monto += pago.monto;
        entry.cantidad += 1;
        medioPagos.set(pago.medioPago, entry);
        
        if (pago.medioPago === 'efectivo') {
          ventasEfectivo += pago.monto;
        } else {
          ventasDigital += pago.monto;
        }
      }
    }
    
    medioPagos.forEach(entry => {
      detallesPorMedioPago.push(entry);
    });
    
    // Resumir datos
    const ventasResumen = {
      total: totalVentas,
      cantidadVentas: ventas.length,
      ventasEfectivo,
      ventasDigital,
      detallesPorMedioPago,
      efectivoEsperado: cierreCaja.montoInicial + ventasEfectivo
    };
    
    return NextResponse.json({
      cierreCaja,
      ventasResumen,
      abierto: true
    });
  } catch (error: any) {
    console.error('Error al obtener cierre de caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener cierre de caja' },
      { status: 500 }
    );
  }
}

// POST - Crear nueva apertura de caja
export async function POST(req: NextRequest) {
  // Autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { sucursalId, montoInicial } = body;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    if (montoInicial === undefined) {
      return NextResponse.json(
        { error: 'Se requiere el monto inicial' },
        { status: 400 }
      );
    }
    
    // Verificar que no haya otra caja abierta
    const cajaAbierta = await prisma.cierreCaja.findFirst({
      where: { 
        sucursalId, 
        estado: 'abierto'
      }
    });
    
    if (cajaAbierta) {
      return NextResponse.json(
        { error: 'Ya hay una caja abierta para esta sucursal' },
        { status: 400 }
      );
    }
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Crear nueva apertura
    const cierreCaja = await prisma.cierreCaja.create({
      data: {
        sucursalId,
        montoInicial,
        usuarioApertura: user.id,
        estado: 'abierto'
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Caja abierta correctamente',
      cierreCaja
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al abrir caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al abrir caja' },
      { status: 500 }
    );
  }
}

// PATCH - Cerrar caja
export async function PATCH(req: NextRequest) {
  // Autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { id, montoFinal, observaciones } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la caja a cerrar' },
        { status: 400 }
      );
    }
    
    if (montoFinal === undefined) {
      return NextResponse.json(
        { error: 'Se requiere el monto final' },
        { status: 400 }
      );
    }
    
    // Verificar que la caja existe y está abierta
    const cierreCaja = await prisma.cierreCaja.findUnique({
      where: { id }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { error: 'Caja no encontrada' },
        { status: 404 }
      );
    }
    
    if (cierreCaja.estado !== 'abierto') {
      return NextResponse.json(
        { error: 'La caja no está abierta' },
        { status: 400 }
      );
    }
    
    // Obtener ventas para calcular la diferencia
    const ventas = await prisma.venta.findMany({
      where: {
        sucursalId: cierreCaja.sucursalId,
        fecha: {
          gte: cierreCaja.fechaApertura
        }
      },
      include: {
        pagos: true
      }
    });
    
    // Calcular efectivo esperado
    let ventasEfectivo = 0;
    for (const venta of ventas) {
      for (const pago of venta.pagos) {
        if (pago.medioPago === 'efectivo') {
          ventasEfectivo += pago.monto;
        }
      }
    }
    
    const efectivoEsperado = cierreCaja.montoInicial + ventasEfectivo;
    const diferencia = montoFinal - efectivoEsperado;
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Cerrar caja
    const cierreCajaUpdate = await prisma.cierreCaja.update({
      where: { id },
      data: {
        montoFinal,
        diferencia,
        fechaCierre: new Date(),
        usuarioCierre: user.id,
        estado: 'cerrado',
        observaciones
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Caja cerrada correctamente',
      cierreCaja: cierreCajaUpdate,
      diferencia
    });
  } catch (error: any) {
    console.error('Error al cerrar caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cerrar caja' },
      { status: 500 }
    );
  }
}