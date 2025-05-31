// src/server/services/facturacion/facturacionService.ts - VERSIÓN CORREGIDA SIN ERRORES TS
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import QRCode from 'qrcode';
import prisma from '@/server/db/client';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { AFIP_CONFIG } from '@/config/afip';

// 🔧 INTERFAZ PARA EL RESULTADO
interface FacturacionResult {
  success: boolean;
  message?: string;
  facturaId?: string;
  cae?: string; // Cambiado para aceptar string | undefined
  error?: any;
}

// 🔧 CONFIGURACIÓN DE DEBUGGING
const DEBUG_CONFIG = {
  enabled: process.env.FACTURACION_DEBUG === 'true' || process.env.NODE_ENV === 'development',
  logLevel: process.env.FACTURACION_LOG_LEVEL || 'INFO', // DEBUG, INFO, WARN, ERROR
  maxLogLength: parseInt(process.env.MAX_LOG_LENGTH || '10000'), // Límite de caracteres en logs
  saveToFile: process.env.SAVE_LOGS_TO_FILE === 'true'
};

export class FacturacionService {
  private afipClient: AfipSoapClient;
  private cuit: string;

  constructor(cuit: string) {
    this.cuit = cuit;
    this.afipClient = new AfipSoapClient(cuit);
  }

  /**
   * Sistema de logging mejorado para producción
   */
  private createLogger(sessionId: string, startTime: Date) {
    const logMessages: string[] = [];
    
    return {
      log: (message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'SUCCESS' | 'DEBUG' = 'INFO') => {
        // Filtrar por nivel en producción
        const levels = ['ERROR', 'WARN', 'INFO', 'SUCCESS', 'DEBUG'];
        const currentLevelIndex = levels.indexOf(DEBUG_CONFIG.logLevel);
        const messageLevelIndex = levels.indexOf(level);
        
        if (messageLevelIndex > currentLevelIndex && !DEBUG_CONFIG.enabled) {
          return; // No logear si está por debajo del nivel configurado
        }
        
        const timestamp = new Date().toISOString();
        const elapsed = `+${Date.now() - startTime.getTime()}ms`;
        const emoji = {
          'INFO': '📋',
          'ERROR': '❌',
          'WARN': '⚠️',
          'SUCCESS': '✅',
          'DEBUG': '🔍'
        }[level];
        
        const formattedMessage = `[${timestamp}][${sessionId}][${elapsed}] ${emoji} ${message}`;
        
        // Limitar longitud del mensaje
        const truncatedMessage = formattedMessage.length > 500 
          ? formattedMessage.substring(0, 500) + '...[TRUNCATED]'
          : formattedMessage;
        
        logMessages.push(truncatedMessage);
        
        // Solo hacer console.log en desarrollo o si está habilitado
        if (DEBUG_CONFIG.enabled || level === 'ERROR') {
          console.log(formattedMessage);
        }
        
        // Mantener solo los últimos N mensajes para evitar memoria excesiva
        if (logMessages.length > 100) {
          logMessages.splice(0, 50); // Eliminar los primeros 50
        }
      },
      
      getLogs: () => {
        const fullLog = logMessages.join('\n');
        return fullLog.length > DEBUG_CONFIG.maxLogLength 
          ? fullLog.substring(fullLog.length - DEBUG_CONFIG.maxLogLength)
          : fullLog;
      },
      
      getCompactLogs: () => {
        // Solo errores y éxitos para producción
        return logMessages
          .filter(msg => msg.includes('❌') || msg.includes('✅'))
          .join('\n');
      }
    };
  }

