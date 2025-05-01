// src/app/api/pdv/cierre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

// GET - Obtener estado actual de caja
export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Obtener caja abierta actualmente
    const cierreCaja = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        estado: 'abierto'
      }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { message: 'No hay caja abierta actualmente' },
        { status: 404 }
      );
    }
    
    // Obtener ventas para este periodo
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
    
    // Calcular totales
    const totalVentas = ventas.reduce((sum, venta) => sum + venta.total, 0);
    
    // Agrupar por método de pago
    const pagosPorMetodo = new Map<string, { monto: number; cantidad: number }>();
    
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        const current = pagosPorMetodo.get(pago.medioPago) || { monto: 0, cantidad: 0 };
        
        pagosPorMetodo.set(pago.medioPago, {
          monto: current.monto + pago.monto,
          cantidad: current.cantidad + 1
        });
      });
    });
    
    // Convertir a array
    const detallesPorMedioPago = Array.from(pagosPorMetodo.entries()).map(([medioPago, datos]) => ({
      medioPago,
      monto: datos.monto,
      cantidad: datos.cantidad
    }));
    
    return NextResponse.json({
      cierreCaja,
      ventasResumen: {
        total: totalVentas,
        cantidadVentas: ventas.length,
        detallesPorMedioPago
      }
    });
  } catch (error: any) {
    console.error('Error al obtener cierre de caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener cierre de caja' },
      { status: 500 }
    );
  }
}

// POST - Abrir nueva caja
export async function POST(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    const body = await req.json();
    const { sucursalId, montoInicial } = body;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    if (montoInicial === undefined || montoInicial < 0) {
      return NextResponse.json(
        { error: 'Se requiere un monto inicial válido' },
        { status: 400 }
      );
    }
    
    // Verificar si ya existe una caja abierta
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
    
    // Crear nueva caja
    const cierreCaja = await prisma.cierreCaja.create({
      data: {
        sucursalId,
        fechaApertura: new Date(),
        usuarioApertura: user.id,
        montoInicial,
        estado: 'abierto'
      }
    });
    
    return NextResponse.json(cierreCaja, { status: 201 });
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
  // Aplicar middleware de autenticación
  const authResponse = await authMiddleware(req);
  if (authResponse) return authResponse;
  
  // Verificar permiso
  const permissionResponse = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionResponse) return permissionResponse;
  
  try {
    const body = await req.json();
    const { id, montoFinal, observaciones } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID del cierre de caja' },
        { status: 400 }
      );
    }
    
    if (montoFinal === undefined) {
      return NextResponse.json(
        { error: 'Se requiere el monto final de caja' },
        { status: 400 }
      );
    }
    
    // Obtener la caja
    const cierreCaja = await prisma.cierreCaja.findUnique({
      where: { id }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { error: 'Cierre de caja no encontrado' },
        { status: 404 }
      );
    }
    
    if (cierreCaja.estado !== 'abierto') {
      return NextResponse.json(
        { error: 'No se puede cerrar una caja que no está abierta' },
        { status: 400 }
      );
    }
    
    // Obtener ventas de esta caja
    const ventas = await prisma.venta.findMany({
      where: {
        sucursalId: cierreCaja.sucursalId,
        fecha: {
          gte: cierreCaja.fechaApertura,
          lte: new Date()
        }
      },
      include: {
        pagos: true
      }
    });
    
    // Calcular pagos en efectivo
    let efectivoTotal = 0;
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        if (pago.medioPago === 'efectivo') {
          efectivoTotal += pago.monto;
        }
      });
    });
    
    // Calcular efectivo esperado
    const montoEsperado = cierreCaja.montoInicial + efectivoTotal;
    const diferencia = montoFinal - montoEsperado;
    
    // Obtener usuario
    const user = (req as any).user;
    
    // Verificar si hay diferencia significativa
    const hayDiferencia = Math.abs(diferencia) > 1; // Más de 1 unidad de moneda
    
    // Actualizar caja
    const cierreCajaActualizado = await prisma.cierreCaja.update({
      where: { id },
      data: {
        fechaCierre: new Date(),
        usuarioCierre: user.id,
        montoFinal,
        diferencia,
        estado: hayDiferencia ? 'con_contingencia' : 'cerrado',
        observaciones
      }
    });
    
    // Si hay diferencia significativa, crear contingencia
    if (hayDiferencia) {
      await prisma.contingencia.create({
        data: {
          titulo: `Diferencia en cierre de caja #${id}`,
          descripcion: `Se detectó una diferencia de ${diferencia > 0 ? 'sobrante' : 'faltante'} de ${Math.abs(diferencia)} en el cierre de caja.`,
          origen: 'sucursal',
          creadoPor: user.id,
          estado: 'pendiente'
        }
      });
    }
    
    return NextResponse.json({
      cierreCaja: cierreCajaActualizado,
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