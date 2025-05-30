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

// POST - Crear nueva apertura de caja (VERSIÓN CORREGIDA)
export async function POST(req: NextRequest) {
  // Autenticación
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  // Verificar permiso
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    // CORREGIDO: Verificar que hay contenido antes de parsear JSON
    const contentType = req.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      return NextResponse.json(
        { error: 'Content-Type debe ser application/json' },
        { status: 400 }
      );
    }
    
    // Verificar que hay un body
    const contentLength = req.headers.get('content-length');
    if (!contentLength || parseInt(contentLength) === 0) {
      return NextResponse.json(
        { error: 'Se requiere enviar datos en el cuerpo de la petición' },
        { status: 400 }
      );
    }
    
    let body;
    try {
      body = await req.json();
    } catch (jsonError) {
      console.error('Error al parsear JSON:', jsonError);
      return NextResponse.json(
        { error: 'Formato JSON inválido en el cuerpo de la petición' },
        { status: 400 }
      );
    }
    
    const { sucursalId, montoInicial } = body;
    
    if (!sucursalId) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la sucursal' },
        { status: 400 }
      );
    }
    
    if (montoInicial === undefined || montoInicial === null) {
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
        montoInicial: parseFloat(montoInicial),
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

// src/app/api/pdv/cierre/route.ts - MÉTODO PATCH MEJORADO
export async function PATCH(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { id, montoFinal, observaciones, generateContingency } = body;
    
    // Validaciones mejoradas
    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la caja a cerrar' },
        { status: 400 }
      );
    }
    
    if (montoFinal === undefined || montoFinal === null) {
      return NextResponse.json(
        { error: 'Se requiere el monto final' },
        { status: 400 }
      );
    }
    
    const montoFinalNum = parseFloat(montoFinal);
    if (isNaN(montoFinalNum) || montoFinalNum < 0) {
      return NextResponse.json(
        { error: 'El monto final debe ser un número válido mayor o igual a cero' },
        { status: 400 }
      );
    }
    
    // 🔍 OBTENER Y VALIDAR CAJA
    const cierreCaja = await prisma.cierreCaja.findUnique({
      where: { id },
      include: {
        egresos: true // Incluir egresos para cálculos precisos
      }
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
    
    // 💰 CÁLCULOS PRECISOS MEJORADOS
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
    
    // Calcular ventas por método de pago
    let ventasEfectivo = 0;
    let ventasDigital = 0;
    const detallesPorMedioPago: Record<string, { monto: number; cantidad: number }> = {};
    
    for (const venta of ventas) {
      for (const pago of venta.pagos) {
        if (!detallesPorMedioPago[pago.medioPago]) {
          detallesPorMedioPago[pago.medioPago] = { monto: 0, cantidad: 0 };
        }
        
        detallesPorMedioPago[pago.medioPago].monto += pago.monto;
        detallesPorMedioPago[pago.medioPago].cantidad += 1;
        
        if (pago.medioPago === 'efectivo') {
          ventasEfectivo += pago.monto;
        } else {
          ventasDigital += pago.monto;
        }
      }
    }
    
    // Calcular egresos de efectivo
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    
    // 🎯 CÁLCULO PRECISO DEL EFECTIVO ESPERADO
    const efectivoEsperado = cierreCaja.montoInicial + ventasEfectivo - totalEgresos;
    const diferencia = montoFinalNum - efectivoEsperado;
    const diferenciaAbs = Math.abs(diferencia);
    
    const user = (req as any).user;
    
    // 🚨 GENERAR CONTINGENCIA AUTOMÁTICA SI ES NECESARIO
    let contingenciaGenerada = false;
    
    if (generateContingency || diferenciaAbs > 5) { // Umbral de $5
      try {
        const tipoContingencia = diferenciaAbs > 20 ? 'urgente' : 'normal';
        
        await prisma.contingencia.create({
          data: {
            titulo: `Diferencia en Cierre de Caja - ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}`,
            descripcion: `
DIFERENCIA EN CIERRE DE CAJA

📅 Fecha: ${new Date().toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
🏪 Sucursal: ${cierreCaja.sucursalId}
👤 Cerrado por: ${user.name} (${user.email})

💰 RESUMEN FINANCIERO:
- Monto inicial: $${cierreCaja.montoInicial.toFixed(2)}
- Ventas en efectivo: $${ventasEfectivo.toFixed(2)}
- Egresos registrados: $${totalEgresos.toFixed(2)}
- Efectivo esperado: $${efectivoEsperado.toFixed(2)}
- Efectivo contado: $${montoFinalNum.toFixed(2)}
- Diferencia: ${diferencia > 0 ? '+' : ''}$${diferencia.toFixed(2)}

📊 DETALLES DE VENTAS:
${Object.entries(detallesPorMedioPago).map(([medio, datos]) => 
  `• ${medio}: $${datos.monto.toFixed(2)} (${datos.cantidad} transacciones)`
).join('\n')}

${observaciones ? `\n📝 OBSERVACIONES DEL VENDEDOR:\n${observaciones}` : ''}

🔍 ACCIONES REQUERIDAS:
- Verificar el conteo de efectivo
- Revisar si hay egresos no registrados
- Investigar posibles errores en el registro de ventas
- Ajustar el sistema si corresponde
- Documentar las correcciones realizadas
            `.trim(),
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: 'caja',
            ubicacionId: cierreCaja.sucursalId,
            urgente: diferenciaAbs > 20 // Marcar como urgente si la diferencia es > $20
          }
        });
        
        contingenciaGenerada = true;
        console.log(`[CIERRE-CAJA] Contingencia generada por diferencia de $${diferencia.toFixed(2)}`);
      } catch (contingenciaError) {
        console.error('Error al generar contingencia:', contingenciaError);
        // No fallar el cierre por error en contingencia
      }
    }
    
    // 🔒 CERRAR CAJA
    const cierreCajaUpdate = await prisma.cierreCaja.update({
      where: { id },
      data: {
        montoFinal: montoFinalNum,
        diferencia,
        fechaCierre: new Date(),
        usuarioCierre: user.id,
        estado: contingenciaGenerada ? 'con_contingencia' : 'cerrado',
        observaciones: observaciones || null
      }
    });
    
    return NextResponse.json({
      success: true,
      message: contingenciaGenerada 
        ? 'Caja cerrada con diferencias. Se ha generado una contingencia para revisión.'
        : 'Caja cerrada correctamente sin diferencias.',
      cierreCaja: cierreCajaUpdate,
      diferencia,
      efectivoEsperado,
      contingenciaGenerada,
      resumen: {
        ventasEfectivo,
        ventasDigital,
        totalEgresos,
        cantidadVentas: ventas.length,
        detallesPorMedioPago: Object.entries(detallesPorMedioPago).map(([medio, datos]) => ({
          medioPago: medio,
          monto: datos.monto,
          cantidad: datos.cantidad
        }))
      }
    });
  } catch (error: any) {
    console.error('Error al cerrar caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cerrar caja' },
      { status: 500 }
    );
  }
}