// src/app/api/pdv/cierre/route.ts - VERSIÓN ACTUALIZADA CON NUEVA LÓGICA COMPLETA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
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
    
    // BUSCAR CAJA ABIERTA ACTUAL
    const cierreCaja = await prisma.cierreCaja.findFirst({
      where: { 
        sucursalId, 
        estado: 'abierto' 
      },
      include: {
        egresos: {
          include: {
            usuario: {
              select: { name: true }
            }
          }
        }
      }
    });
    
    if (!cierreCaja) {
      return NextResponse.json(
        { error: 'No hay una caja abierta para esta sucursal' },
        { status: 404 }
      );
    }
    
    // 🆕 OBTENER CONFIGURACIÓN DE MONTO FIJO
    let configuracionCierre = await prisma.configuracionCierre.findUnique({
      where: { sucursalId }
    });
    
    if (!configuracionCierre) {
      const user = (req as any).user;
      configuracionCierre = await prisma.configuracionCierre.create({
        data: {
          sucursalId,
          montoFijo: 10000,
          creadoPor: user.id
        }
      });
    }
    
    // OBTENER VENTAS Y CALCULAR TOTALES POR MEDIO DE PAGO
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
    
    // CALCULAR TOTALES POR MEDIO DE PAGO
    const totalesPorMedioPago: Record<string, { monto: number; cantidad: number }> = {};
    let totalVentas = 0;
    
    for (const venta of ventas) {
      totalVentas += venta.total;
      
      for (const pago of venta.pagos) {
        if (!totalesPorMedioPago[pago.medioPago]) {
          totalesPorMedioPago[pago.medioPago] = { monto: 0, cantidad: 0 };
        }
        
        totalesPorMedioPago[pago.medioPago].monto += pago.monto;
        totalesPorMedioPago[pago.medioPago].cantidad += 1;
      }
    }
    
    // CALCULAR EGRESOS TOTALES
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    
    // CALCULAR EFECTIVO ESPERADO (SIN RECUPERO AÚN)
    const ventasEfectivo = totalesPorMedioPago['efectivo']?.monto || 0;
    const efectivoEsperadoBase = cierreCaja.montoInicial + ventasEfectivo - totalEgresos;
    
    // 🆕 NUEVA LÓGICA: INFORMACIÓN SOBRE RECUPERO BASADA EN MONTO FIJO
    const montoFijo = configuracionCierre.montoFijo;
    const puedeAplicarRecupero = cierreCaja.montoInicial < montoFijo && ventasEfectivo > 0;
    const recuperoMaximoPosible = puedeAplicarRecupero ? 
      Math.min(montoFijo - cierreCaja.montoInicial, ventasEfectivo) : 0;
    
    // VERIFICAR SI HAY SALDO PENDIENTE DE TURNO ANTERIOR
    const ultimoCierreAnterior = await prisma.cierreCaja.findFirst({
      where: {
        sucursalId,
        fechaCierre: { not: null },
        id: { not: cierreCaja.id }
      },
      orderBy: {
        fechaCierre: 'desc'
      }
    });
    
    return NextResponse.json({
      cierreCaja: {
        ...cierreCaja,
        montoFijoReferencia: montoFijo // Agregar monto fijo actual
      },
      ventasResumen: {
        total: totalVentas,
        cantidadVentas: ventas.length,
        totalesPorMedioPago,
        totalEgresos,
        efectivoEsperado: efectivoEsperadoBase,
        saldoPendienteAnterior: ultimoCierreAnterior?.saldoPendienteActual || 0,
        // 🆕 NUEVOS CAMPOS PARA RECUPERO
        montoFijo,
        puedeAplicarRecupero,
        recuperoMaximoPosible,
        ventasEfectivo,
        infoRecupero: puedeAplicarRecupero ? {
          razon: 'Abrió con menos del monto fijo y hubo ventas en efectivo',
          montoInicialVsMontoFijo: `$${cierreCaja.montoInicial.toFixed(2)} vs $${montoFijo.toFixed(2)}`,
          ventasEfectivoDisponibles: `$${ventasEfectivo.toFixed(2)}`,
          recuperoMaximo: `$${recuperoMaximoPosible.toFixed(2)}`
        } : null
      },
      egresos: cierreCaja.egresos,
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

export async function PATCH(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission(['caja:crear', 'admin'])(req);
  if (permError) return permError;
  
  try {
    const body = await req.json();
    const { 
      id, 
      observaciones,
      // CONTEOS MANUALES POR MEDIO DE PAGO
      conteoEfectivo,
      conteoTarjetaCredito,
      conteoTarjetaDebito,
      conteoQR,
      conteoOtros,
      // 🆕 RECUPERO DE FONDO CON NUEVA LÓGICA
      recuperoFondo = 0,
      // 🆕 INDICADORES DE RESOLUCIÓN DE DIFERENCIAS
      forzarContingencia = false,
      resolverDiferenciasAutomaticamente = false
    } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el ID de la caja a cerrar' },
        { status: 400 }
      );
    }
    
    if (conteoEfectivo === undefined || conteoEfectivo === null) {
      return NextResponse.json(
        { error: 'Se requiere el conteo de efectivo' },
        { status: 400 }
      );
    }
    
    const conteoEfectivoNum = parseFloat(conteoEfectivo);
    const recuperoFondoNum = parseFloat(recuperoFondo) || 0;
    
    if (isNaN(conteoEfectivoNum) || conteoEfectivoNum < 0) {
      return NextResponse.json(
        { error: 'El conteo de efectivo debe ser un número válido mayor o igual a cero' },
        { status: 400 }
      );
    }
    
    // OBTENER CAJA Y VALIDAR
    const cierreCaja = await prisma.cierreCaja.findUnique({
      where: { id },
      include: {
        egresos: true
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
    
    // 🆕 OBTENER CONFIGURACIÓN DE MONTO FIJO
    let configuracionCierre = await prisma.configuracionCierre.findUnique({
      where: { sucursalId: cierreCaja.sucursalId }
    });
    
    if (!configuracionCierre) {
      const user = (req as any).user;
      configuracionCierre = await prisma.configuracionCierre.create({
        data: {
          sucursalId: cierreCaja.sucursalId,
          montoFijo: 10000,
          creadoPor: user.id
        }
      });
    }
    
    const montoFijo = configuracionCierre.montoFijo;
    
    // RECALCULAR TODOS LOS TOTALES
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
    
    // CALCULAR VENTAS POR MEDIO DE PAGO
    let ventasEfectivo = 0;
    let ventasTarjetaCredito = 0;
    let ventasTarjetaDebito = 0;
    let ventasQR = 0;
    let ventasOtros = 0;
    
    const detallesPorMedioPago: Record<string, { monto: number; cantidad: number }> = {};
    
    for (const venta of ventas) {
      for (const pago of venta.pagos) {
        if (!detallesPorMedioPago[pago.medioPago]) {
          detallesPorMedioPago[pago.medioPago] = { monto: 0, cantidad: 0 };
        }
        
        detallesPorMedioPago[pago.medioPago].monto += pago.monto;
        detallesPorMedioPago[pago.medioPago].cantidad += 1;
        
        // Categorizar por medio de pago
        switch (pago.medioPago) {
          case 'efectivo':
            ventasEfectivo += pago.monto;
            break;
          case 'tarjeta_credito':
            ventasTarjetaCredito += pago.monto;
            break;
          case 'tarjeta_debito':
            ventasTarjetaDebito += pago.monto;
            break;
          case 'qr':
            ventasQR += pago.monto;
            break;
          default:
            ventasOtros += pago.monto;
        }
      }
    }
    
    // CALCULAR EGRESOS Y EFECTIVO ESPERADO
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    const efectivoEsperadoSinRecupero = cierreCaja.montoInicial + ventasEfectivo - totalEgresos;
    const efectivoEsperadoConRecupero = efectivoEsperadoSinRecupero - recuperoFondoNum;
    const diferenciaEfectivo = conteoEfectivoNum - efectivoEsperadoConRecupero;
    
    // 🆕 NUEVA LÓGICA: VALIDAR RECUPERO SEGÚN LAS REGLAS DEL CLIENTE
    let recuperoValidado = 0;
    let errorRecupero = '';
    
    if (recuperoFondoNum > 0) {
      // Regla 1: Solo se puede aplicar recupero si se abrió con menos del monto fijo
      if (cierreCaja.montoInicial >= montoFijo) {
        errorRecupero = 'No se puede aplicar recupero porque se abrió con el monto fijo completo o más';
      }
      // Regla 2: Solo se puede aplicar recupero si hubo ventas en efectivo
      else if (ventasEfectivo <= 0) {
        errorRecupero = 'No se puede aplicar recupero porque no hubo ventas en efectivo en el turno';
      }
      // Regla 3: El recupero no puede ser mayor a las ventas en efectivo
      else if (recuperoFondoNum > ventasEfectivo) {
        errorRecupero = `El recupero no puede ser mayor a las ventas en efectivo ($${ventasEfectivo.toFixed(2)})`;
      }
      // Regla 4: El recupero no debería superar la diferencia del monto fijo
      else if (recuperoFondoNum > (montoFijo - cierreCaja.montoInicial)) {
        errorRecupero = `El recupero no debería superar la diferencia del monto fijo ($${(montoFijo - cierreCaja.montoInicial).toFixed(2)})`;
      }
      else {
        recuperoValidado = recuperoFondoNum;
      }
    }
    
    if (errorRecupero) {
      return NextResponse.json(
        { error: errorRecupero },
        { status: 400 }
      );
    }
    
    // VERIFICAR DIFERENCIAS EN TODOS LOS MEDIOS DE PAGO
    const diferencias: Array<{
      medioPago: string;
      esperado: number;
      contado: number;
      diferencia: number;
      significativa: boolean;
    }> = [];
    
    // Verificar efectivo (con recupero aplicado)
    if (Math.abs(diferenciaEfectivo) > 0.01) {
      diferencias.push({
        medioPago: 'Efectivo',
        esperado: efectivoEsperadoConRecupero,
        contado: conteoEfectivoNum,
        diferencia: diferenciaEfectivo,
        significativa: Math.abs(diferenciaEfectivo) >= 200
      });
    }
    
    // Verificar otros medios de pago
    const otrosMedios = [
      { nombre: 'Tarjeta de Crédito', esperado: ventasTarjetaCredito, contado: conteoTarjetaCredito },
      { nombre: 'Tarjeta de Débito', esperado: ventasTarjetaDebito, contado: conteoTarjetaDebito },
      { nombre: 'QR / Digital', esperado: ventasQR, contado: conteoQR }
    ];
    
    otrosMedios.forEach(medio => {
      if (medio.contado !== undefined && Math.abs(medio.contado - medio.esperado) > 0.01) {
        const diff = medio.contado - medio.esperado;
        diferencias.push({
          medioPago: medio.nombre,
          esperado: medio.esperado,
          contado: medio.contado,
          diferencia: diff,
          significativa: Math.abs(diff) >= 200
        });
      }
    });
    
    // 🆕 NUEVA LÓGICA: DETERMINACIÓN DE ESTADO DEL CIERRE
    const diferenciasMayores = diferencias.filter(d => d.significativa);
    const shouldGenerateContingency = diferenciasMayores.length > 0 || forzarContingencia || resolverDiferenciasAutomaticamente;
    
    // Si hay diferencias mayores y no se está forzando, requerir confirmación
    if (diferenciasMayores.length > 0 && !forzarContingencia && !resolverDiferenciasAutomaticamente) {
      return NextResponse.json(
        { 
          error: 'Hay diferencias significativas sin resolver',
          diferencias: diferenciasMayores,
          requiereConfirmacion: true,
          mensaje: 'Use el botón "Resolver Diferencias" para forzar el cierre y generar contingencias automáticamente.'
        },
        { status: 400 }
      );
    }
    
    // 🆕 NUEVA LÓGICA: CÁLCULO DE ALERTAS Y PRÓXIMO TURNO SEGÚN MONTO FIJO
    const efectivoFinalReal = conteoEfectivoNum; // Efectivo físico contado
    const efectivoParaProximoTurno = efectivoFinalReal; // Lo que queda para el próximo turno
    
    let alertaMontoInsuficiente = '';
    let requiereRecuperoProximo = false;
    let sugerenciaProximaApertura = montoFijo;
    
    // Si el efectivo final es menor al monto fijo, generar alerta
    if (efectivoParaProximoTurno < montoFijo) {
      const diferencia = montoFijo - efectivoParaProximoTurno;
      requiereRecuperoProximo = true;
      alertaMontoInsuficiente = `El próximo turno deberá hacer un recupero de fondo. Está dejando como monto inicial para apertura de caja $${efectivoParaProximoTurno.toFixed(2)} (faltan $${diferencia.toFixed(2)} para llegar al monto fijo de $${montoFijo.toFixed(2)})`;
      sugerenciaProximaApertura = efectivoParaProximoTurno;
    }
    
    const user = (req as any).user;
    
    // ACTUALIZAR CAJA EN LA BASE DE DATOS
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el cierre de caja
      const cierreCajaUpdated = await tx.cierreCaja.update({
        where: { id },
        data: {
          // Conteos manuales
          conteoEfectivo: conteoEfectivoNum,
          conteoTarjetaCredito: conteoTarjetaCredito || 0,
          conteoTarjetaDebito: conteoTarjetaDebito || 0,
          conteoQR: conteoQR || 0,
          conteoOtros: conteoOtros || 0,
          
          // Cálculos de efectivo
          totalEgresos,
          efectivoEsperado: efectivoEsperadoConRecupero,
          efectivoReal: conteoEfectivoNum,
          diferenciaEfectivo,
          
          // 🆕 NUEVOS CAMPOS SEGÚN ESPECIFICACIONES
          montoFijoReferencia: montoFijo,
          requiereRecuperoProximo,
          alertaMontoInsuficiente: alertaMontoInsuficiente || null,
          esCierreConDiferencias: shouldGenerateContingency,
          razonCierreForzado: (forzarContingencia || resolverDiferenciasAutomaticamente) ? 
            `Diferencias resueltas automáticamente: ${diferencias.map(d => `${d.medioPago} $${Math.abs(d.diferencia).toFixed(2)}`).join(', ')}` : 
            null,
          
          // Recupero de fondo
          recuperoFondo: recuperoValidado,
          
          // Estado y cierre
          montoFinal: conteoEfectivoNum,
          diferencia: diferenciaEfectivo,
          fechaCierre: new Date(),
          usuarioCierre: user.id,
          estado: shouldGenerateContingency ? 'con_contingencia' : 'cerrado',
          observaciones: observaciones || null
        }
      });
      
      // 🆕 GENERAR CONTINGENCIA SI ES NECESARIO
      if (shouldGenerateContingency) {
        const detallesDiferencia: string[] = [];
        
        diferencias.forEach(diff => {
          const esSignificativa = diff.significativa ? '🚨 SIGNIFICATIVA' : '⚠️ MENOR';
          detallesDiferencia.push(
            `${diff.medioPago}: Esperado $${diff.esperado.toFixed(2)}, Contado $${diff.contado.toFixed(2)}, Diferencia ${diff.diferencia > 0 ? '+' : ''}$${diff.diferencia.toFixed(2)} ${esSignificativa}`
          );
        });
        
        const fechaFormateada = new Date().toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const esUrgente = diferenciasMayores.length > 0 || Math.abs(diferenciaEfectivo) > 500;
        
        await tx.contingencia.create({
          data: {
            titulo: `${diferenciasMayores.length > 0 ? 'Diferencias Significativas' : 'Cierre Forzado'} - Cierre de Caja - ${fechaFormateada}`,
            descripcion: `
🏪 CIERRE DE CAJA ${diferenciasMayores.length > 0 ? 'CON DIFERENCIAS SIGNIFICATIVAS' : 'FORZADO'}

📅 Fecha: ${fechaFormateada}
🏪 Sucursal: ${cierreCaja.sucursalId}
👤 Cerrado por: ${user.name} (${user.email})

💰 RESUMEN DEL TURNO:
- Monto inicial: $${cierreCaja.montoInicial.toFixed(2)}
- Monto fijo configurado: $${montoFijo.toFixed(2)}
- Ventas en efectivo: $${ventasEfectivo.toFixed(2)}
- Total egresos: $${totalEgresos.toFixed(2)}
- Recupero aplicado: $${recuperoValidado.toFixed(2)}
- Efectivo esperado (con recupero): $${efectivoEsperadoConRecupero.toFixed(2)}
- Efectivo contado: $${conteoEfectivoNum.toFixed(2)}

🔍 DIFERENCIAS ENCONTRADAS:
${detallesDiferencia.join('\n')}

${diferenciasMayores.length > 0 ? '🚨 REQUIERE ATENCIÓN URGENTE - Diferencias mayores a $200' : '⚠️ Cierre forzado por el usuario'}

📊 DETALLE DE VENTAS POR MEDIO DE PAGO:
${Object.entries(detallesPorMedioPago).map(([medio, datos]) => 
  `• ${medio}: $${datos.monto.toFixed(2)} (${datos.cantidad} transacciones)`
).join('\n')}

📋 EGRESOS DEL TURNO:
${cierreCaja.egresos.map(egreso => 
  `• ${egreso.motivo}: $${egreso.monto.toFixed(2)} - ${new Date(egreso.fecha).toLocaleTimeString()}`
).join('\n') || 'Sin egresos registrados'}

${recuperoValidado > 0 ? `\n💰 RECUPERO DE FONDO APLICADO: $${recuperoValidado.toFixed(2)}\n- Se aplicó recupero porque se abrió con menos del monto fijo y hubo ventas en efectivo` : ''}

${alertaMontoInsuficiente ? `\n⚠️ ALERTA PARA PRÓXIMO TURNO:\n${alertaMontoInsuficiente}` : ''}

${observaciones ? `\n📝 OBSERVACIONES DEL VENDEDOR:\n${observaciones}` : ''}

🔧 ACCIONES REQUERIDAS:
- Verificar el conteo de efectivo y otros medios de pago
- Revisar si hay movimientos no registrados
- Investigar posibles errores en el registro de ventas o egresos
- Documentar las correcciones realizadas
- Ajustar el sistema si corresponde
            `.trim(),
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: 'caja',
            ubicacionId: cierreCaja.sucursalId,
            urgente: esUrgente
          }
        });
      }
      
      return cierreCajaUpdated;
    });
    
    // PREPARAR RESPUESTA COMPLETA
    const mensajeBase = shouldGenerateContingency 
      ? diferenciasMayores.length > 0 
        ? `Caja cerrada con diferencias significativas (≥$200). Se generó una contingencia para revisión.`
        : `Caja cerrada con cierre forzado. Se generó una contingencia para revisión.`
      : diferencias.length > 0
        ? `Caja cerrada correctamente. Las diferencias menores a $200 son aceptables.`
        : `Caja cerrada correctamente sin diferencias.`;
    
    const recuperoInfo = recuperoValidado > 0 
      ? ` Se aplicó recupero de $${recuperoValidado.toFixed(2)}.` 
      : '';
    
    const alertaInfo = alertaMontoInsuficiente 
      ? ` ${alertaMontoInsuficiente}` 
      : '';
    
    return NextResponse.json({
      success: true,
      message: mensajeBase + recuperoInfo + alertaInfo,
      cierreCaja: result,
      contingenciaGenerada: shouldGenerateContingency,
      diferencias: {
        efectivo: {
          esperado: efectivoEsperadoConRecupero,
          contado: conteoEfectivoNum,
          diferencia: diferenciaEfectivo
        },
        otrosMedios: diferencias.filter(d => d.medioPago !== 'Efectivo')
      },
      recuperoInfo: {
        aplicado: recuperoValidado,
        razon: recuperoValidado > 0 ? 'Monto inicial menor al monto fijo con ventas en efectivo' : null
      },
      alertaProximoTurno: {
        requiereRecupero: requiereRecuperoProximo,
        alertaMontoInsuficiente,
        sugerenciaApertura: sugerenciaProximaApertura,
        montoFijoReferencia: montoFijo
      },
      resumen: {
        totalVentas: ventas.reduce((sum, v) => sum + v.total, 0),
        ventasEfectivo,
        totalEgresos,
        cantidadVentas: ventas.length,
        detallesPorMedioPago: Object.entries(detallesPorMedioPago).map(([medio, datos]) => ({
          medioPago: medio,
          monto: datos.monto,
          cantidad: datos.cantidad
        })),
        diferenciasSignificativas: diferenciasMayores.length,
        diferenciasMenores: diferencias.length - diferenciasMayores.length,
        montoFijo,
        cumpleMontoFijo: efectivoParaProximoTurno >= montoFijo
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