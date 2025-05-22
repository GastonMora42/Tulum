// src/server/services/facturacion/facturacionService.ts - VERSIÓN COMPLETA MEJORADA
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import QRCode from 'qrcode';
import prisma from '@/server/db/client';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { AFIP_CONFIG } from '@/config/afip';

export class FacturacionService {
  private afipClient: AfipSoapClient;
  private cuit: string;

  constructor(cuit: string) {
    this.cuit = cuit;
    this.afipClient = new AfipSoapClient(cuit);
  }

  /**
   * Genera el código QR requerido por AFIP
   */
  private async generarQR(factura: any): Promise<string> {
    try {
      // Datos según especificación AFIP para QR
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
   * Procesa una venta para generar factura electrónica - VERSIÓN COMPLETA MEJORADA
   */
  public async generarFactura(ventaId: string): Promise<{
    success: boolean;
    message?: string;
    facturaId?: string;
    cae?: string;
    error?: any;
  }> {
    const logMessages: string[] = [];
    const sessionId = uuidv4().substring(0, 8);
    const logTime = new Date().toISOString();

    const log = (message: string, level: 'INFO' | 'ERROR' | 'WARN' | 'SUCCESS' = 'INFO') => {
      const emoji = {
        'INFO': '📋',
        'ERROR': '❌',
        'WARN': '⚠️',
        'SUCCESS': '✅'
      }[level];
      
      const formattedMessage = `[${logTime}][${sessionId}] ${emoji} ${message}`;
      logMessages.push(formattedMessage);
      console.log(formattedMessage);
    };

    log(`Iniciando generación de factura para venta: ${ventaId}`, 'INFO');

    // Variables para tracking
    let factura: any = null;
    let facturaId: string | null = null;

    try {
      // 1. Verificar si ya existe factura para esta venta
      log(`Verificando si la venta ${ventaId} ya tiene factura asociada`);
      
      const facturaExistente = await prisma.facturaElectronica.findFirst({
        where: { 
          ventaId, 
          estado: { not: 'error' } 
        }
      });

      if (facturaExistente) {
        log(`La venta ${ventaId} ya tiene factura: ${facturaExistente.id} (Estado: ${facturaExistente.estado})`, 'SUCCESS');
        return {
          success: true,
          message: 'La venta ya tiene una factura asociada',
          facturaId: facturaExistente.id,
          cae: facturaExistente.cae || undefined
        };
      }

      // 2. Obtener datos completos de la venta
      log(`Obteniendo datos completos de la venta ${ventaId}`);
      
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          sucursal: true,
          pagos: true
        }
      });

      if (!venta) {
        const errorMsg = `Venta no encontrada con ID: ${ventaId}`;
        log(errorMsg, 'ERROR');
        throw new Error(errorMsg);
      }

      log(`Venta encontrada:`, 'SUCCESS');
      log(`   - Sucursal: ${venta.sucursal.nombre} (${venta.sucursalId})`);
      log(`   - Total: $${venta.total}`);
      log(`   - Cliente: ${venta.clienteNombre || 'Consumidor Final'}`);
      log(`   - CUIT: ${venta.clienteCuit || 'N/A'}`);
      log(`   - Items: ${venta.items.length}`);
      log(`   - Pagos: ${venta.pagos.length}`);

      // 3. Obtener configuración AFIP para esta sucursal
      log(`Obteniendo configuración AFIP para sucursal ${venta.sucursalId}`);
      
      const configAFIP = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId: venta.sucursalId,
          activo: true
        }
      });

      if (!configAFIP) {
        const errorMsg = `No hay configuración AFIP activa para la sucursal ${venta.sucursalId}`;
        log(errorMsg, 'ERROR');
        throw new Error(errorMsg);
      }

      log(`Configuración AFIP encontrada:`, 'SUCCESS');
      log(`   - CUIT: ${configAFIP.cuit}`);
      log(`   - Punto de Venta: ${configAFIP.puntoVenta}`);

      // 4. Determinar tipo de comprobante
      let comprobanteTipo: number;
      let tipoComprobanteLetra: string;
      
      if (venta.clienteCuit && venta.clienteCuit.trim() !== '') {
        // Cliente con CUIT = Factura A
        comprobanteTipo = AFIP_CONFIG.defaultValues.cbteTipos.A.factura; // 1
        tipoComprobanteLetra = 'A';
      } else {
        // Consumidor final = Factura B
        comprobanteTipo = AFIP_CONFIG.defaultValues.cbteTipos.B.factura; // 6
        tipoComprobanteLetra = 'B';
      }

      log(`Tipo de comprobante determinado: ${tipoComprobanteLetra} (código ${comprobanteTipo})`, 'SUCCESS');

      // 5. Validar topes para consumidor final
      if (tipoComprobanteLetra === 'B' && venta.total >= 15380) {
        const errorMsg = `Para facturas B de $${venta.total}, se requiere identificar al cliente con CUIT/DNI (tope actual: $15.380)`;
        log(errorMsg, 'ERROR');
        throw new Error(errorMsg);
      }

      // 6. Crear factura en estado procesando
      facturaId = uuidv4();
      log(`Creando registro de factura con ID: ${facturaId}`);
      
      factura = await prisma.facturaElectronica.create({
        data: {
          id: facturaId,
          ventaId: venta.id,
          sucursalId: venta.sucursalId,
          tipoComprobante: tipoComprobanteLetra,
          puntoVenta: configAFIP.puntoVenta,
          numeroFactura: 0, // Se actualiza después
          fechaEmision: new Date(),
          estado: 'procesando',
          logs: logMessages.join('\n')
        }
      });

      log(`Factura creada en estado 'procesando'`, 'SUCCESS');

      // 7. Calcular totales según tipo de factura
      let importeNeto: number;
      let importeIVA: number;
      const importeTotal = Number(venta.total);

      if (tipoComprobanteLetra === 'A') {
        // Factura A: separar neto e IVA (21%)
        importeNeto = Number((importeTotal / 1.21).toFixed(2));
        importeIVA = Number((importeTotal - importeNeto).toFixed(2));
        log(`Factura A - Neto: $${importeNeto}, IVA (21%): $${importeIVA}, Total: $${importeTotal}`);
      } else {
        // Factura B: todo incluido
        importeNeto = importeTotal;
        importeIVA = 0;
        log(`Factura B - Total con IVA incluido: $${importeTotal}`);
      }

      // 8. Preparar alícuotas de IVA
      const iva = [];
      if (tipoComprobanteLetra === 'A' && importeIVA > 0) {
        iva.push({
          Id: AFIP_CONFIG.defaultValues.iva['21'], // 5 = 21%
          BaseImp: importeNeto,
          Importe: importeIVA
        });
        log(`Alícuota IVA agregada: ID 5 (21%), Base: $${importeNeto}, Importe: $${importeIVA}`);
      }

      // 9. Determinar tipo y número de documento
      const docTipo = venta.clienteCuit && venta.clienteCuit.trim() !== ''
        ? AFIP_CONFIG.defaultValues.docTipos.CUIT // 80
        : AFIP_CONFIG.defaultValues.docTipos.consumidorFinal; // 99
        
      const docNro = venta.clienteCuit && venta.clienteCuit.trim() !== '' 
        ? venta.clienteCuit.trim() 
        : '0';

      log(`Documento cliente: Tipo ${docTipo}, Número: ${docNro}`);

      // 10. Preparar items para AFIP
      const itemsFactura = venta.items.map((item, index) => {
        const precioUnitario = tipoComprobanteLetra === 'A' 
          ? Number((item.precioUnitario / 1.21).toFixed(2))
          : Number(item.precioUnitario.toFixed(2));
          
        const subtotal = Number((item.cantidad * precioUnitario * (1 - (item.descuento || 0) / 100)).toFixed(2));
        
        log(`   Item ${index + 1}: ${item.producto.nombre} - Cant: ${item.cantidad}, P.Unit: $${precioUnitario}, Subtotal: $${subtotal}`);
        
        return {
          descripcion: item.producto.nombre.substring(0, 40), // Límite AFIP
          cantidad: item.cantidad,
          precioUnitario: precioUnitario,
          bonificacion: item.descuento || 0,
          subtotal: subtotal
        };
      });

      // 11. Preparar fecha en formato AFIP
      const fechaComprobante = format(new Date(), 'yyyyMMdd');
      log(`Fecha comprobante: ${fechaComprobante}`);

      try {
        // 12. Actualizar logs antes de comunicarse con AFIP
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: { 
            logs: logMessages.join('\n'),
            updatedAt: new Date()
          }
        });
        
        // 13. Enviar solicitud a AFIP
        log(`Enviando solicitud de CAE a AFIP...`);
        log(`Parámetros de facturación:`);
        log(`   - Punto de Venta: ${configAFIP.puntoVenta}`);
        log(`   - Tipo Comprobante: ${comprobanteTipo}`);
        log(`   - Concepto: ${AFIP_CONFIG.defaultValues.conceptos.productos} (Productos)`);
        log(`   - Documento: Tipo ${docTipo}, Nro ${docNro}`);
        log(`   - Importes: Total $${importeTotal}, Neto $${importeNeto}, IVA $${importeIVA}`);
        
        const respuestaAFIP = await this.afipClient.createInvoice({
          puntoVenta: configAFIP.puntoVenta,
          comprobanteTipo: comprobanteTipo,
          concepto: AFIP_CONFIG.defaultValues.conceptos.productos, // 1 = Productos
          docTipo: docTipo,
          docNro: docNro,
          fechaComprobante: fechaComprobante,
          importeTotal: importeTotal,
          importeNeto: importeNeto,
          importeIVA: importeIVA,
          monedaId: 'PES', // Pesos argentinos
          cotizacion: 1,
          iva: iva,
          items: itemsFactura
        });

        log(`Respuesta recibida de AFIP:`, 'SUCCESS');
        log(`   - Resultado: ${respuestaAFIP.Resultado}`);
        log(`   - CAE: ${respuestaAFIP.CAE || 'No obtenido'}`);
        log(`   - Número: ${respuestaAFIP.CbteNro || 'No asignado'}`);

        // 14. Verificación estricta de la respuesta
        if (!respuestaAFIP) {
          throw new Error('AFIP devolvió respuesta nula o indefinida');
        }

        if (respuestaAFIP.Resultado !== 'A') {
          const errorDetails = {
            resultado: respuestaAFIP.Resultado,
            errores: respuestaAFIP.Errores,
            observaciones: respuestaAFIP.Observaciones
          };
          log(`AFIP rechazó la factura: ${JSON.stringify(errorDetails, null, 2)}`, 'ERROR');
          throw new Error(`AFIP rechazó la factura. Resultado: ${respuestaAFIP.Resultado}. Detalles: ${JSON.stringify(errorDetails)}`);
        }

        if (!respuestaAFIP.CAE || respuestaAFIP.CAE.trim() === '') {
          log(`CAE vacío o nulo en respuesta de AFIP`, 'ERROR');
          log(`Respuesta completa para debug: ${JSON.stringify(respuestaAFIP, null, 2)}`, 'ERROR');
          throw new Error('AFIP no devolvió CAE válido en la respuesta');
        }

        if (!respuestaAFIP.CbteNro) {
          log(`Número de comprobante vacío o nulo en respuesta de AFIP`, 'ERROR');
          throw new Error('AFIP no devolvió número de comprobante en la respuesta');
        }

        log(`VALIDACIONES AFIP EXITOSAS:`, 'SUCCESS');
        log(`   - CAE válido: ${respuestaAFIP.CAE}`);
        log(`   - Número válido: ${respuestaAFIP.CbteNro}`);
        log(`   - Fecha vencimiento: ${respuestaAFIP.CAEFchVto}`);

        // 15. Procesar fecha de vencimiento CAE
        const fechaVencimiento = new Date(
          parseInt(respuestaAFIP.CAEFchVto.substring(0, 4)),
          parseInt(respuestaAFIP.CAEFchVto.substring(4, 6)) - 1,
          parseInt(respuestaAFIP.CAEFchVto.substring(6, 8))
        );

        log(`Fecha vencimiento CAE procesada: ${fechaVencimiento.toISOString()}`);

        // 16. Usar transacción atómica para garantizar consistencia
        log(`Iniciando transacción para actualizar factura...`);
        
        const facturaActualizada = await prisma.$transaction(async (tx) => {
          log(`Actualizando factura con CAE: ${respuestaAFIP.CAE}`);
          
          const facturaUpdate = await tx.facturaElectronica.update({
            where: { id: factura.id },
            data: {
              numeroFactura: parseInt(respuestaAFIP.CbteNro),
              cae: respuestaAFIP.CAE.trim(),
              vencimientoCae: fechaVencimiento,
              estado: 'completada',
              respuestaAFIP: respuestaAFIP,
              logs: logMessages.join('\n'),
              updatedAt: new Date()
            },
            include: {
              venta: true
            }
          });

          log(`Factura actualizada en BD con ID: ${facturaUpdate.id}`, 'SUCCESS');
          log(`CAE guardado: ${facturaUpdate.cae}`, 'SUCCESS');
          log(`Estado: ${facturaUpdate.estado}`, 'SUCCESS');
          log(`Número factura: ${facturaUpdate.numeroFactura}`, 'SUCCESS');

          // Marcar venta como facturada en la misma transacción
          log(`Marcando venta ${venta.id} como facturada...`);
          
          await tx.venta.update({
            where: { id: venta.id },
            data: {
              facturada: true,
              numeroFactura: `${configAFIP.puntoVenta.toString().padStart(5, '0')}-${respuestaAFIP.CbteNro.toString().padStart(8, '0')}`
            }
          });

          log(`Venta marcada como facturada`, 'SUCCESS');
          
          return facturaUpdate;
        }, {
          timeout: 15000 // 15 segundos de timeout
        });

        // 17. Verificación post-transacción
        log(`Verificando factura actualizada en BD...`);
        
        const verificacion = await prisma.facturaElectronica.findUnique({
          where: { id: factura.id },
          select: { id: true, cae: true, estado: true, numeroFactura: true }
        });

        if (!verificacion) {
          throw new Error('No se pudo verificar la factura después de la actualización');
        }

        if (!verificacion.cae || verificacion.estado !== 'completada') {
          log(`Verificación falló: CAE=${verificacion.cae}, Estado=${verificacion.estado}`, 'ERROR');
          throw new Error(`Factura no se actualizó correctamente. Estado: ${verificacion.estado}, CAE: ${verificacion.cae}`);
        }

        log(`VERIFICACIÓN EXITOSA:`, 'SUCCESS');
        log(`   - ID: ${verificacion.id}`);
        log(`   - CAE: ${verificacion.cae}`);
        log(`   - Estado: ${verificacion.estado}`);
        log(`   - Número: ${verificacion.numeroFactura}`);

        // 18. Generar QR (no crítico)
        try {
          log(`Generando código QR...`);
          const qrData = await this.generarQR({
            ...facturaActualizada,
            cuit: configAFIP.cuit
          });
          
          await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: { qrData }
          });
          
          log(`Código QR generado`, 'SUCCESS');
        } catch (qrError) {
          log(`Error al generar QR (no crítico): ${qrError instanceof Error ? qrError.message : 'Error desconocido'}`, 'WARN');
        }

        // 19. RESULTADO FINAL
        log(`PROCESO COMPLETADO EXITOSAMENTE`, 'SUCCESS');
        log(`   - Factura ID: ${factura.id}`);
        log(`   - CAE: ${respuestaAFIP.CAE}`);
        log(`   - Número: ${configAFIP.puntoVenta.toString().padStart(5, '0')}-${respuestaAFIP.CbteNro.toString().padStart(8, '0')}`);

        // Guardar logs finales
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: { logs: logMessages.join('\n') }
        });

        return {
          success: true,
          message: 'Factura generada correctamente',
          facturaId: factura.id,
          cae: respuestaAFIP.CAE
        };

      } catch (afipError) {
        log(`ERROR en procesamiento con AFIP: ${afipError instanceof Error ? afipError.message : 'Error desconocido'}`, 'ERROR');
        
        if (afipError instanceof Error && afipError.stack) {
          log(`Stack trace: ${afipError.stack}`, 'ERROR');
        }
        
        // Actualizar factura con error específico
        if (factura?.id) {
          await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: {
              estado: 'error',
              error: afipError instanceof Error ? afipError.message : 'Error en procesamiento con AFIP',
              logs: logMessages.join('\n'),
              updatedAt: new Date()
            }
          });
        }
        
        throw afipError;
      }

    } catch (error) {
      log(`ERROR GENERAL al generar factura: ${error instanceof Error ? error.message : 'Error desconocido'}`, 'ERROR');
      
      if (error instanceof Error && error.stack) {
        log(`Stack trace: ${error.stack}`, 'ERROR');
      }
      
      // Intentar guardar logs en la base de datos
      try {
        if (facturaId) {
          await prisma.facturaElectronica.update({
            where: { id: facturaId },
            data: {
              logs: logMessages.join('\n'),
              updatedAt: new Date(),
              estado: 'error',
              error: error instanceof Error ? error.message : 'Error desconocido'
            }
          });
        } else {
          // Si no se pudo crear la factura, intentar actualizar por ventaId
          await prisma.facturaElectronica.updateMany({
            where: { ventaId },
            data: {
              logs: logMessages.join('\n'),
              updatedAt: new Date()
            }
          });
        }
      } catch (dbError) {
        log(`Error al guardar logs en BD: ${dbError instanceof Error ? dbError.message : 'Error desconocido'}`, 'WARN');
      }
      
      console.error('Error al generar factura:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido',
        error
      };
    }
  }

  /**
   * Obtiene una factura con sus detalles
   */
  public async obtenerFactura(facturaId: string) {
    return prisma.facturaElectronica.findUnique({
      where: { id: facturaId },
      include: {
        venta: {
          include: {
            items: {
              include: {
                producto: true
              }
            },
            sucursal: true,
            pagos: true
          }
        }
      }
    });
  }

  /**
   * Regenera el código QR para una factura
   */
  public async regenerarQR(facturaId: string): Promise<boolean> {
    try {
      const factura = await prisma.facturaElectronica.findUnique({
        where: { id: facturaId },
        include: {
          venta: true
        }
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

      const datosFull = {
        ...factura,
        cuit: configAFIP.cuit
      };

      const qrData = await this.generarQR(datosFull);

      await prisma.facturaElectronica.update({
        where: { id: facturaId },
        data: {
          qrData
        }
      });

      return true;
    } catch (error) {
      console.error('Error al regenerar QR:', error);
      return false;
    }
  }

  /**
   * Verifica el estado del servicio AFIP
   */
  public async verificarEstadoServicio(): Promise<{
    AppServer: string;
    DbServer: string;
    AuthServer: string;
    status: boolean;
  }> {
    try {
      const estado = await this.afipClient.getServerStatus();
      return {
        ...estado,
        status: estado.AppServer === 'OK' && estado.DbServer === 'OK' && estado.AuthServer === 'OK'
      };
    } catch (error) {
      console.error('Error al verificar estado del servicio AFIP:', error);
      return {
        AppServer: 'ERROR',
        DbServer: 'ERROR',
        AuthServer: 'ERROR',
        status: false
      };
    }
  }

  /**
   * Obtiene la información de tipos de comprobantes
   */
  public async obtenerTiposComprobantes() {
    try {
      return await this.afipClient.getInvoiceTypes();
    } catch (error) {
      console.error('Error al obtener tipos de comprobantes:', error);
      throw error;
    }
  }

  /**
   * Verifica si una factura ya existe en AFIP
   */
  public async verificarFacturaExistente(
    puntoVenta: number, 
    comprobanteTipo: number, 
    numeroComprobante: number
  ): Promise<boolean> {
    try {
      const result = await this.afipClient.getInvoice(
        puntoVenta,
        comprobanteTipo,
        numeroComprobante
      );
      
      return !!result && !!result.ResultGet;
    } catch (error) {
      console.error('Error al verificar factura existente:', error);
      return false;
    }
  }

  /**
   * Obtiene el último número de comprobante autorizado
   */
  public async obtenerUltimoNumero(puntoVenta: number, tipoComprobante: number): Promise<number> {
    try {
      return await this.afipClient.getLastInvoiceNumber(puntoVenta, tipoComprobante);
    } catch (error) {
      console.error('Error al obtener último número:', error);
      throw error;
    }
  }

  /**
   * Método de diagnóstico para verificar conectividad
   */
  public async diagnosticarConectividad(): Promise<{
    servidor: boolean;
    autenticacion: boolean;
    ultimoComprobante: boolean;
    errores: string[];
  }> {
    return await this.afipClient.verificarConectividad();
  }
}