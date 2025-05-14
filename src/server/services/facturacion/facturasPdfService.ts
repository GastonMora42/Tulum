// src/server/services/facturacion/facturasPdfService.ts
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { format } from 'date-fns';
import prisma from '@/server/db/client';

export class FacturasPdfService {
  /**
   * Genera un PDF para una factura
   */
  public async generarPdf(facturaId: string): Promise<Buffer> {
    // Buscar factura
    const factura = await prisma.facturaElectronica.findUnique({
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
        },
        sucursal: true
      }
    });
    
    if (!factura) {
      throw new Error('Factura no encontrada');
    }
    
    // Obtener configuración AFIP para esta sucursal
    const configAFIP = await prisma.configuracionAFIP.findFirst({
      where: {
        sucursalId: factura.sucursalId,
        activo: true
      }
    });
    
    if (!configAFIP) {
      throw new Error('Configuración AFIP no encontrada');
    }
    
    // Crear PDF
    const pdfDoc = await PDFDocument.create();
    let page = pdfDoc.addPage([595, 842]); // A4
    
    // Fuentes
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Configuraciones
    const margin = 50;
    const fontSize = 10;
    let yPos = page.getHeight() - margin;
    
    // Encabezado - Título
    const encabezadoBox = {
      x: page.getWidth() / 2 - 60,
      y: yPos - 50,
      width: 120,
      height: 50
    };
    
    // Dibujar recuadro para letra de factura
    page.drawRectangle({
      x: encabezadoBox.x,
      y: encabezadoBox.y,
      width: encabezadoBox.width,
      height: encabezadoBox.height,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    // Letra de factura
    page.drawText(`FACTURA ${factura.tipoComprobante}`, {
      x: encabezadoBox.x + 20,
      y: encabezadoBox.y + 25,
      size: 24,
      font: helveticaBold
    });
    
    // Original/Duplicado
    page.drawText("ORIGINAL", {
      x: encabezadoBox.x + 40,
      y: encabezadoBox.y + 10,
      size: 10,
      font: helveticaFont
    });
    
    // Línea separadora
    page.drawLine({
      start: { x: margin, y: yPos - 60 },
      end: { x: page.getWidth() - margin, y: yPos - 60 },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    // Datos del emisor
    page.drawText('Tulum Aromaterapia', {
      x: margin,
      y: yPos,
      size: 16,
      font: helveticaBold
    });
    
    yPos -= 20;
    
    page.drawText(`CUIT: ${configAFIP.cuit}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 15;
    
    page.drawText(`Punto de Venta: ${factura.puntoVenta.toString().padStart(4, '0')}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 15;
    
    page.drawText(`Comprobante Nº: ${factura.numeroFactura.toString().padStart(8, '0')}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 15;
    
    page.drawText(`Fecha: ${format(new Date(factura.fechaEmision), 'dd/MM/yyyy')}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    // Datos del cliente
    const clienteY = encabezadoBox.y - 20;
    
    page.drawText('CLIENTE', {
      x: margin,
      y: clienteY,
      size: 12,
      font: helveticaBold
    });
    
    // Recuadro para datos del cliente
    page.drawRectangle({
      x: margin,
      y: clienteY - 50,
      width: page.getWidth() - margin * 2,
      height: 50,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    page.drawText(`Razón Social: ${factura.venta.clienteNombre || 'Consumidor Final'}`, {
      x: margin + 10,
      y: clienteY - 15,
      size: fontSize,
      font: helveticaFont
    });
    
    page.drawText(`CUIT/DNI: ${factura.venta.clienteCuit || 'N/A'}`, {
      x: margin + 10,
      y: clienteY - 30,
      size: fontSize,
      font: helveticaFont
    });
    
    page.drawText(`Condición IVA: ${factura.tipoComprobante === 'A' ? 'Responsable Inscripto' : 'Consumidor Final'}`, {
      x: page.getWidth() - margin - 200,
      y: clienteY - 15,
      size: fontSize,
      font: helveticaFont
    });
    
    page.drawText(`Domicilio: `, {
      x: page.getWidth() - margin - 200,
      y: clienteY - 30,
      size: fontSize,
      font: helveticaFont
    });
    
    // Tabla de productos
    const tableTop = clienteY - 70;
    
    page.drawText('DETALLE', {
      x: margin,
      y: tableTop,
      size: 12,
      font: helveticaBold
    });
    
    // Encabezados de tabla
    const encabezadoTabla = tableTop - 20;
    
    // Columnas
    const col1 = margin; // Producto
    const col2 = margin + 250; // Cantidad
    const col3 = margin + 300; // Precio
    const col4 = margin + 400; // Subtotal
    
    // Recuadro para encabezado
    page.drawRectangle({
      x: margin,
      y: encabezadoTabla - 15,
      width: page.getWidth() - margin * 2,
      height: 15,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    page.drawText('Producto', {
      x: col1 + 5,
      y: encabezadoTabla - 10,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Cant.', {
      x: col2 + 5,
      y: encabezadoTabla - 10,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Precio Unit.', {
      x: col3 + 5,
      y: encabezadoTabla - 10,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Subtotal', {
      x: col4 + 5,
      y: encabezadoTabla - 10,
      size: fontSize,
      font: helveticaBold
    });
    
    // Ítems
    let itemY = encabezadoTabla - 15;
    
    for (const item of factura.venta.items) {
      // Validar si hay suficiente espacio en la página
      if (itemY < margin + 100) {
        // Agregar nueva página
        page = pdfDoc.addPage([595, 842]);
        itemY = page.getHeight() - margin;
      }
      
      // Recuadro para el item
      page.drawRectangle({
        x: margin,
        y: itemY - 15,
        width: page.getWidth() - margin * 2,
        height: 15,
        borderColor: rgb(0, 0, 0),
        borderWidth: 1
      });
      
      // Producto
      page.drawText(item.producto.nombre.substring(0, 40), {
        x: col1 + 5,
        y: itemY - 10,
        size: fontSize,
        font: helveticaFont
      });
      
      // Cantidad
      page.drawText(item.cantidad.toString(), {
        x: col2 + 5,
        y: itemY - 10,
        size: fontSize,
        font: helveticaFont
      });
      
      // Precio unitario
      page.drawText(`$${item.precioUnitario.toFixed(2)}`, {
        x: col3 + 5,
        y: itemY - 10,
        size: fontSize,
        font: helveticaFont
      });
      
      // Subtotal
      const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100);
      page.drawText(`$${subtotal.toFixed(2)}`, {
        x: col4 + 5,
        y: itemY - 10,
        size: fontSize,
        font: helveticaFont
      });
      
      itemY -= 15;
    }
    
    // Recuadro para totales
    const totalesY = itemY - 20;
    
    page.drawRectangle({
      x: page.getWidth() - margin - 150,
      y: totalesY - 60,
      width: 150,
      height: 60,
      borderColor: rgb(0, 0, 0),
      borderWidth: 1
    });
    
    // Mostrar datos de IVA solo para facturas A
    if (factura.tipoComprobante === 'A') {
      const netoTotal = factura.venta.total / 1.21;
      const ivaTotal = factura.venta.total - netoTotal;
      
      page.drawText('Neto:', {
        x: page.getWidth() - margin - 140,
        y: totalesY - 15,
        size: fontSize,
        font: helveticaFont
      });
      
      page.drawText(`$${netoTotal.toFixed(2)}`, {
        x: page.getWidth() - margin - 60,
        y: totalesY - 15,
        size: fontSize,
        font: helveticaFont
      });
      
      page.drawText('IVA 21%:', {
        x: page.getWidth() - margin - 140,
        y: totalesY - 30,
        size: fontSize,
        font: helveticaFont
      });
      
      page.drawText(`$${ivaTotal.toFixed(2)}`, {
        x: page.getWidth() - margin - 60,
        y: totalesY - 30,
        size: fontSize,
        font: helveticaFont
      });
    }
    
    // Total
    page.drawText('TOTAL:', {
      x: page.getWidth() - margin - 140,
      y: totalesY - 45,
      size: 12,
      font: helveticaBold
    });
    
    page.drawText(`$${factura.venta.total.toFixed(2)}`, {
      x: page.getWidth() - margin - 60,
      y: totalesY - 45,
      size: 12,
      font: helveticaBold
    });
    
    // Datos CAE
    const caeY = totalesY - 100;
    
    page.drawText(`CAE: ${factura.cae}`, {
      x: margin,
      y: caeY,
      size: fontSize,
      font: helveticaFont
    });
    
    page.drawText(`Vencimiento CAE: ${factura.vencimientoCae ? format(factura.vencimientoCae, 'dd/MM/yyyy') : 'N/A'}`, {
      x: margin,
      y: caeY - 15,
      size: fontSize,
      font: helveticaFont
    });
    
    // QR Code (si existe)
    if (factura.qrData && factura.qrData.startsWith('data:image/')) {
      try {
        // Extraer datos base64 del código QR
        const qrDataParts = factura.qrData.split(',');
        if (qrDataParts.length > 1) {
          const qrImageBytes = Buffer.from(qrDataParts[1], 'base64');
          const qrImage = await pdfDoc.embedPng(qrImageBytes);
          
          const qrDims = qrImage.scale(0.5); // Escalar la imagen
          
          page.drawImage(qrImage, {
            x: page.getWidth() - margin - qrDims.width,
            y: caeY - qrDims.height + 15,
            width: qrDims.width,
            height: qrDims.height
          });
        }
      } catch (qrError) {
        console.error('Error al incluir QR en PDF:', qrError);
        // No fallamos toda la generación de PDF si falla el QR
      }
    }
    
    // Finalizar documento
    const pdfBytes = await pdfDoc.save();
    
    return Buffer.from(pdfBytes);
  }
}

export const facturasPdfService = new FacturasPdfService();