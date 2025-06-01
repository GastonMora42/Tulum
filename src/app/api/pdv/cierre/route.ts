// src/app/api/pdv/cierre/route.ts - VERSIÓN PROFESIONAL MEJORADA
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
    
    // 🔍 BUSCAR CAJA ABIERTA ACTUAL
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
    
    // 📊 OBTENER VENTAS Y CALCULAR TOTALES POR MEDIO DE PAGO
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
    
    // 💰 CALCULAR TOTALES POR MEDIO DE PAGO
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
    
    // 🧮 CALCULAR EGRESOS TOTALES
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    
    // 💵 CALCULAR EFECTIVO ESPERADO
    const ventasEfectivo = totalesPorMedioPago['efectivo']?.monto || 0;
    const efectivoEsperado = cierreCaja.montoInicial + ventasEfectivo - totalEgresos;
    
    // 🔄 VERIFICAR SI HAY SALDO PENDIENTE DE TURNO ANTERIOR
    const ultimoCierre = await prisma.cierreCaja.findFirst({
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
      cierreCaja,
      ventasResumen: {
        total: totalVentas,
        cantidadVentas: ventas.length,
        totalesPorMedioPago,
        totalEgresos,
        efectivoEsperado,
        saldoPendienteAnterior: ultimoCierre?.saldoPendienteActual || 0
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
      // 🆕 CONTEOS MANUALES POR MEDIO DE PAGO
      conteoEfectivo,
      conteoTarjetaCredito,
      conteoTarjetaDebito,
      conteoTransferencia,
      conteoQR,
      conteoOtros,
      // 🆕 RECUPERO DE FONDO
      recuperoFondo = 0
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
    if (isNaN(conteoEfectivoNum) || conteoEfectivoNum < 0) {
      return NextResponse.json(
        { error: 'El conteo de efectivo debe ser un número válido mayor o igual a cero' },
        { status: 400 }
      );
    }
    
    // 🔍 OBTENER CAJA Y VALIDAR
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
    
    // 📊 RECALCULAR TODOS LOS TOTALES
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
    
    // 💰 CALCULAR VENTAS POR MEDIO DE PAGO
    let ventasEfectivo = 0;
    let ventasTarjetaCredito = 0;
    let ventasTarjetaDebito = 0;
    let ventasTransferencia = 0;
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
          case 'transferencia':
            ventasTransferencia += pago.monto;
            break;
          case 'qr':
            ventasQR += pago.monto;
            break;
          default:
            ventasOtros += pago.monto;
        }
      }
    }
    
    // 🧮 CALCULAR EGRESOS Y EFECTIVO ESPERADO
    const totalEgresos = cierreCaja.egresos.reduce((sum, egreso) => sum + egreso.monto, 0);
    const efectivoEsperado = cierreCaja.montoInicial + ventasEfectivo - totalEgresos - recuperoFondo;
    const diferenciaEfectivo = conteoEfectivoNum - efectivoEsperado;
    
    // 🔍 VERIFICAR DIFERENCIAS EN OTROS MEDIOS DE PAGO
    const diferencias: Array<{
      medioPago: string;
      esperado: number;
      contado: number;
      diferencia: number;
    }> = [];
    
    if (conteoTarjetaCredito !== undefined && Math.abs(conteoTarjetaCredito - ventasTarjetaCredito) > 0.01) {
      diferencias.push({
        medioPago: 'Tarjeta de Crédito',
        esperado: ventasTarjetaCredito,
        contado: conteoTarjetaCredito,
        diferencia: conteoTarjetaCredito - ventasTarjetaCredito
      });
    }
    
    if (conteoTarjetaDebito !== undefined && Math.abs(conteoTarjetaDebito - ventasTarjetaDebito) > 0.01) {
      diferencias.push({
        medioPago: 'Tarjeta de Débito',
        esperado: ventasTarjetaDebito,
        contado: conteoTarjetaDebito,
        diferencia: conteoTarjetaDebito - ventasTarjetaDebito
      });
    }
    
    // 🚨 DETERMINAR SI SE REQUIERE CONTINGENCIA
    const diferenciaAbsEfectivo = Math.abs(diferenciaEfectivo);
    const hayDiferenciasOtrosMedios = diferencias.length > 0;
    const shouldGenerateContingency = diferenciaAbsEfectivo > 200 || diferencias.some(d => Math.abs(d.diferencia) > 200);
    
    // 💸 CALCULAR SALDO PARA PRÓXIMO TURNO
    let saldoPendienteActual = 0;
    let sugerenciaProximaApertura = 5000; // Valor base sugerido
    let requiereRecupero = false;
    
    if (efectivoEsperado < 0) {
      // Caja negativa - se necesitará recupero
      saldoPendienteActual = Math.abs(efectivoEsperado);
      requiereRecupero = true;
      sugerenciaProximaApertura = 5000 + saldoPendienteActual;
    } else if (efectivoEsperado < 2000) {
      // Poco efectivo - sugerir más para el próximo turno
      sugerenciaProximaApertura = 5000;
    } else {
      // Efectivo suficiente
      sugerenciaProximaApertura = Math.max(3000, efectivoEsperado * 0.6);
    }
    
    const user = (req as any).user;
    
    // 🗃️ ACTUALIZAR CAJA EN LA BASE DE DATOS
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar el cierre de caja
      const cierreCajaUpdated = await tx.cierreCaja.update({
        where: { id },
        data: {
          // Conteos manuales
          conteoEfectivo: conteoEfectivoNum,
          conteoTarjetaCredito: conteoTarjetaCredito || 0,
          conteoTarjetaDebito: conteoTarjetaDebito || 0,
          conteoTransferencia: conteoTransferencia || 0,
          conteoQR: conteoQR || 0,
          conteoOtros: conteoOtros || 0,
          
          // Cálculos de efectivo
          totalEgresos,
          efectivoEsperado,
          efectivoReal: conteoEfectivoNum,
          diferenciaEfectivo,
          
          // Recupero de fondo
          recuperoFondo,
          saldoPendienteActual,
          sugerenciaProximaApertura,
          requiereRecupero,
          
          // Estado y cierre
          montoFinal: conteoEfectivoNum,
          diferencia: diferenciaEfectivo,
          fechaCierre: new Date(),
          usuarioCierre: user.id,
          estado: shouldGenerateContingency ? 'con_contingencia' : 'cerrado',
          observaciones: observaciones || null
        }
      });
      
      // 🚨 GENERAR CONTINGENCIA SI ES NECESARIO
      if (shouldGenerateContingency) {
        const detallesDiferencia = [];
        
        if (diferenciaAbsEfectivo > 1) {
          detallesDiferencia.push(
            `💵 EFECTIVO: Esperado $${efectivoEsperado.toFixed(2)}, Contado $${conteoEfectivoNum.toFixed(2)}, Diferencia ${diferenciaEfectivo > 0 ? '+' : ''}$${diferenciaEfectivo.toFixed(2)}`
          );
        }
        
        diferencias.forEach(diff => {
          detallesDiferencia.push(
            `💳 ${diff.medioPago.toUpperCase()}: Esperado $${diff.esperado.toFixed(2)}, Contado $${diff.contado.toFixed(2)}, Diferencia ${diff.diferencia > 0 ? '+' : ''}$${diff.diferencia.toFixed(2)}`
          );
        });
        
        const fechaFormateada = new Date().toLocaleString('es-ES', { 
          day: '2-digit', 
          month: '2-digit', 
          year: 'numeric', 
          hour: '2-digit', 
          minute: '2-digit' 
        });
        
        await tx.contingencia.create({
          data: {
            titulo: `Diferencias en Cierre de Caja - ${fechaFormateada}`,
            descripcion: `
🏪 CIERRE DE CAJA CON DIFERENCIAS

📅 Fecha: ${fechaFormateada}
🏪 Sucursal: ${cierreCaja.sucursalId}
👤 Cerrado por: ${user.name} (${user.email})

💰 RESUMEN DEL TURNO:
- Monto inicial: $${cierreCaja.montoInicial.toFixed(2)}
- Ventas en efectivo: $${ventasEfectivo.toFixed(2)}
- Total egresos: $${totalEgresos.toFixed(2)}
- Recupero de fondo: $${recuperoFondo.toFixed(2)}
- Efectivo esperado: $${efectivoEsperado.toFixed(2)}

🔍 DIFERENCIAS ENCONTRADAS:
${detallesDiferencia.join('\n')}

📊 DETALLE DE VENTAS POR MEDIO DE PAGO:
${Object.entries(detallesPorMedioPago).map(([medio, datos]) => 
  `• ${medio}: $${datos.monto.toFixed(2)} (${datos.cantidad} transacciones)`
).join('\n')}

📋 EGRESOS DEL TURNO:
${cierreCaja.egresos.map(egreso => 
  `• ${egreso.motivo}: $${egreso.monto.toFixed(2)} - ${new Date(egreso.fecha).toLocaleTimeString()}`
).join('\n') || 'Sin egresos registrados'}

${observaciones ? `\n📝 OBSERVACIONES DEL VENDEDOR:\n${observaciones}` : ''}

🔧 ACCIONES REQUERIDAS:
- Verificar el conteo de efectivo y otros medios de pago
- Revisar si hay movimientos no registrados
- Investigar posibles errores en el registro de ventas o egresos
- Documentar las correcciones realizadas
- Ajustar el sistema si corresponde

${requiereRecupero ? `\n⚠️ IMPORTANTE: Este turno generó un saldo negativo de $${saldoPendienteActual.toFixed(2)} que debe ser recuperado en el próximo turno.` : ''}
            `.trim(),
            origen: 'sucursal',
            creadoPor: user.id,
            estado: 'pendiente',
            tipo: 'caja',
            ubicacionId: cierreCaja.sucursalId,
            urgente: diferenciaAbsEfectivo > 50 || diferencias.some(d => Math.abs(d.diferencia) > 100)
          }
        });
      }
      
      // 💳 REGISTRAR RECUPERO DE FONDO SI APLICA
      if (recuperoFondo > 0) {
        // Buscar la caja que generó el saldo negativo
        const cierreCajaAnterior = await tx.cierreCaja.findFirst({
          where: {
            sucursalId: cierreCaja.sucursalId,
            saldoPendienteActual: { gt: 0 },
            fechaCierre: { not: null }
          },
          orderBy: {
            fechaCierre: 'desc'
          }
        });
        
        if (cierreCajaAnterior) {
          await tx.recuperoFondo.create({
            data: {
              cierreCajaId: cierreCaja.id,
              cierreCajaOrigenId: cierreCajaAnterior.id,
              monto: recuperoFondo,
              usuarioId: user.id,
              observaciones: `Recupero de fondo del turno ${new Date(cierreCajaAnterior.fechaApertura).toLocaleDateString()}`
            }
          });
          
          // Actualizar el saldo pendiente de la caja anterior
          await tx.cierreCaja.update({
            where: { id: cierreCajaAnterior.id },
            data: {
              saldoPendienteActual: Math.max(0, cierreCajaAnterior.saldoPendienteActual - recuperoFondo)
            }
          });
        }
      }
      
      return cierreCajaUpdated;
    });
    
    // 📄 PREPARAR RESPUESTA COMPLETA
    return NextResponse.json({
      success: true,
      message: shouldGenerateContingency 
        ? `Caja cerrada con diferencias. Se ha generado una contingencia para revisión.${requiereRecupero ? ` IMPORTANTE: Se requiere recupero de $${saldoPendienteActual.toFixed(2)} en el próximo turno.` : ''}`
        : `Caja cerrada correctamente sin diferencias.${requiereRecupero ? ` Se requiere recupero de $${saldoPendienteActual.toFixed(2)} en el próximo turno.` : ''}`,
      cierreCaja: result,
      contingenciaGenerada: shouldGenerateContingency,
      diferencias: {
        efectivo: {
          esperado: efectivoEsperado,
          contado: conteoEfectivoNum,
          diferencia: diferenciaEfectivo
        },
        otrosMedios: diferencias
      },
      recuperoInfo: {
        requiereRecupero,
        saldoPendiente: saldoPendienteActual,
        sugerenciaProximaApertura
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