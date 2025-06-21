// src/app/api/pdv/cierre/route.ts - VERSIÓN MEJORADA CON LÓGICA DE RECUPERO CORREGIDA
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/server/db/client';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';

export async function GET(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permError = await checkPermission('caja:ver')(req);
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
  
  const permError = await checkPermission('caja:crear')(req);
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
    
    console.log('🔧 [CIERRE] Iniciando cierre con parámetros:', {
      id,
      conteoEfectivo,
      recuperoFondo,
      forzarContingencia,
      resolverDiferenciasAutomaticamente,
      observaciones: observaciones ? 'presente' : 'no'
    });
    
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
    
    // 🔧 NUEVA LÓGICA: CALCULAR EGRESOS Y EFECTIVO ESPERADO SIN RECUPERO
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    const efectivoEsperadoSinRecupero = cierreCaja.montoInicial + ventasEfectivo - totalEgresos;
    
    // 🔧 NUEVA LÓGICA: Diferencia real vs diferencia final
    const diferenciaEfectivoReal = conteoEfectivoNum - efectivoEsperadoSinRecupero;
    const diferenciaEfectivoFinal = diferenciaEfectivoReal - recuperoFondoNum;
    
    // 🔧 VERIFICAR SI EL RECUPERO JUSTIFICA LA DIFERENCIA
    const recuperoJustificaDiferencia = recuperoFondoNum > 0 && 
      Math.abs(diferenciaEfectivoReal - recuperoFondoNum) <= 200;
    
    console.log('📊 [CIERRE] Cálculos de efectivo mejorados:', {
      montoInicial: cierreCaja.montoInicial,
      ventasEfectivo,
      totalEgresos,
      efectivoEsperadoSinRecupero,
      efectivoContado: conteoEfectivoNum,
      diferenciaReal: diferenciaEfectivoReal,
      recuperoFondo: recuperoFondoNum,
      diferenciaFinal: diferenciaEfectivoFinal,
      recuperoJustifica: recuperoJustificaDiferencia
    });
    
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
    
    if (errorRecupero && !forzarContingencia) {
      return NextResponse.json(
        { error: errorRecupero },
        { status: 400 }
      );
    }
    
    // 🔧 VERIFICAR DIFERENCIAS EN MEDIOS DE PAGO - LÓGICA MEJORADA
    interface DiferenciaDetalle {
      medioPago: string;
      esperado: number;
      contado: number;
      diferencia: number;
      diferenciaFinal?: number;
      significativa: boolean;
      tienePagosPendientes: boolean;
      recuperoAplicado?: number;
    }
    
    const diferencias: DiferenciaDetalle[] = [];
    const MARGEN_TOLERANCIA_EFECTIVO = 200;
    
    // 🔧 NUEVA VALIDACIÓN DE EFECTIVO: Considerar recupero como justificación válida
    let efectivoEsSignificativo = false;
    
    if (recuperoFondoNum > 0) {
      // Si hay recupero, validar la diferencia FINAL
      efectivoEsSignificativo = Math.abs(diferenciaEfectivoFinal) > MARGEN_TOLERANCIA_EFECTIVO;
    } else {
      // Sin recupero, usar diferencia real directa
      efectivoEsSignificativo = Math.abs(diferenciaEfectivoReal) > MARGEN_TOLERANCIA_EFECTIVO;
    }
    
    if (Math.abs(diferenciaEfectivoReal) > 0.01) {
      diferencias.push({
        medioPago: 'Efectivo',
        esperado: efectivoEsperadoSinRecupero,
        contado: conteoEfectivoNum,
        diferencia: diferenciaEfectivoReal,
        diferenciaFinal: diferenciaEfectivoFinal,
        significativa: efectivoEsSignificativo,
        tienePagosPendientes: false,
        recuperoAplicado: recuperoFondoNum
      });
    }
    
    // 🔧 VERIFICAR OTROS MEDIOS DE PAGO - NUEVA LÓGICA
    const mediosElectronicos = [
      { nombre: 'Tarjeta de Crédito', esperado: ventasTarjetaCredito, contado: conteoTarjetaCredito },
      { nombre: 'Tarjeta de Débito', esperado: ventasTarjetaDebito, contado: conteoTarjetaDebito },
      { nombre: 'QR / Digital', esperado: ventasQR, contado: conteoQR }
    ];
    
    mediosElectronicos.forEach(medio => {
      // 🔧 NUEVA LÓGICA: Solo validar si hay ventas esperadas O si se ingresó un conteo
      const hayVentasEsperadas = medio.esperado > 0;
      const hayConteoIngresado = medio.contado !== undefined && medio.contado !== null && medio.contado !== '';
      
      if (hayVentasEsperadas || hayConteoIngresado) {
        const contadoNum = parseFloat(String(medio.contado)) || 0;
        const diff = contadoNum - medio.esperado;
        
        // Solo agregar como diferencia si realmente hay una discrepancia
        if (Math.abs(diff) > 0.01) {
          diferencias.push({
            medioPago: medio.nombre,
            esperado: medio.esperado,
            contado: contadoNum,
            diferencia: diff,
            significativa: Math.abs(diff) >= 200,
            tienePagosPendientes: hayVentasEsperadas && !hayConteoIngresado
          });
        }
      }
    });
    
    console.log('🔍 [CIERRE] Diferencias detectadas:', diferencias.map(d => ({
      medio: d.medioPago,
      diferencia: d.diferencia,
      diferenciaFinal: d.diferenciaFinal,
      significativa: d.significativa,
      tienePendientes: d.tienePagosPendientes,
      recupero: d.recuperoAplicado
    })));
    
    // 🆕 NUEVA LÓGICA: DETERMINACIÓN DE ESTADO DEL CIERRE
    const diferenciasMayores = diferencias.filter(d => d.significativa);
    const diferenciasPendientes = diferencias.filter(d => d.tienePagosPendientes);
    
    // 🔧 LÓGICA MEJORADA PARA PERMITIR CIERRE
    const shouldGenerateContingency = forzarContingencia || 
                                    resolverDiferenciasAutomaticamente || 
                                    diferenciasMayores.length > 0;
    
    // Si hay diferencias pendientes (medios con ventas pero sin conteo) y no se está forzando
    if (diferenciasPendientes.length > 0 && !forzarContingencia && !resolverDiferenciasAutomaticamente) {
      return NextResponse.json(
        { 
          error: 'Hay medios de pago con ventas pero sin conteo manual',
          diferencias: diferenciasPendientes.map(d => ({
            medioPago: d.medioPago,
            esperado: d.esperado,
            mensaje: `Se registraron ventas por $${d.esperado.toFixed(2)} pero no se ingresó el conteo manual`
          })),
          requiereConteo: true,
          mensaje: 'Complete el conteo de todos los medios de pago que tuvieron ventas'
        },
        { status: 400 }
      );
    }
    
    // Si hay diferencias significativas sin resolver y no se está forzando
    if (diferenciasMayores.length > 0 && !forzarContingencia && !resolverDiferenciasAutomaticamente) {
      return NextResponse.json(
        { 
          error: 'Hay diferencias significativas sin resolver',
          diferencias: diferenciasMayores.map(d => ({
            medioPago: d.medioPago,
            esperado: d.esperado,
            contado: d.contado,
            diferencia: d.diferencia,
            diferenciaFinal: d.diferenciaFinal ?? 0,
            mensaje: d.medioPago === 'Efectivo' && d.recuperoAplicado
              ? `Diferencia de ${d.diferencia > 0 ? '+' : ''}$${Math.abs(d.diferencia).toFixed(2)}, recupero $${d.recuperoAplicado.toFixed(2)}, diferencia final ${(d.diferenciaFinal ?? 0) > 0 ? '+' : ''}$${Math.abs(d.diferenciaFinal ?? 0).toFixed(2)}`
              : `Diferencia de ${d.diferencia > 0 ? '+' : ''}$${Math.abs(d.diferencia).toFixed(2)}`
          })),
          requiereConfirmacion: true,
          mensaje: 'Use "Cerrar Forzadamente" para generar contingencias automáticamente.'
        },
        { status: 400 }
      );
    }
    
    // 🆕 NUEVA LÓGICA: CÁLCULO DE ALERTAS Y PRÓXIMO TURNO SEGÚN MONTO INICIAL
    const efectivoFinalReal = conteoEfectivoNum; // Efectivo físico contado
    const efectivoParaProximoTurno = cierreCaja.montoInicial; // Usar monto inicial, no monto fijo
    
    let alertaMontoInsuficiente = '';
    let requiereRecuperoProximo = false;
    let sugerenciaProximaApertura = cierreCaja.montoInicial;
    
    // Calcular efectivo para sobre considerando que se deja el monto inicial para próximo turno
    const efectivoParaSobre = efectivoFinalReal - recuperoValidado - cierreCaja.montoInicial;
    
    // Si el efectivo final después de descontar todo es menor al monto inicial, generar alerta
    if (efectivoParaSobre < 0) {
      const faltante = Math.abs(efectivoParaSobre);
      requiereRecuperoProximo = true;
      alertaMontoInsuficiente = `No hay suficiente efectivo para mantener el monto inicial del próximo turno. Faltan $${faltante.toFixed(2)} para poder abrir con $${cierreCaja.montoInicial.toFixed(2)}`;
      sugerenciaProximaApertura = Math.max(0, efectivoFinalReal - totalEgresos - recuperoValidado);
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
          
          // 🔧 CÁLCULOS DE EFECTIVO CORREGIDOS
          totalEgresos,
          efectivoEsperado: efectivoEsperadoSinRecupero, // SIN recupero
          efectivoReal: conteoEfectivoNum,
          diferenciaEfectivo: diferenciaEfectivoFinal, // Diferencia FINAL (con recupero considerado)
          
          // 🆕 NUEVOS CAMPOS SEGÚN ESPECIFICACIONES
          montoFijoReferencia: montoFijo,
          requiereRecuperoProximo,
          alertaMontoInsuficiente: alertaMontoInsuficiente || null,
          esCierreConDiferencias: shouldGenerateContingency,
          razonCierreForzado: (forzarContingencia || resolverDiferenciasAutomaticamente) ? 
            `Diferencias resueltas automáticamente: ${diferencias.map(d => `${d.medioPago} ${d.diferencia > 0 ? '+' : ''}$${Math.abs(d.diferencia).toFixed(2)}`).join(', ')}` : 
            null,
          
          // Recupero de fondo
          recuperoFondo: recuperoValidado,
          
          // Estado y cierre
          montoFinal: conteoEfectivoNum,
          diferencia: diferenciaEfectivoFinal, // Usar diferencia final
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
          if (
            diff.medioPago === 'Efectivo' &&
            typeof diff.recuperoAplicado === 'number' &&
            typeof diff.diferenciaFinal === 'number'
          ) {
            detallesDiferencia.push(
              `${diff.medioPago}: Esperado $${diff.esperado.toFixed(2)}, Contado $${diff.contado.toFixed(2)}, Diferencia real ${diff.diferencia > 0 ? '+' : ''}$${diff.diferencia.toFixed(2)}, Recupero aplicado $${diff.recuperoAplicado.toFixed(2)}, Diferencia final ${diff.diferenciaFinal > 0 ? '+' : ''}$${diff.diferenciaFinal.toFixed(2)} ${esSignificativa}`
            );
          } else {
            detallesDiferencia.push(
              `${diff.medioPago}: Esperado $${diff.esperado.toFixed(2)}, Contado $${diff.contado.toFixed(2)}, Diferencia ${diff.diferencia > 0 ? '+' : ''}$${diff.diferencia.toFixed(2)} ${esSignificativa}`
            );
          }
        });
        
        const fechaFormateada = new Date().toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        const esUrgente = diferenciasMayores.length > 0 || Math.abs(diferenciaEfectivoFinal) > 500;
        
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
- Efectivo esperado (sin recupero): $${efectivoEsperadoSinRecupero.toFixed(2)}
- Efectivo contado: $${conteoEfectivoNum.toFixed(2)}
- Diferencia real: ${diferenciaEfectivoReal > 0 ? '+' : ''}$${diferenciaEfectivoReal.toFixed(2)}
- Diferencia final (con recupero): ${diferenciaEfectivoFinal > 0 ? '+' : ''}$${diferenciaEfectivoFinal.toFixed(2)}

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