  /**
   * Genera el código QR requerido por AFIP
   */
  private async generarQR(factura: any): Promise<string> {
    try {
      const qrData = {
        ver: 1,
        fecha: factura.fechaEmision.toISOString().split('T')[0],
        cuit: this.cuit,
        ptoVta: factura.puntoVenta,
        tipoCmp: factura.tipoComprobante === 'A' ? 1 : 6,
        nroCmp: factura.numeroFactura,
        importe: factura.venta.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: factura.venta.clienteCuit ? 80 : 99,
        nroDocRec: factura.venta.clienteCuit || '0',
        tipoCodAut: 'E',
        codAut: factura.cae
      };

      const qrText = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
      const qrImage = await QRCode.toDataURL(qrText);
      return qrImage;
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  /**
   * Procesa una venta para generar factura electrónica - VERSIÓN CORREGIDA
   */
  public async generarFactura(ventaId: string): Promise<FacturacionResult> {
    const sessionId = uuidv4().substring(0, 8);
    const startTime = new Date();
    const logger = this.createLogger(sessionId, startTime);

    logger.log(`=== INICIO GENERACIÓN FACTURA ===`, 'INFO');
    logger.log(`Venta ID: ${ventaId}`, 'INFO');
    logger.log(`CUIT Servicio: ${this.cuit}`, 'INFO');
    logger.log(`Debug habilitado: ${DEBUG_CONFIG.enabled}`, 'DEBUG');

    let factura: any = null;
    let facturaId: string | null = null;
    let venta: any = null;
    let configAFIP: any = null;

    try {
      // 1. Verificar si ya existe factura
      logger.log(`Verificando factura existente...`, 'INFO');
      
      const facturaExistente = await prisma.facturaElectronica.findFirst({
        where: { 
          ventaId, 
          estado: { not: 'error' } 
        }
      });

      if (facturaExistente) {
        logger.log(`Factura existente: ${facturaExistente.id}`, 'SUCCESS');
        
        // 🔧 CORRECCIÓN: Manejo correcto de null/undefined
        const caeResult = facturaExistente.cae || undefined;
        
        return {
          success: true,
          message: 'La venta ya tiene una factura asociada',
          facturaId: facturaExistente.id,
          cae: caeResult // Ahora es string | undefined, no string | null
        };
      }

      // 2. Obtener datos de venta
      logger.log(`Cargando venta ${ventaId}...`, 'INFO');
      
      venta = await prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: { producto: true }
          },
          sucursal: true,
          pagos: true
        }
      });

      if (!venta) {
        throw new Error(`Venta no encontrada: ${ventaId}`);
      }

      logger.log(`Venta cargada: $${venta.total} - ${venta.sucursal.nombre}`, 'SUCCESS');

      // 3. Configuración AFIP
      logger.log(`Buscando config AFIP para sucursal ${venta.sucursalId}...`, 'INFO');
      
      configAFIP = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId: venta.sucursalId,
          activo: true
        }
      });

      if (!configAFIP) {
        throw new Error(`Sin configuración AFIP para sucursal ${venta.sucursalId}`);
      }

      logger.log(`Config AFIP: CUIT ${configAFIP.cuit}, PV ${configAFIP.puntoVenta}`, 'SUCCESS');

      // 4. Determinar tipo de comprobante
      let comprobanteTipo: number;
      let tipoComprobanteLetra: string;
      
      if (venta.clienteCuit && venta.clienteCuit.trim() !== '') {
        comprobanteTipo = AFIP_CONFIG.defaultValues.cbteTipos.A.factura;
        tipoComprobanteLetra = 'A';
      } else {
        comprobanteTipo = AFIP_CONFIG.defaultValues.cbteTipos.B.factura;
        tipoComprobanteLetra = 'B';
      }

      logger.log(`Tipo: ${tipoComprobanteLetra} (${comprobanteTipo})`, 'INFO');

      // 5. Validar topes
      if (tipoComprobanteLetra === 'B' && venta.total >= 15380) {
        throw new Error(`Factura B $${venta.total} supera tope $15.380 - Requiere CUIT`);
      }

      // 6. Crear factura en procesando
      facturaId = uuidv4();
      logger.log(`Creando factura ${facturaId}...`, 'INFO');
      
      factura = await prisma.facturaElectronica.create({
        data: {
          id: facturaId,
          ventaId: venta.id,
          sucursalId: venta.sucursalId,
          tipoComprobante: tipoComprobanteLetra,
          puntoVenta: configAFIP.puntoVenta,
          numeroFactura: 0,
          fechaEmision: new Date(),
          estado: 'procesando',
          logs: logger.getCompactLogs() // Solo logs importantes inicialmente
        }
      });

      logger.log(`Factura creada en 'procesando'`, 'SUCCESS');

let importeNeto: number;
let importeIVA: number;
let importeTotConc: number = 0;
let importeOpEx: number = 0;
let importeTrib: number = 0;

const importeTotal = Number(venta.total);

