// src/app/api/pdv/apertura/route.ts - NUEVA API PARA APERTURA CON RECUPERO
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // 🔍 VERIFICAR SI HAY SALDOS PENDIENTES DE RECUPERAR
    const ultimoCierre = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        fechaCierre: { not: null },
        saldoPendienteActual: { gt: 0 }
      },
      orderBy: {
        fechaCierre: 'desc'
      }
    });
    
    // 📊 CALCULAR SUGERENCIA PARA APERTURA
    let sugerenciaApertura = 5000; // Base default
    let requiereRecupero = false;
    let saldoPendiente = 0;
    
    if (ultimoCierre && ultimoCierre.saldoPendienteActual > 0) {
      saldoPendiente = ultimoCierre.saldoPendienteActual;
      sugerenciaApertura = 5000 + saldoPendiente;
      requiereRecupero = true;
    }
    
    return NextResponse.json({
      sugerenciaApertura,
      requiereRecupero,
      saldoPendiente,
      ultimoCierre: ultimoCierre ? {
        id: ultimoCierre.id,
        fechaCierre: ultimoCierre.fechaCierre,
        saldoPendiente: ultimoCierre.saldoPendienteActual
      } : null
    });
  } catch (error: any) {
    console.error('Error al verificar apertura:', error);
    return NextResponse.json(
      { error: error.message || 'Error al verificar apertura' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { sucursalId, montoInicial, recuperarSaldo = false } = body;
    
    if (!sucursalId || montoInicial === undefined) {
      return NextResponse.json(
        { error: 'Se requiere sucursalId y montoInicial' },
        { status: 400 }
      );
    }
    
    const user = (req as any).user;
    
    // 🔍 VERIFICAR QUE NO HAY CAJA ABIERTA
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
    
    // 🔄 BUSCAR SALDO PENDIENTE SI SE SOLICITA RECUPERAR
    let saldoPendienteAnterior = 0;
    if (recuperarSaldo) {
      const ultimoCierre = await prisma.cierreCaja.findFirst({
        where: {
          sucursalId,
          fechaCierre: { not: null },
          saldoPendienteActual: { gt: 0 }
        },
        orderBy: {
          fechaCierre: 'desc'
        }
      });
      
      if (ultimoCierre) {
        saldoPendienteAnterior = ultimoCierre.saldoPendienteActual;
      }
    }
    
    // 🗃️ CREAR NUEVA CAJA
    const nuevaCaja = await prisma.cierreCaja.create({
      data: {
        sucursalId,
        montoInicial: parseFloat(montoInicial),
        usuarioApertura: user.id,
        estado: 'abierto',
        saldoPendienteAnterior
      }
    });
    
    return NextResponse.json({
      success: true,
      message: saldoPendienteAnterior > 0 
        ? `Caja abierta con recupero de $${saldoPendienteAnterior.toFixed(2)} del turno anterior`
        : 'Caja abierta correctamente',
      cierreCaja: nuevaCaja,
      recuperoAplicado: saldoPendienteAnterior
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al abrir caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al abrir caja' },
      { status: 500 }
    );
  }
}