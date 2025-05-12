// src/app/api/pdv/cierre/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { format } from 'date-fns';

// GET - Obtener estado actual de caja
export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para acceder a esta sucursal' },
        { status: 403 }
      );
    }
    
    // Obtener caja abierta actualmente
    const cierreCaja = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        estado: 'abierto'
      },
      orderBy: {
        fechaApertura: 'desc'
      }
    });
    
    if (!cierreCaja) {
      return NextResponse.json({
        abierto: false,
        message: 'No hay caja abierta actualmente'
      });
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
    
    // Obtener egresos para este periodo
    const egresos = await prisma.cajaEgreso.findMany({
      where: {
        cierreCajaId: cierreCaja.id
      }
    });
    
    // Calcular totales por método de pago
    const totalPorMedioPago = new Map<string, { monto: number; cantidad: number }>();
    
    // Inicializar con los medios de pago más comunes
    totalPorMedioPago.set('efectivo', { monto: 0, cantidad: 0 });
    totalPorMedioPago.set('tarjeta_credito', { monto: 0, cantidad: 0 });
    totalPorMedioPago.set('tarjeta_debito', { monto: 0, cantidad: 0 });
    totalPorMedioPago.set('transferencia', { monto: 0, cantidad: 0 });
    totalPorMedioPago.set('qr', { monto: 0, cantidad: 0 });
    
    // Sumar pagos por método
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        const current = totalPorMedioPago.get(pago.medioPago) || { monto: 0, cantidad: 0 };
        
        totalPorMedioPago.set(pago.medioPago, {
          monto: current.monto + pago.monto,
          cantidad: current.cantidad + 1
        });
      });
    });
    
    // Calcular total de egresos
    const totalEgresos = egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    
    // Calcular efectivo en caja
    const efectivoEntradas = totalPorMedioPago.get('efectivo')?.monto || 0;
    const efectivoEsperado = cierreCaja.montoInicial + efectivoEntradas - totalEgresos;
    
    // Resumen para cada método de pago
    const detallesPorMedioPago = Array.from(totalPorMedioPago.entries()).map(([medioPago, datos]) => ({
      medioPago,
      monto: datos.monto,
      cantidad: datos.cantidad
    }));
    
    return NextResponse.json({
      cierreCaja: {
        id: cierreCaja.id,
        fechaApertura: cierreCaja.fechaApertura,
        montoInicial: cierreCaja.montoInicial,
        usuarioApertura: cierreCaja.usuarioApertura
      },
      ventasResumen: {
        cantidad: ventas.length,
        total: ventas.reduce((sum, venta) => sum + venta.total, 0),
        detallesPorMedioPago
      },
      egresosResumen: {
        cantidad: egresos.length,
        total: totalEgresos
      },
      efectivoEsperado,
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

// POST - Abrir nueva caja
export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const { sucursalId, montoInicial } = body;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para abrir caja en esta sucursal' },
        { status: 403 }
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
    
    // Registrar log de actividad
    console.log(`[CAJA] Usuario ${user.name} abrió caja en sucursal ${sucursalId} con monto ${montoInicial}`);
    
    return NextResponse.json({
      id: cierreCaja.id,
      fechaApertura: cierreCaja.fechaApertura,
      montoInicial: cierreCaja.montoInicial,
      estado: cierreCaja.estado,
      message: 'Caja abierta correctamente'
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
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['venta:crear', 'admin'])(req);
  if (permissionError) return permissionError;
  
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
      where: { id },
      include: {
        sucursal: true
      }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { error: 'Cierre de caja no encontrado' },
        { status: 404 }
      );
    }
    
    // Verificar acceso a la sucursal
    const user = (req as any).user;
    if (user.sucursalId && user.sucursalId !== cierreCaja.sucursalId && user.roleId !== 'role-admin') {
      return NextResponse.json(
        { error: 'No tiene permisos para cerrar caja en esta sucursal' },
        { status: 403 }
      );
    }
    
    if (cierreCaja.estado !== 'abierto') {
      return NextResponse.json(
        { error: 'No se puede cerrar una caja que no está abierta' },
        { status: 400 }
      );
    }
    
    // Calcular pagos en efectivo y egresos
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
    
    const egresos = await prisma.cajaEgreso.findMany({
      where: {
        cierreCajaId: cierreCaja.id
      }
    });
    
    // Calcular efectivo
    let efectivoTotal = 0;
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        if (pago.medioPago === 'efectivo') {
          efectivoTotal += pago.monto;
        }
      });
    });
    
    // Sumar egresos
    const totalEgresos = egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    
    // Calcular efectivo esperado
    const montoEsperado = cierreCaja.montoInicial + efectivoTotal - totalEgresos;
    const diferencia = montoFinal - montoEsperado;
    
    // Verificar si hay diferencia significativa
    const hayDiferencia = Math.abs(diferencia) > 1; // Más de 1 unidad de moneda
    
    try {
      // Actualizar caja en transacción
      const resultado = await prisma.$transaction(async (tx) => {
        // Actualizar caja
        const cierreCajaActualizado = await tx.cierreCaja.update({
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
          await tx.contingencia.create({
            data: {
              titulo: `Diferencia en cierre de caja ${cierreCaja.sucursal.nombre} - ${format(new Date(), 'dd/MM/yyyy')}`,
              descripcion: `Se detectó una diferencia de ${diferencia > 0 ? 'sobrante' : 'faltante'} de $${Math.abs(diferencia).toFixed(2)} en el cierre de caja.\n\nDetalle:\n- Monto inicial: $${cierreCaja.montoInicial.toFixed(2)}\n- Ventas en efectivo: $${efectivoTotal.toFixed(2)}\n- Egresos: $${totalEgresos.toFixed(2)}\n- Efectivo esperado: $${montoEsperado.toFixed(2)}\n- Efectivo declarado: $${montoFinal.toFixed(2)}\n\nObservaciones: ${observaciones || 'Ninguna'}`,
              origen: 'sucursal',
              creadoPor: user.id,
              estado: 'pendiente',
              tipo: 'caja'
            }
          });
        }
        
        return cierreCajaActualizado;
      });
      
      // Registrar log de actividad
      console.log(`[CAJA] Usuario ${user.name} cerró caja ${id} con monto ${montoFinal}. ${hayDiferencia ? `Diferencia: ${diferencia}` : 'Sin diferencias'}`);
      
      return NextResponse.json({
        cierreCaja: resultado,
        diferencia,
        hayDiferencia,
        message: hayDiferencia 
          ? `Caja cerrada con diferencia de ${diferencia > 0 ? 'sobrante' : 'faltante'} de $${Math.abs(diferencia).toFixed(2)}`
          : 'Caja cerrada correctamente'
      });
    } catch (txError) {
      console.error('Error en transacción de cierre de caja:', txError);
      throw txError;
    }
  } catch (error: any) {
    console.error('Error al cerrar caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cerrar caja' },
      { status: 500 }
    );
  }
}