if (tipoComprobanteLetra === 'A') {
  // Factura A: IVA discriminado
  importeNeto = Math.round((importeTotal / 1.21) * 100) / 100;
  importeIVA = Math.round((importeTotal - importeNeto) * 100) / 100;
  importeTotConc = 0;
  
  // Verificar que los totales cuadren
  const verificacion = importeTotConc + importeNeto + importeOpEx + importeTrib + importeIVA;
  if (Math.abs(verificacion - importeTotal) > 0.02) {
    importeIVA = Math.round((importeTotal - importeNeto) * 100) / 100;
    logger.log(`Ajuste IVA Factura A: Neto=${importeNeto}, IVA=${importeIVA}, Total=${importeTotal}`, 'WARN');
  }
  
} else {
  importeNeto = 0;                    // ✅ No hay neto discriminado
  importeIVA = 0;                     // ✅ No hay IVA discriminado  
  importeTotConc = importeTotal;      // ✅ Todo como concepto no gravado
}

logger.log(`Cálculo ${tipoComprobanteLetra} - Neto: $${importeNeto}, IVA: $${importeIVA}, TotConc: $${importeTotConc}, Total: $${importeTotal}`, 'INFO');

// También actualiza la sección de alícuotas IVA:
const iva = [];
if (tipoComprobanteLetra === 'A' && importeIVA > 0) {
  // Solo para facturas A se discrimina el IVA
  iva.push({
    Id: AFIP_CONFIG.defaultValues.iva['21'], // ID 5 para 21%
    BaseImp: importeNeto,
    Importe: importeIVA
  });
}
// ✅ Para facturas B no se envían alícuotas IVA

