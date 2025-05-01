// src/app/api/pdv/cierre/resumen/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  // Aplicar middleware de autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permissionError = await checkPermission('caja:ver')(req);
  if (permissionError) return permissionError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // Buscar caja abierta
    const cajaAbierta = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        estado: 'abierto'
      },
      orderBy: {
        fechaApertura: 'desc'
      }
    });
    
    if (!cajaAbierta) {
      return NextResponse.json(
        { 
          abierto: false,
          message: 'No hay ninguna caja abierta para esta sucursal'
        },
        { status: 200 }
      );
    }
    
    // Obtener ventas desde la apertura
    const ventas = await prisma.venta.findMany({
      where: {
        sucursalId,
        fecha: {
          gte: cajaAbierta.fechaApertura
        }
      },
      include: {
        pagos: true
      }
    });
    
    // Calcular totales
    let ventasEfectivo = 0;
    let ventasTarjeta = 0;
    let ventasOtros = 0;
    
    ventas.forEach(venta => {
      venta.pagos.forEach(pago => {
        if (pago.medioPago === 'efectivo') {
          ventasEfectivo += pago.monto;
        } else if (pago.medioPago === 'tarjeta') {
          ventasTarjeta += pago.monto;
        } else {
          ventasOtros += pago.monto;
        }
      });
    });
    
    // Calcular efectivo esperado (inicial + ventas en efectivo)
    const efectivoEsperado = cajaAbierta.montoInicial + ventasEfectivo;
    
    return NextResponse.json({
      abierto: true,
      fechaApertura: cajaAbierta.fechaApertura,
      montoInicial: cajaAbierta.montoInicial,
      ventasEfectivo,
      ventasTarjeta,
      ventasOtros,
      totalVentas: ventasEfectivo + ventasTarjeta + ventasOtros,
      cantidadVentas: ventas.length,
      efectivoEsperado
    });
  } catch (error: any) {
    console.error('Error al obtener resumen de caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al obtener resumen de caja' },
      { status: 500 }
    );
  }
}