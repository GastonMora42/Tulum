// src/app/api/pdv/apertura/route.ts - VERSIÓN ACTUALIZADA MÁS FLEXIBLE
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  // CAMBIO: Solo requerir caja:crear, no admin
  const permError = await checkPermission('caja:crear')(req);
  if (permError) return permError;
    
  try {
    const { searchParams } = new URL(req.url);
    const sucursalId = searchParams.get('sucursalId');
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere ID de sucursal' },
        { status: 400 }
      );
    }
    
    // 🆕 OBTENER CONFIGURACIÓN DE MONTO FIJO
    let configuracionCierre = await prisma.configuracionCierre.findUnique({
      where: { sucursalId }
    });
    
    // Si no existe configuración, crear una por defecto
    if (!configuracionCierre) {
      const user = (req as any).user;
      configuracionCierre = await prisma.configuracionCierre.create({
        data: {
          sucursalId,
          montoFijo: 10000, // Valor por defecto
          creadoPor: user.id
        }
      });
    }
    
    const montoFijo = configuracionCierre.montoFijo;
    
    // 🔍 VERIFICAR SI HAY SALDOS PENDIENTES DE RECUPERAR
    const ultimoCierre = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        fechaCierre: { not: null }
      },
      orderBy: {
        fechaCierre: 'desc'
      }
    });
    
    // 📊 CALCULAR SUGERENCIA PARA APERTURA BASADA EN MONTO FIJO Y LÓGICA MEJORADA
    let sugerenciaApertura = montoFijo;
    let requiereRecupero = false;
    let saldoPendiente = 0;
    let alertaMontoInsuficiente = '';
    
    if (ultimoCierre) {
      // Si el último cierre indica que requiere recupero
      if (ultimoCierre.requiereRecuperoProximo && ultimoCierre.alertaMontoInsuficiente) {
        // Extraer el monto que quedó del mensaje de alerta
        const efectivoQuedo = ultimoCierre.montoFinal || 0;
        const recuperoFondoUltimo = ultimoCierre.recuperoFondo || 0;
        const efectivoRealQuedo = efectivoQuedo - recuperoFondoUltimo;
        
        if (efectivoRealQuedo < montoFijo) {
          saldoPendiente = montoFijo - efectivoRealQuedo;
          requiereRecupero = true;
          sugerenciaApertura = efectivoRealQuedo; // Abrir con lo que quedó
          alertaMontoInsuficiente = `Se sugiere abrir con $${efectivoRealQuedo.toFixed(2)} (lo que quedó del turno anterior). Durante el turno, si hay ventas en efectivo, podrá aplicar un recupero de hasta $${saldoPendiente.toFixed(2)} para llegar al monto fijo de $${montoFijo.toFixed(2)}.`;
        }
      }
      
      // Si no requiere recupero específico, usar monto fijo normal
      if (!requiereRecupero) {
        sugerenciaApertura = montoFijo;
      }
    }
    
    return NextResponse.json({
      sugerenciaApertura,
      requiereRecupero,
      saldoPendiente,
      montoFijo,
      alertaMontoInsuficiente,
      ultimoCierre: ultimoCierre ? {
        id: ultimoCierre.id,
        fechaCierre: ultimoCierre.fechaCierre,
        montoFinal: ultimoCierre.montoFinal,
        requiereRecuperoProximo: ultimoCierre.requiereRecuperoProximo,
        alertaMontoInsuficiente: ultimoCierre.alertaMontoInsuficiente,
        recuperoFondo: ultimoCierre.recuperoFondo
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
  
  // CAMBIO: Solo requerir caja:crear, no admin
  const permError = await checkPermission('caja:crear')(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { sucursalId, montoInicial, aplicarRecupero = false, observaciones } = body;
    
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
    
    // 🆕 VALIDACIONES BÁSICAS SOLAMENTE (SIN RESTRICCIONES SOBRE MONTO FIJO)
    const montoInicialNum = parseFloat(montoInicial);
    
    if (isNaN(montoInicialNum)) {
      return NextResponse.json(
        { error: 'El monto inicial debe ser un número válido' },
        { status: 400 }
      );
    }
    
    if (montoInicialNum < 0) {
      return NextResponse.json(
        { error: 'El monto inicial no puede ser negativo' },
        { status: 400 }
      );
    }
    
    if (montoInicialNum > 1000000) {
      return NextResponse.json(
        { error: 'El monto inicial es excesivamente alto. Verifique el valor ingresado.' },
        { status: 400 }
      );
    }
    
    // 🆕 OBTENER CONFIGURACIÓN DE MONTO FIJO
    let configuracionCierre = await prisma.configuracionCierre.findUnique({
      where: { sucursalId }
    });
    
    if (!configuracionCierre) {
      configuracionCierre = await prisma.configuracionCierre.create({
        data: {
          sucursalId,
          montoFijo: 10000,
          creadoPor: user.id
        }
      });
    }
    
    const montoFijo = configuracionCierre.montoFijo;
    
    // 🆕 NUEVA LÓGICA MÁS FLEXIBLE - INFORMATIVA EN LUGAR DE RESTRICTIVA
    let alertaApertura = '';
    let requiereRecuperoEsteturno = false;
    
    if (montoInicialNum < montoFijo) {
      const diferencia = montoFijo - montoInicialNum;
      requiereRecuperoEsteturno = true;
      alertaApertura = `Apertura con $${montoInicialNum.toFixed(2)} - $${diferencia.toFixed(2)} menos que el monto fijo de $${montoFijo.toFixed(2)}. Durante el turno, si hay ventas en efectivo, se habilitará la función de recupero de fondo.`;
    } else if (montoInicialNum > montoFijo) {
      const exceso = montoInicialNum - montoFijo;
      alertaApertura = `Apertura con $${montoInicialNum.toFixed(2)} - $${exceso.toFixed(2)} por encima del monto fijo. El exceso estará disponible para egresos o quedará para sobre al cierre.`;
    } else {
      alertaApertura = `Apertura con el monto fijo configurado de $${montoFijo.toFixed(2)}. Operación normal.`;
    }
    
    // 🗃️ CREAR NUEVA CAJA CON CAMPOS ADICIONALES
    const nuevaCaja = await prisma.cierreCaja.create({
      data: {
        sucursalId,
        montoInicial: montoInicialNum,
        usuarioApertura: user.id,
        estado: 'abierto',
        // 🆕 NUEVOS CAMPOS PARA TRACKING
        montoFijoReferencia: montoFijo,
        requiereRecuperoProximo: false, // Se calculará en el cierre
        observaciones: observaciones || null
      }
    });
    
    // 🔄 SI SE APLICÓ RECUPERO EN LA APERTURA, REGISTRARLO
    if (aplicarRecupero) {
      // Buscar el último cierre que requiera recupero
      const cierreAnterior = await prisma.cierreCaja.findFirst({
        where: {
          sucursalId,
          requiereRecuperoProximo: true,
          fechaCierre: { not: null }
        },
        orderBy: {
          fechaCierre: 'desc'
        }
      });
      
      if (cierreAnterior) {
        // Marcar como que se aplicó el recupero
        await prisma.cierreCaja.update({
          where: { id: cierreAnterior.id },
          data: {
            requiereRecuperoProximo: false // Ya se aplicó el recupero
          }
        });
        
        alertaApertura += ` Se marcó como aplicado el recupero pendiente del turno anterior.`;
      }
    }
    
    const mensajeRespuesta = alertaApertura;
    
    return NextResponse.json({
      success: true,
      message: mensajeRespuesta,
      cierreCaja: nuevaCaja,
      configuracion: {
        montoFijo,
        requiereRecuperoEsteturno,
        diferenciMontoFijo: montoFijo - montoInicialNum,
        esAperturaFlexible: montoInicialNum !== montoFijo
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error al abrir caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al abrir caja' },
      { status: 500 }
    );
  }
}