logger.log(`Alícuotas IVA (${tipoComprobanteLetra}): ${iva.length > 0 ? JSON.stringify(iva) : 'Ninguna'}`, 'INFO');

      // 9. Documento del cliente
      const docTipo = venta.clienteCuit && venta.clienteCuit.trim() !== ''
        ? AFIP_CONFIG.defaultValues.docTipos.CUIT
        : AFIP_CONFIG.defaultValues.docTipos.consumidorFinal;
        
      const docNro = venta.clienteCuit && venta.clienteCuit.trim() !== '' 
        ? venta.clienteCuit.trim() 
        : '0';

      // 10. Preparar items
      const itemsFactura = venta.items.map((item: any) => {
        // Para facturas B, el precio ya incluye IVA
        const precioUnitario = tipoComprobanteLetra === 'A' 
          ? Number((item.precioUnitario / 1.21).toFixed(2))  // Sin IVA para factura A
          : Number(item.precioUnitario.toFixed(2));          // Con IVA para factura B
          
        return {
          descripcion: item.producto.nombre.substring(0, 40),
          cantidad: item.cantidad,
          precioUnitario: precioUnitario,
          bonificacion: item.descuento || 0,
          subtotal: Number((item.cantidad * precioUnitario * (1 - (item.descuento || 0) / 100)).toFixed(2))
        };
      });

      // 11. Fecha AFIP
      const fechaComprobante = format(new Date(), 'yyyyMMdd');

      try {
        // 12. Comunicación con AFIP
        logger.log(`Enviando a AFIP...`, 'INFO');
        
// En la llamada a AFIP, asegúrate de enviar los valores correctos:

const respuestaAFIP = await this.afipClient.createInvoice({
  puntoVenta: configAFIP.puntoVenta,
  comprobanteTipo: comprobanteTipo,
  concepto: AFIP_CONFIG.defaultValues.conceptos.productos,
  docTipo: docTipo,
  docNro: docNro,
  fechaComprobante: fechaComprobante,
  importeTotal: importeTotal,
  importeNeto: importeNeto,           // ✅ 0 para facturas B
  importeIVA: importeIVA,             // ✅ 0 para facturas B
  importeTotConc: importeTotConc,     // ✅ importeTotal para facturas B
  importeOpEx: importeOpEx,           // ✅ 0
  importeTrib: importeTrib,           // ✅ 0
  monedaId: 'PES',
  cotizacion: 1,
  iva: iva, // ✅ Array vacío para facturas B
  items: itemsFactura,
  clienteTipoDoc: docTipo,
  clienteEsResponsableInscripto: docTipo === 80
});

        logger.log(`Respuesta AFIP recibida`, 'SUCCESS');
        logger.log(`CAE: "${respuestaAFIP.CAE}" (${typeof respuestaAFIP.CAE})`, 'INFO');


if (!respuestaAFIP || respuestaAFIP.Resultado !== 'A') {
  const errorInfo = {
    resultado: respuestaAFIP?.Resultado,
    observaciones: respuestaAFIP?.Observaciones,
    errores: respuestaAFIP?.Errores || respuestaAFIP?.Errors
  };
  logger.log(`AFIP rechazó: ${JSON.stringify(errorInfo)}`, 'ERROR');
  throw new Error(`AFIP rechazó la factura: ${JSON.stringify(errorInfo)}`);
}

// 🔧 VERIFICACIÓN ROBUSTA DE CAE
let caeValidado: string | undefined;

// Intentar diferentes formatos de CAE que AFIP puede devolver
caeValidado = respuestaAFIP.CAE || respuestaAFIP.Cae || respuestaAFIP.cae;

if (caeValidado) {
  caeValidado = String(caeValidado).trim();
}

logger.log(`CAE extraído: "${caeValidado}" (tipo: ${typeof caeValidado})`, 'DEBUG');

// Solo fallar si definitivamente no hay CAE
if (!caeValidado || caeValidado === '' || caeValidado === 'undefined' || caeValidado === 'null' || caeValidado.length < 10) {
  logger.log(`CAE inválido: "${caeValidado}"`, 'ERROR');
  logger.log(`Respuesta completa AFIP: ${JSON.stringify(respuestaAFIP, null, 2)}`, 'ERROR');
  throw new Error(`CAE inválido recibido de AFIP: "${caeValidado}"`);
}
        const numeroFactura = Number(respuestaAFIP.CbteNro);
        if (!numeroFactura || numeroFactura <= 0) {
          throw new Error(`Número inválido: ${respuestaAFIP.CbteNro}`);
        }

        logger.log(`CAE válido: "${caeValidado}"`, 'SUCCESS');
        logger.log(`Número: ${numeroFactura}`, 'SUCCESS');

        // 14. Procesar fecha vencimiento
        const fechaVtoStr = String(respuestaAFIP.CAEFchVto);
        const fechaVencimiento = new Date(
          parseInt(fechaVtoStr.substring(0, 4)),
          parseInt(fechaVtoStr.substring(4, 6)) - 1,
          parseInt(fechaVtoStr.substring(6, 8))
        );

        // 15. Transacción atómica
        logger.log(`Guardando en BD...`, 'INFO');
        
        const facturaActualizada = await prisma.$transaction(async (tx) => {
          const facturaUpdate = await tx.facturaElectronica.update({
            where: { id: factura.id },
            data: {
              numeroFactura: numeroFactura,
              cae: caeValidado,
              vencimientoCae: fechaVencimiento,
              estado: 'completada',
              respuestaAFIP: respuestaAFIP,
              logs: logger.getLogs(),
              updatedAt: new Date()
            }
          });

          await tx.venta.update({
            where: { id: venta.id },
            data: {
              facturada: true,
              numeroFactura: `${configAFIP.puntoVenta.toString().padStart(5, '0')}-${numeroFactura.toString().padStart(8, '0')}`
            }
          });

          return facturaUpdate;
        }, {
          timeout: 30000,
          maxWait: 10000,
          isolationLevel: 'ReadCommitted'
        });

        // 16. Verificación post-transacción
        logger.log(`Verificando BD...`, 'INFO');
        
        const verificacion = await prisma.facturaElectronica.findUnique({
          where: { id: factura.id },
          select: { 
            id: true, 
            cae: true, 
            estado: true, 
            numeroFactura: true
          }
        });

        if (!verificacion) {
          throw new Error('Factura no encontrada después de transacción');
        }

        if (!verificacion.cae || verificacion.cae.trim() === '') {
          logger.log(`CAE no persistió, ejecutando fallback...`, 'WARN');
          
          const fallbackUpdate = await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: { 
              cae: caeValidado,
              estado: 'completada'
            }
          });
          
          logger.log(`Fallback CAE: "${fallbackUpdate.cae}"`, 'SUCCESS');
        }

        if (verificacion.estado !== 'completada') {
          throw new Error(`Estado incorrecto: ${verificacion.estado}`);
        }

        // 17. QR (no crítico)
        try {
          const qrData = await this.generarQR({
            ...facturaActualizada,
            cae: verificacion.cae,
            numeroFactura: verificacion.numeroFactura,
            fechaEmision: facturaActualizada.fechaEmision,
            venta: venta
          });
          
          await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: { qrData }
          });
          
          logger.log(`QR generado`, 'SUCCESS');
        } catch (qrError) {
          logger.log(`Error QR (no crítico): ${qrError}`, 'WARN');
        }


        logger.log(`COMPLETADO - CAE: "${verificacion.cae}"`, 'SUCCESS');

        // Guardar logs finales
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: { 
            logs: logger.getLogs()
          }
        });

        // 🔧 CORRECCIÓN: Retorno correcto con tipo string | undefined
        return {
          success: true,
          message: 'Factura generada correctamente',
          facturaId: factura.id,
          cae: verificacion.cae || undefined // Conversión explícita
        };

      } catch (afipError) {
        logger.log(`Error AFIP: ${afipError}`, 'ERROR');
        
        if (factura?.id) {
          await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: {
              estado: 'error',
              error: afipError instanceof Error ? afipError.message : 'Error AFIP',
              logs: logger.getLogs()
            }
          });
        }
        
        throw afipError;
      }

    } catch (error) {
      logger.log(`Error general: ${error}`, 'ERROR');
      
      // Guardar logs en caso de error
      try {
        if (facturaId) {
          await prisma.facturaElectronica.update({
            where: { id: facturaId },
            data: {
              logs: logger.getLogs(),
              estado: 'error',
              error: error instanceof Error ? error.message : 'Error desconocido'
            }
          });
        }
      } catch (dbError) {
        logger.log(`Error guardando logs: ${dbError}`, 'WARN');
      }
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error,
        facturaId: facturaId || undefined
      };
    }
  }

  /**
   * Obtiene estadísticas de facturación - VERSIÓN CORREGIDA
   */
  public async obtenerEstadisticas(fechaDesde?: Date, fechaHasta?: Date): Promise<{
    totalFacturas: number;
    completadas: number;
    pendientes: number;
    errores: number;
    montoTotal: number;
  }> {
    try {
      const configsAFIP = await prisma.configuracionAFIP.findMany({
        where: { cuit: this.cuit, activo: true }
      });

      if (configsAFIP.length === 0) {
        return {
          totalFacturas: 0,
          completadas: 0,
          pendientes: 0,
          errores: 0,
          montoTotal: 0
        };
      }

      const sucursalIds = configsAFIP.map(c => c.sucursalId);
      
      const where: any = {
        sucursalId: { in: sucursalIds }
      };

      if (fechaDesde || fechaHasta) {
        where.createdAt = {};
        if (fechaDesde) where.createdAt.gte = fechaDesde;
        if (fechaHasta) where.createdAt.lte = fechaHasta;
      }

      // 🔧 CORRECCIÓN: Query separada para el monto total
      const [facturas, ventasCompletadas] = await Promise.all([
        prisma.facturaElectronica.findMany({
          where,
          select: {
            estado: true
          }
        }),
        // Query corregida para obtener el total de ventas
        prisma.venta.aggregate({
          where: {
            facturaElectronica: {
              sucursalId: { in: sucursalIds },
              estado: 'completada',
              ...(fechaDesde || fechaHasta ? {
                createdAt: {
                  ...(fechaDesde && { gte: fechaDesde }),
                  ...(fechaHasta && { lte: fechaHasta })
                }
              } : {})
            }
          },
          _sum: {
            total: true
          }
        })
      ]);

      const estadisticas = facturas.reduce((acc, f) => {
        acc.totalFacturas++;
        switch (f.estado) {
          case 'completada':
            acc.completadas++;
            break;
          case 'pendiente':
          case 'procesando':
            acc.pendientes++;
            break;
          case 'error':
            acc.errores++;
            break;
        }
        return acc;
      }, {
        totalFacturas: 0,
        completadas: 0,
        pendientes: 0,
        errores: 0,
        montoTotal: 0
      });

      // 🔧 CORRECCIÓN: Manejo seguro de undefined
      estadisticas.montoTotal = Number(ventasCompletadas._sum.total || 0);

      return estadisticas;
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ... resto de métodos igual (obtenerFactura, regenerarQR, etc.)
  public async obtenerFactura(facturaId: string) {
    try {
      const factura = await prisma.facturaElectronica.findUnique({
        where: { id: facturaId },
        include: {
          venta: {
            include: {
              items: { include: { producto: true } },
              sucursal: true,
              pagos: true
            }
          }
        }
      });

      if (!factura) {
        throw new Error(`Factura no encontrada: ${facturaId}`);
      }

      return factura;
    } catch (error) {
      console.error('Error obteniendo factura:', error);
      throw error;
    }
  }

  public async regenerarQR(facturaId: string): Promise<boolean> {
    try {
      const factura = await prisma.facturaElectronica.findUnique({
        where: { id: facturaId },
        include: { venta: true }
      });

      if (!factura || !factura.cae) {
        return false;
      }

      const configAFIP = await prisma.configuracionAFIP.findFirst({
        where: { sucursalId: factura.sucursalId }
      });

      if (!configAFIP) {
        return false;
      }

      const qrData = await this.generarQR({
        ...factura,
        cuit: configAFIP.cuit
      });

      await prisma.facturaElectronica.update({
        where: { id: facturaId },
        data: { qrData }
      });

      return true;
    } catch (error) {
      console.error('Error regenerando QR:', error);
      return false;
    }
  }

  public async verificarEstadoServicio() {
    try {
      const estado = await this.afipClient.getServerStatus();
      return {
        ...estado,
        status: estado.AppServer === 'OK' && estado.DbServer === 'OK' && estado.AuthServer === 'OK'
      };
    } catch (error) {
      console.error('Error verificando estado AFIP:', error);
      return {
        AppServer: 'ERROR',
        DbServer: 'ERROR',
        AuthServer: 'ERROR',
        status: false
      };
    }
  }

  public async diagnosticarConectividad() {
    try {
      return await this.afipClient.verificarConectividad();
    } catch (error) {
      console.error('Error en diagnóstico:', error);
      return {
        servidor: false,
        autenticacion: false,
        ultimoComprobante: false,
        errores: [error instanceof Error ? error.message : 'Error desconocido']
      };
    }
  }

/**
 * Procesar facturas en estado procesando que están colgadas
 */
public async procesarFacturasColgadas(): Promise<{
  procesadas: number;
  exitosas: number;
  errores: number;
  detalles: any[];
}> {
  const sessionId = uuidv4().substring(0, 8);
  const startTime = new Date();
  const logger = this.createLogger(sessionId, startTime);

  logger.log('=== PROCESANDO FACTURAS COLGADAS ===', 'INFO');

  try {
    // Buscar facturas en procesando por más de 5 minutos
    const facturasColgadas = await prisma.facturaElectronica.findMany({
      where: {
        estado: 'procesando',
        updatedAt: { lt: new Date(Date.now() - 5 * 60 * 1000) }
      },
      include: {
        venta: { include: { items: true, sucursal: true } }
      },
      take: 10
    });

    logger.log(`Encontradas ${facturasColgadas.length} facturas colgadas`, 'INFO');

    const resultados = [];
    let exitosas = 0;
    let errores = 0;

    for (const factura of facturasColgadas) {
      try {
        logger.log(`Reprocesando factura ${factura.id}`, 'INFO');
        
        // Resetear estado a pendiente
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: { 
            estado: 'pendiente',
            error: null,
            logs: `${factura.logs || ''}\n[REINTENTO] ${new Date().toISOString()}: Reintentando factura colgada`
          }
        });

        // Intentar procesar nuevamente
        const resultado = await this.generarFactura(factura.ventaId);
        
        const facturaVerificada = await prisma.facturaElectronica.findUnique({
          where: { id: factura.id },
          select: { cae: true, estado: true }
        });
        
        if (facturaVerificada?.cae && facturaVerificada.cae.trim() !== '') {
          exitosas++;
          resultados.push({
            facturaId: factura.id,
            estado: 'exitosa',
            cae: facturaVerificada.cae
          });
        } else {
          errores++;
          resultados.push({
            facturaId: factura.id,
            estado: 'falso_positivo',
            error: 'Sistema reportó éxito pero no hay CAE'
          });
        }
      }
        catch (error) {
        errores++;
        logger.log(`Error reprocesando ${factura.id}: ${error}`, 'ERROR');
        resultados.push({
          facturaId: factura.id,
          estado: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
      }
    }

    return {
      procesadas: facturasColgadas.length,
      exitosas,
      errores,
      detalles: resultados
    };
  } catch (error) {
    logger.log(`Error general: ${error}`, 'ERROR');
    throw error;
  }
}

}