${recuperoValidado > 0 ? `\n💰 RECUPERO DE FONDO APLICADO: $${recuperoValidado.toFixed(2)}\n- Se aplicó recupero porque se abrió con menos del monto fijo y hubo ventas en efectivo\n- El recupero ${recuperoJustificaDiferencia ? 'JUSTIFICA' : 'NO JUSTIFICA'} completamente la diferencia` : ''}

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
        ? `Caja cerrada correctamente. Las diferencias ${recuperoValidado > 0 ? 'fueron justificadas con recupero y ' : ''}son menores a $200.`
        : `Caja cerrada correctamente sin diferencias.`;
    
    const recuperoInfo = recuperoValidado > 0 
      ? ` Se aplicó recupero de $${recuperoValidado.toFixed(2)} que ${recuperoJustificaDiferencia ? 'justifica completamente' : 'justifica parcialmente'} las diferencias.` 
      : '';
    
    const alertaInfo = alertaMontoInsuficiente 
      ? ` ${alertaMontoInsuficiente}` 
      : '';
    
    console.log('✅ [CIERRE] Cierre completado exitosamente:', {
      id: result.id,
      estado: result.estado,
      contingenciaGenerada: shouldGenerateContingency,
      diferenciasEncontradas: diferencias.length,
      recuperoJustifica: recuperoJustificaDiferencia
    });
    
    return NextResponse.json({
      success: true,
      message: mensajeBase + recuperoInfo + alertaInfo,
      cierreCaja: result,
      contingenciaGenerada: shouldGenerateContingency,
      diferencias: {
        efectivo: {
          esperado: efectivoEsperadoSinRecupero,
          contado: conteoEfectivoNum,
          diferenciaReal: diferenciaEfectivoReal,
          diferenciaFinal: diferenciaEfectivoFinal,
          recuperoAplicado: recuperoValidado,
          recuperoJustifica: recuperoJustificaDiferencia
        },
        otrosMedios: diferencias.filter(d => d.medioPago !== 'Efectivo')
      },
      recuperoInfo: {
        aplicado: recuperoValidado,
        justificaDiferencia: recuperoJustificaDiferencia,
        razon: recuperoValidado > 0 ? 'Monto inicial menor al monto fijo con ventas en efectivo' : null
      },
      alertaProximoTurno: {
        requiereRecupero: requiereRecuperoProximo,
        alertaMontoInsuficiente,
        sugerenciaApertura: sugerenciaProximaApertura,
        montoFijoReferencia: montoFijo,
        montoInicialActual: cierreCaja.montoInicial
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
        montoInicialTurno: cierreCaja.montoInicial,
        efectivoParaSobre: efectivoParaSobre,
        cumpleMontoFijo: efectivoParaSobre >= 0
      }
    });
  } catch (error: any) {
    console.error('❌ [CIERRE] Error al cerrar caja:', error);
    return NextResponse.json(
      { error: error.message || 'Error al cerrar caja' },
      { status: 500 }
    );
  }
}