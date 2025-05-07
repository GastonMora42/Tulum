// src/services/facturacion/facturacionService.ts
import { AfipSoapClient } from '@/lib/afip/afipSoapClient';
import { FacturaData, RespuestaFacturaAFIP } from '@/types/afip';
import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import prisma from '@/server/db/client';

export class FacturacionService {
  private afipClient: AfipSoapClient;

  constructor(cuit: string) {
    this.afipClient = new AfipSoapClient(cuit);
  }

  /**
   * Genera el código QR requerido por AFIP
   */
  private async generarQR(factura: any): Promise<string> {
    // Datos según especificación AFIP para QR
    const qrData = {
      ver: 1,
      fecha: factura.fechaEmision.toISOString().split('T')[0],
      cuit: factura.cuit,
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

    // Convertir a URL de AFIP
    const qrText = `https://www.afip.gob.ar/fe/qr/?p=${Buffer.from(JSON.stringify(qrData)).toString('base64')}`;
    
    // Generar código QR
    const qrImage = await QRCode.toDataURL(qrText);
    return qrImage;
  }

  /**
   * Procesa una venta para generar factura electrónica
   */
  public async generarFactura(ventaId: string): Promise<{
    success: boolean;
    message?: string;
    facturaId?: string;
    cae?: string;
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
          cae: facturaExistente.cae || undefined
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
      const factura = await prisma.facturaElectronica.create({
        data: {
          id: uuidv4(),
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
      const importeNeto = importeTotal / 1.21; // Para IVA 21%, ajustar según corresponda
      const importeIVA = importeTotal - importeNeto;

      // Preparar items para la factura
      const itemsFactura = venta.items.map((item: { producto: { nombre: any; }; cantidad: number; precioUnitario: number; descuento: any; }) => ({
        descripcion: item.producto.nombre,
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario / 1.21, // Precio sin IVA
        bonificacion: item.descuento || 0,
        subtotal: (item.cantidad * item.precioUnitario) * (1 - (item.descuento || 0) / 100) / 1.21
      }));

      // Preparar alícuotas de IVA
      const iva = [{
        Id: 5, // 5 = 21%
        BaseImp: parseFloat(importeNeto.toFixed(2)),
        Importe: parseFloat(importeIVA.toFixed(2))
      }];

      // Fecha en formato YYYYMMDD
      const fechaComprobante = new Date().toISOString().split('T')[0].replace(/-/g, '');

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
        respuestaAFIP.CAEFchVto.substring(0, 4) + '-' +
        respuestaAFIP.CAEFchVto.substring(4, 6) + '-' +
        respuestaAFIP.CAEFchVto.substring(6, 8)
      );

      // Actualizar factura con respuesta de AFIP
      const facturaActualizada = await prisma.facturaElectronica.update({
        where: { id: factura.id },
        data: {
          numeroFactura: respuestaAFIP.CbteNro,
          cae: respuestaAFIP.CAE,
          vencimientoCae: fechaVencimiento,
          estado: 'completada',
          respuestaAFIP: respuestaAFIP as any
        }
      });

      // Generar QR
      const datosFull = {
        ...facturaActualizada,
        cuit: configAFIP.cuit,
        venta
      };
      
      const qrData = await this.generarQR(datosFull);
      
      // Guardar QR
      await prisma.facturaElectronica.update({
        where: { id: factura.id },
        data: {
          qrData
        }
      });

      return {
        success: true,
        message: 'Factura generada correctamente',
        facturaId: factura.id,
        cae: respuestaAFIP.CAE
      };
    } catch (error) {
      console.error('Error al generar factura:', error);

      // Si ya se creó la factura pero falló, marcarla como error
      if (arguments[0]) {
        await prisma.facturaElectronica.updateMany({
          where: { ventaId, estado: 'procesando' },
          data: {
            estado: 'error',
            error: error instanceof Error ? error.message : 'Error desconocido'
          }
        });
      }

      throw error;
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
}