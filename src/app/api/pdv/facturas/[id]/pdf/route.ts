// src/app/api/pdv/facturas/[id]/pdf/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import prisma from '@/server/db/client';
import { format } from 'date-fns';

interface RouteParams {
  params: {
    id: string;
  }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  // Autenticar
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const { id } = params;
    
    // Buscar factura
    const factura = await prisma.facturaElectronica.findUnique({
      where: { id },
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
        },
        sucursal: true
      }
    });
    
    if (!factura) {
      return NextResponse.json({ error: 'Factura no encontrada' }, { status: 404 });
    }
    
    // Obtener configuración AFIP para esta sucursal
    const configAFIP = await prisma.configuracionAFIP.findFirst({
      where: {
        sucursalId: factura.sucursalId,
        activo: true
      }
    });
    
    if (!configAFIP) {
      return NextResponse.json({ error: 'Configuración AFIP no encontrada' }, { status: 404 });
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
    page.drawText(`FACTURA ${factura.tipoComprobante}`, {
      x: page.getWidth() / 2 - 60,
      y: yPos,
      size: 16,
      font: helveticaBold
    });
    
    yPos -= 30;
    
    // Datos del emisor
    page.drawText('Tulum Aromaterapia', {
      x: margin,
      y: yPos,
      size: 12,
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
    
    yPos -= 30;
    
    // Datos del cliente
    page.drawText('CLIENTE', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold
    });
    
    yPos -= 20;
    
    page.drawText(`Nombre: ${factura.venta.clienteNombre || 'Consumidor Final'}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 15;
    
    page.drawText(`CUIT/DNI: ${factura.venta.clienteCuit || 'N/A'}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 30;
    
    // Tabla de productos - Encabezado
    page.drawText('DETALLE', {
      x: margin,
      y: yPos,
      size: 12,
      font: helveticaBold
    });
    
    yPos -= 20;
    
    // Encabezados de tabla
    const tableTop = yPos;
    
    // Columnas
    const col1 = margin; // Producto
    const col2 = margin + 250; // Cantidad
    const col3 = margin + 300; // Precio
    const col4 = margin + 400; // Subtotal
    
    page.drawText('Producto', {
      x: col1,
      y: yPos,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Cant.', {
      x: col2,
      y: yPos,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Precio Unit.', {
      x: col3,
      y: yPos,
      size: fontSize,
      font: helveticaBold
    });
    
    page.drawText('Subtotal', {
      x: col4,
      y: yPos,
      size: fontSize,
      font: helveticaBold
    });
    
    yPos -= 15;
    
    // Línea horizontal
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: page.getWidth() - margin, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    yPos -= 15;
    
    // Ítems
    for (const item of factura.venta.items) {
      // Validar si hay suficiente espacio en la página
      if (yPos < margin + 100) {
        // Agregar nueva página
        page = pdfDoc.addPage([595, 842]);
        yPos = page.getHeight() - margin;
      }
      
      // Producto
      page.drawText(item.producto.nombre, {
        x: col1,
        y: yPos,
        size: fontSize,
        font: helveticaFont,
        maxWidth: 240
      });
      
      // Cantidad
      page.drawText(item.cantidad.toString(), {
        x: col2,
        y: yPos,
        size: fontSize,
        font: helveticaFont
      });
      
      // Precio unitario
      page.drawText(`$${item.precioUnitario.toFixed(2)}`, {
        x: col3,
        y: yPos,
        size: fontSize,
        font: helveticaFont
      });
      
      // Subtotal
      const subtotal = item.cantidad * item.precioUnitario * (1 - item.descuento / 100);
      page.drawText(`$${subtotal.toFixed(2)}`, {
        x: col4,
        y: yPos,
        size: fontSize,
        font: helveticaFont
      });
      
      yPos -= 15;
    }
    
    // Línea horizontal
    page.drawLine({
      start: { x: margin, y: yPos },
      end: { x: page.getWidth() - margin, y: yPos },
      thickness: 1,
      color: rgb(0, 0, 0)
    });
    
    yPos -= 20;
    
    // Total
    page.drawText('TOTAL:', {
      x: page.getWidth() - margin - 150,
      y: yPos,
      size: 12,
      font: helveticaBold
    });
    
    page.drawText(`$${factura.venta.total.toFixed(2)}`, {
      x: page.getWidth() - margin - 60,
      y: yPos,
      size: 12,
      font: helveticaBold
    });
    
    yPos -= 40;
    
    // Datos CAE
    page.drawText(`CAE: ${factura.cae}`, {
      x: margin,
      y: yPos,
      size: fontSize,
      font: helveticaFont
    });
    
    yPos -= 15;
    
    page.drawText(`Vencimiento CAE: ${factura.vencimientoCae?.toLocaleDateString() || 'N/A'}`, {
      x: margin,
      y: yPos,
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
            y: yPos - qrDims.height + 15,
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
    
    // Crear respuesta con PDF
    const response = new NextResponse(pdfBytes);
    response.headers.set('Content-Type', 'application/pdf');
    response.headers.set('Content-Disposition', `inline; filename=factura_${factura.numeroFactura}.pdf`);
    return response;
  } catch (error) {
    console.error('Error al generar PDF de factura:', error);
    return NextResponse.json(
      { error: 'Error al generar PDF de factura' },
      { status: 500 }
    );
  }
}