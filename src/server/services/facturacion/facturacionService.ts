// src/server/services/facturacion/facturacionService.ts
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import QRCode from 'qrcode';
import prisma from '@/server/db/client';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';

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
        tipoCmp: factura.tipoComprobante === 'A' ? 1 : 6, // 1: Factura A, 6: Factura B
        nroCmp: factura.numeroFactura,
        importe: factura.venta.total,
        moneda: 'PES',
        ctz: 1,
        tipoDocRec: factura.venta.clienteCuit ? 80 : 99, // 80: CUIT, 99: Consumidor Final
        nroDocRec: factura.venta.clienteCuit || '0',
        tipoCodAut: 'E',
        codAut: factura.cae
      };

      // Base64 encode the JSON data
      const qrText = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
      
      // Generate QR code as data URL
      const qrImage = await QRCode.toDataURL(qrText);
      return qrImage;
    } catch (error) {
      console.error('Error generando QR:', error);
      throw error;
    }
  }

  /**
   * Procesa una venta para generar factura electrónica
   */
  public async generarFactura(ventaId: string): Promise<{
    success: boolean;
    message?: string;
    facturaId?: string;
    cae?: string;
    error?: any;
  }> {
    try {
      // Verificar si ya existe factura para esta venta
      const facturaExistente = await prisma.facturaElectronica.findFirst({
        where: { ventaId, estado: { not: 'error' } }
      });

      if (facturaExistente) {
        return {
          success: true,
          message: 'La venta ya tiene una factura asociada',
          facturaId: facturaExistente.id,
          cae: facturaExistente.cae || undefined,
          error: null
        };
      }

      // Obtener datos de la venta
      const venta = await prisma.venta.findUnique({
        where: { id: ventaId },
        include: {
          items: {
            include: {
              producto: true
            }
          },
          sucursal: true
        }
      });

      if (!venta) {
        throw new Error('Venta no encontrada');
      }

      // Obtener configuración AFIP para esta sucursal
      const configAFIP = await prisma.configuracionAFIP.findFirst({
        where: {
          sucursalId: venta.sucursalId,
          activo: true
        }
      });

      if (!configAFIP) {
        throw new Error('No hay configuración AFIP activa para esta sucursal');
      }

      // Determinar tipo de comprobante
      const comprobanteTipo = venta.clienteCuit ? 1 : 6; // 1: Factura A, 6: Factura B, etc.
      const tipoComprobanteLetra = venta.clienteCuit ? 'A' : 'B';

      // Crear factura en estado pendiente
      const facturaId = uuidv4();
      const factura = await prisma.facturaElectronica.create({
        data: {
          id: facturaId,
          ventaId: venta.id,
          sucursalId: venta.sucursalId,
          tipoComprobante: tipoComprobanteLetra,
          puntoVenta: configAFIP.puntoVenta,
          numeroFactura: 0, // Se actualiza después
          fechaEmision: new Date(),
          estado: 'procesando'
        }
      });

      // Calcular totales
      const importeTotal = venta.total;
      // Para facturas A, el neto no incluye IVA
      // Para facturas B, el neto es igual al total (IVA incluido)
      let importeNeto, importeIVA;
      
      if (tipoComprobanteLetra === 'A') {
        importeNeto = venta.total / 1.21; // Para IVA 21%
        importeIVA = venta.total - importeNeto;
      } else {
        // Para facturas B, el monto se informa con IVA incluido
        importeNeto = venta.total;
        importeIVA = 0;
      }

      // Preparar items para la factura
      const itemsFactura = venta.items.map(item => {
        let precioUnitarioNeto;
        
        if (tipoComprobanteLetra === 'A') {
          precioUnitarioNeto = item.precioUnitario / 1.21; // Precio sin IVA
        } else {
          precioUnitarioNeto = item.precioUnitario; // Precio con IVA incluido
        }
        
        const subtotal = (item.cantidad * precioUnitarioNeto) * (1 - (item.descuento || 0) / 100);
        
        return {
          descripcion: item.producto.nombre,
          cantidad: item.cantidad,
          precioUnitario: precioUnitarioNeto,
          bonificacion: item.descuento || 0,
          subtotal
        };
      });

      // Preparar alícuotas de IVA
      const iva = [];
      
      if (tipoComprobanteLetra === 'A') {
        iva.push({
          Id: 5, // 5 = 21%
          BaseImp: parseFloat(importeNeto.toFixed(2)),
          Importe: parseFloat(importeIVA.toFixed(2))
        });
      }

      // Fecha en formato YYYYMMDD
      const fechaComprobante = format(new Date(), 'yyyyMMdd');

      try {
        // Crear factura en AFIP
        const respuestaAFIP = await this.afipClient.createInvoice({
          puntoVenta: configAFIP.puntoVenta,
          comprobanteTipo,
          concepto: 1, // 1 = Productos
          docTipo: venta.clienteCuit ? 80 : 99, // 80 = CUIT, 99 = Consumidor Final
          docNro: venta.clienteCuit || '0',
          fechaComprobante,
          importeTotal: parseFloat(importeTotal.toFixed(2)),
          importeNeto: parseFloat(importeNeto.toFixed(2)),
          importeIVA: parseFloat(importeIVA.toFixed(2)),
          monedaId: 'PES', // Pesos argentinos
          cotizacion: 1,
          iva,
          items: itemsFactura
        });

        // Verificar resultado
        if (respuestaAFIP.Resultado !== 'A') {
          throw new Error(`Error en respuesta AFIP: ${JSON.stringify(respuestaAFIP.Errores || respuestaAFIP.Observaciones)}`);
        }

        // Convertir fecha CAE a Date
        const fechaVencimiento = new Date(
          parseInt(respuestaAFIP.CAEFchVto.substring(0, 4)),
          parseInt(respuestaAFIP.CAEFchVto.substring(4, 6)) - 1,
          parseInt(respuestaAFIP.CAEFchVto.substring(6, 8))
        );

        // Actualizar factura con respuesta de AFIP
        const facturaActualizada = await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: {
            numeroFactura: respuestaAFIP.CbteNro,
            cae: respuestaAFIP.CAE,
            vencimientoCae: fechaVencimiento,
            estado: 'completada',
            respuestaAFIP: respuestaAFIP
          },
          include: {
            venta: true
          }
        });

        // Generar QR
        try {
          const datosFull = {
            ...facturaActualizada,
            cuit: configAFIP.cuit
          };
          
          const qrData = await this.generarQR(datosFull);
          
          // Guardar QR
          await prisma.facturaElectronica.update({
            where: { id: factura.id },
            data: {
              qrData
            }
          });
        } catch (qrError) {
          console.error('Error al generar QR:', qrError);
          // No fallamos la operación completa si falla el QR
        }

        // Marcar venta como facturada
        await prisma.venta.update({
          where: { id: venta.id },
          data: {
            facturada: true,
            numeroFactura: `${configAFIP.puntoVenta.toString().padStart(5, '0')}-${respuestaAFIP.CbteNro.toString().padStart(8, '0')}`
          }
        });

        return {
          success: true,
          message: 'Factura generada correctamente',
          facturaId: factura.id,
          cae: respuestaAFIP.CAE,
          error: null
        };
      } catch (afipError) {
        // Si falla la comunicación con AFIP, marcamos la factura como error
        await prisma.facturaElectronica.update({
          where: { id: factura.id },
          data: {
            estado: 'error',
            error: afipError instanceof Error ? afipError.message : 'Error en comunicación con AFIP'
          }
        });
        
        throw afipError;
      }
    } catch (error) {
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
            sucursal: true
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
}