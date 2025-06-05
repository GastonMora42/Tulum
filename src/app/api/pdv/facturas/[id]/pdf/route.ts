// src/app/api/pdv/facturas/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import prisma from '@/server/db/client';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authError = await authMiddleware(req);
  if (authError) return authError;

  try {
    const facturaId = params.id;
    
    // Buscar la factura
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
            pagos: true,
            sucursal: true,
            usuario: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        sucursal: true
      }
    });

    if (!factura) {
      return NextResponse.json(
        { error: 'Factura no encontrada' },
        { status: 404 }
      );
    }

    // Generar PDF optimizado para impresora térmica
    const pdfBuffer = await generarFacturaPDF(factura, {
      formato: 'termica_80mm', // Específico para Fukun POS80-CC
      incluirQR: true,
      incluirLogotipo: true
    });

    // Configurar headers para PDF
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `inline; filename="factura_${factura.numeroFactura}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());
    
    // Headers específicos para impresión térmica
    headers.set('X-Print-Format', 'thermal-80mm');
    headers.set('X-Print-Width', '72mm');
    headers.set('X-Print-DPI', '203');

    return new Response(pdfBuffer, { headers });

  } catch (error) {
    console.error('Error generando PDF de factura:', error);
    return NextResponse.json(
      { error: 'Error al generar PDF' },
      { status: 500 }
    );
  }
}

// Servicio para generar PDF (crear archivo separado)
// src/server/services/pdf/facturasPDFService.ts
async function generarFacturaPDF(factura: any, opciones: any): Promise<Buffer> {
  const jsPDF = require('jspdf');
  
  // Configuración específica para impresora térmica 80mm
  const doc = new jsPDF({
    unit: 'mm',
    format: [80, 200], // Ancho fijo 80mm, alto variable
    orientation: 'portrait'
  });

  // Configurar fuente monospace para impresora térmica
  doc.setFont('courier', 'normal');
  doc.setFontSize(10);

  let yPos = 10;
  const lineHeight = 4;
  const centerX = 40; // Centro del papel de 80mm

  // Header empresa
  doc.setFontSize(12);
  doc.text('TULUM AROMATERAPIA', centerX, yPos, { align: 'center' });
  yPos += lineHeight + 2;

  doc.setFontSize(8);
  doc.text('CUIT: ' + factura.sucursal.cuit || '', centerX, yPos, { align: 'center' });
  yPos += lineHeight;

  // Tipo de factura
  doc.setFontSize(14);
  doc.text(`FACTURA ${factura.tipoComprobante}`, centerX, yPos, { align: 'center' });
  yPos += lineHeight + 2;

  // Número de factura
  doc.setFontSize(10);
  doc.text(`N° ${factura.numeroFactura}`, centerX, yPos, { align: 'center' });
  yPos += lineHeight + 2;

  // Fecha
  doc.setFontSize(9);
  doc.text(`Fecha: ${new Date(factura.fechaEmision).toLocaleDateString('es-AR')}`, 5, yPos);
  yPos += lineHeight + 3;

  // Cliente (si existe)
  if (factura.venta.clienteNombre) {
    doc.text(`Cliente: ${factura.venta.clienteNombre}`, 5, yPos);
    yPos += lineHeight;
    
    if (factura.venta.clienteCuit) {
      doc.text(`CUIT: ${factura.venta.clienteCuit}`, 5, yPos);
      yPos += lineHeight;
    }
    yPos += 2;
  }

  // Línea separadora
  doc.text('----------------------------------------', 5, yPos);
  yPos += lineHeight;

  // Items
  doc.setFontSize(8);
  factura.venta.items.forEach((item: any) => {
    const producto = item.producto.nombre;
    const cantidad = item.cantidad;
    const precio = item.precioUnitario;
    const subtotal = cantidad * precio;

    // Nombre del producto (puede ocupar múltiples líneas)
    const lines = doc.splitTextToSize(producto, 70);
    for (const line of lines) {
      doc.text(line, 5, yPos);
      yPos += 3;
    }

    // Cantidad x precio = subtotal
    doc.text(`${cantidad} x $${precio.toFixed(2)} = $${subtotal.toFixed(2)}`, 5, yPos);
    yPos += lineHeight + 1;
  });

  // Línea separadora
  yPos += 2;
  doc.text('----------------------------------------', 5, yPos);
  yPos += lineHeight;

  // Total
  doc.setFontSize(12);
  doc.text(`TOTAL: $${factura.venta.total.toFixed(2)}`, centerX, yPos, { align: 'center' });
  yPos += lineHeight + 3;

  // CAE
  if (factura.cae) {
    doc.setFontSize(8);
    doc.text(`CAE: ${factura.cae}`, 5, yPos);
    yPos += lineHeight;
    doc.text(`Vto: ${new Date(factura.vencimientoCae).toLocaleDateString('es-AR')}`, 5, yPos);
    yPos += lineHeight + 3;
  }

  // QR Code (si está habilitado)
  if (opciones.incluirQR && factura.qrData) {
    // Agregar código QR aquí usando una librería como qrcode
    yPos += 20; // Espacio para QR
  }

  // Ajustar altura del documento
  const finalHeight = yPos + 10;
  doc.internal.pageSize.height = finalHeight;

  return Buffer.from(doc.output('arraybuffer'));
}