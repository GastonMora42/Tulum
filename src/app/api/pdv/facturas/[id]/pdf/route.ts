// src/app/api/pdv/facturas/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import PDFDocument from 'pdfkit';
import prisma from '@/server/db/client';

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
        }
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
    const doc = new PDFDocument({ margin: 50 });
    const chunks: Buffer[] = [];
    
    doc.on('data', (chunk: Buffer<ArrayBufferLike>) => chunks.push(chunk));
    
    // Título de factura
    doc.fontSize(20)
      .text(`FACTURA ${factura.tipoComprobante}`, { align: 'center' })
      .moveDown();
    
    // Datos del emisor
    doc.fontSize(12)
      .text('Tulum Aromaterapia', { bold: true })
      .text(`CUIT: ${configAFIP.cuit}`)
      .text(`Punto de Venta: ${factura.puntoVenta.toString().padStart(4, '0')}`)
      .text(`Comprobante Nº: ${factura.numeroFactura.toString().padStart(8, '0')}`)
      .text(`Fecha: ${factura.fechaEmision.toLocaleDateString()}`)
      .moveDown();
    
    // Datos del cliente
    doc.text('CLIENTE', { bold: true })
      .text(`Nombre: ${factura.venta.clienteNombre || 'Consumidor Final'}`)
      .text(`CUIT/DNI: ${factura.venta.clienteCuit || 'N/A'}`)
      .moveDown();
    
    // Tabla de productos
    doc.text('DETALLE', { bold: true });
    
    const tableTop = doc.y + 10;
    const tableHeaders = ['Producto', 'Cantidad', 'Precio Unit.', 'Subtotal'];
    const tableData = factura.venta.items.map(item => [
      item.producto.nombre,
      item.cantidad.toString(),
      `$${item.precioUnitario.toFixed(2)}`,
      `$${(item.cantidad * item.precioUnitario).toFixed(2)}`
    ]);
    
    // Dibujar tabla (simplificado)
    let yPos = tableTop;
    
    // Headers
    doc.font('Helvetica-Bold');
    doc.fontSize(10);
    tableHeaders.forEach((header, i) => {
      const xPos = 50 + (i * 125);
      doc.text(header, xPos, yPos);
    });
    
    // Línea
    yPos += 15;
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 10;
    
    // Datos
    doc.font('Helvetica');
    tableData.forEach(row => {
      row.forEach((cell, i) => {
        const xPos = 50 + (i * 125);
        doc.text(cell, xPos, yPos);
      });
      yPos += 15;
    });
    
    // Línea final
    doc.moveTo(50, yPos).lineTo(550, yPos).stroke();
    yPos += 20;
    
    // Total
    doc.font('Helvetica-Bold')
      .text(`TOTAL: $${factura.venta.total.toFixed(2)}`, 400, yPos)
      .moveDown();
    
    // Datos CAE
    yPos += 40;
    doc.fontSize(10)
      .text(`CAE: ${factura.cae}`, 50, yPos)
      .text(`Vencimiento CAE: ${factura.vencimientoCae?.toLocaleDateString() || 'N/A'}`, 50, yPos + 15);
    
    // Agregar QR si existe
    if (factura.qrData) {
      doc.image(factura.qrData, 400, yPos - 20, { width: 100 });
    }
    
    // Finalizar documento
    doc.end();
    
    // Cuando el documento esté completo, devolver como buffer
    return new Promise<NextResponse>((resolve) => {
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);
        const response = new NextResponse(pdfBuffer);
        response.headers.set('Content-Type', 'application/pdf');
        response.headers.set('Content-Disposition', `inline; filename=factura_${factura.numeroFactura}.pdf`);
        resolve(response);
      });
    });
  } catch (error) {
    console.error('Error al generar PDF de factura:', error);
    return NextResponse.json(
      { error: 'Error al generar PDF de factura' },
      { status: 500 }
    );
  }
}