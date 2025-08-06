
// src/app/api/reportes/export/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { authMiddleware } from '@/server/api/middlewares/auth';
import { checkPermission } from '@/server/api/middlewares/authorization';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export async function POST(req: NextRequest) {
  const authError = await authMiddleware(req);
  if (authError) return authError;
  
  const permissionError = await checkPermission(['reportes:ver', 'admin'])(req);
  if (permissionError) return permissionError;
  
  try {
    const body = await req.json();
    const { tipoReporte, filtros, datos, configuracion } = body;
    
    if (!tipoReporte || !datos) {
      return NextResponse.json({ error: 'Datos insuficientes para generar PDF' }, { status: 400 });
    }
    
    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configuraciones por defecto
    const margin = 20;
    let currentY = margin;
    
    // Header del documento
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(configuracion?.nombre || 'Reporte de Ventas', margin, currentY);
    currentY += 10;
    
    // Subtítulo y fecha
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    const fechaReporte = format(new Date(), 'dd/MM/yyyy HH:mm', { locale: es });
    doc.text(`Generado el: ${fechaReporte}`, margin, currentY);
    currentY += 6;
    
    // Período del reporte
    if (filtros?.fechaInicio && filtros?.fechaFin) {
      const periodo = `Período: ${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy')} - ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy')}`;
      doc.text(periodo, margin, currentY);
      currentY += 6;
    }
    
    // Filtros aplicados
    if (filtros) {
      const filtrosTexto = [];
      if (filtros.sucursalId) filtrosTexto.push('Sucursal específica');
      if (filtros.vendedorId) filtrosTexto.push('Vendedor específico');
      if (filtros.productoId) filtrosTexto.push('Producto específico');
      
      if (filtrosTexto.length > 0) {
        doc.text(`Filtros: ${filtrosTexto.join(', ')}`, margin, currentY);
        currentY += 8;
      }
    }
    
    currentY += 5;
    
    // Generar contenido específico por tipo de reporte
    switch (tipoReporte) {
      case 'ventas_generales':
        currentY = await generarReporteVentasGenerales(doc, datos, margin, currentY);
        break;
      case 'productos_rendimiento':
        currentY = await generarReporteProductos(doc, datos, margin, currentY);
        break;
      case 'vendedores_performance':
        currentY = await generarReporteVendedores(doc, datos, margin, currentY);
        break;
      case 'facturacion_detallada':
        currentY = await generarReporteFacturacion(doc, datos, margin, currentY);
        break;
      case 'medios_pago':
        currentY = await generarReporteMediosPago(doc, datos, margin, currentY);
        break;
      default:
        currentY = await generarReporteGenerico(doc, datos, margin, currentY);
    }
    
    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Página ${i} de ${pageCount}`, doc.internal.pageSize.width - 30, doc.internal.pageSize.height - 10);
      doc.text('Generado por Sistema Tulum', margin, doc.internal.pageSize.height - 10);
    }
    
    // Generar buffer del PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));
    
    // Configurar headers de respuesta
    const headers = new Headers();
    headers.set('Content-Type', 'application/pdf');
    headers.set('Content-Disposition', `attachment; filename="reporte-${tipoReporte}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf"`);
    headers.set('Content-Length', pdfBuffer.length.toString());
    
    return new NextResponse(pdfBuffer, { headers });
    
  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json({ error: 'Error al generar PDF' }, { status: 500 });
  }
}

// Función para reportes de ventas generales
async function generarReporteVentasGenerales(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  // Resumen ejecutivo
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumen Ejecutivo', margin, currentY);
  currentY += 8;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (datos.resumen) {
    const resumenData = [
      ['Ventas Totales', `$${(datos.resumen.ventasTotales || 0).toFixed(2)}`],
      ['Cantidad de Transacciones', (datos.resumen.cantidadVentas || 0).toString()],
      ['Ticket Promedio', `$${(datos.resumen.ticketPromedio || 0).toFixed(2)}`],
      ['Descuentos Aplicados', `$${(datos.resumen.descuentosTotales || 0).toFixed(2)}`]
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [['Métrica', 'Valor']],
      body: resumenData,
      theme: 'grid',
      headStyles: { fillColor: [49, 23, 22], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Top productos si están disponibles
  if (datos.resumen?.porProducto && datos.resumen.porProducto.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top 10 Productos', margin, currentY);
    currentY += 5;
    
    const productosData = datos.resumen.porProducto.slice(0, 10).map((producto: any, index: number) => [
      (index + 1).toString(),
      producto.nombre || 'N/A',
      (producto.cantidad_vendida || 0).toString(),
      `$${(producto.total_vendido || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Producto', 'Cantidad', 'Total']],
      body: productosData,
      theme: 'striped',
      headStyles: { fillColor: [156, 117, 97], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  return currentY;
}

// Función para reportes de productos
async function generarReporteProductos(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  // Estadísticas generales
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Estadísticas de Productos', margin, currentY);
  currentY += 8;
  
  if (datos.estadisticas) {
    const estadisticasData = [
      ['Total de Productos', (datos.estadisticas.totalProductos || 0).toString()],
      ['Productos con Ventas', (datos.estadisticas.productosConVentas || 0).toString()],
      ['Productos Stock Crítico', (datos.estadisticas.productosStockCritico || 0).toString()],
      ['Ingresos Totales', `$${(datos.estadisticas.ingresosTotales || 0).toFixed(2)}`],
      ['Unidades Vendidas', (datos.estadisticas.unidadesVendidas || 0).toString()]
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [['Métrica', 'Valor']],
      body: estadisticasData,
      theme: 'grid',
      headStyles: { fillColor: [49, 23, 22], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Top productos
  if (datos.topProductos && datos.topProductos.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Top Productos por Ventas', margin, currentY);
    currentY += 5;
    
    const productosData = datos.topProductos.slice(0, 15).map((producto: any, index: number) => [
      (index + 1).toString(),
      producto.nombre || 'N/A',
      producto.categoria || 'N/A',
      (producto.cantidad_vendida || 0).toString(),
      `$${(producto.ingresos_totales || 0).toFixed(2)}`,
      (producto.transacciones || 0).toString()
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Producto', 'Categoría', 'Vendidos', 'Ingresos', 'Transac.']],
      body: productosData,
      theme: 'striped',
      headStyles: { fillColor: [156, 117, 97], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 8 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  return currentY;
}

// Función para reportes de vendedores
async function generarReporteVendedores(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  // Performance de vendedores
  if (datos.performance && datos.performance.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Performance de Vendedores', margin, currentY);
    currentY += 5;
    
    const vendedoresData = datos.performance.map((vendedor: any, index: number) => [
      (index + 1).toString(),
      vendedor.name || 'N/A',
      (vendedor.total_ventas || 0).toString(),
      `$${(vendedor.ingresos_totales || 0).toFixed(2)}`,
      `$${(vendedor.ticket_promedio || 0).toFixed(2)}`,
      `${vendedor.porcentaje_facturacion || 0}%`
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Vendedor', 'Ventas', 'Ingresos', 'Ticket Prom.', '% Fact.']],
      body: vendedoresData,
      theme: 'striped',
      headStyles: { fillColor: [156, 117, 97], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  return currentY;
}

// Función para reportes de facturación
async function generarReporteFacturacion(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  // Resumen de facturación
  if (datos.resumen) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumen de Facturación', margin, currentY);
    currentY += 8;
    
    const facturacionData = [
      ['Total de Ventas', (datos.resumen.totalVentas || 0).toString()],
      ['Ventas Facturadas', (datos.resumen.ventasFacturadas || 0).toString()],
      ['% Facturación', `${(datos.resumen.porcentajeFacturacion || 0).toFixed(1)}%`],
      ['Monto Facturado', `$${(datos.resumen.montoFacturado || 0).toFixed(2)}`],
      ['% Éxito Facturación', `${(datos.resumen.porcentajeExitoFacturacion || 0).toFixed(1)}%`]
    ];
    
    autoTable(doc, {
      startY: currentY,
      head: [['Métrica', 'Valor']],
      body: facturacionData,
      theme: 'grid',
      headStyles: { fillColor: [49, 23, 22], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  // Distribución por tipo de factura
  if (datos.distribucionTipoFactura && datos.distribucionTipoFactura.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución por Tipo de Factura', margin, currentY);
    currentY += 5;
    
    const tiposData = datos.distribucionTipoFactura.map((tipo: any) => [
      tipo.tipo || 'N/A',
      (tipo.cantidad || 0).toString(),
      `$${(tipo.monto || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Tipo', 'Cantidad', 'Monto']],
      body: tiposData,
      theme: 'striped',
      headStyles: { fillColor: [156, 117, 97], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  return currentY;
}

// Función para reportes de medios de pago
async function generarReporteMediosPago(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  // Distribución de medios de pago
  if (datos.distribucion && datos.distribucion.length > 0) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Distribución de Medios de Pago', margin, currentY);
    currentY += 5;
    
    const mediosData = datos.distribucion.map((medio: any) => [
      medio.medioPago || 'N/A',
      (medio.cantidad_transacciones || 0).toString(),
      `$${(medio.monto_total || 0).toFixed(2)}`,
      `${medio.porcentaje || 0}%`,
      `$${(medio.monto_promedio || 0).toFixed(2)}`
    ]);
    
    autoTable(doc, {
      startY: currentY,
      head: [['Medio de Pago', 'Transacciones', 'Monto Total', '% Total', 'Promedio']],
      body: mediosData,
      theme: 'striped',
      headStyles: { fillColor: [156, 117, 97], textColor: [255, 255, 255] },
      margin: { left: margin, right: margin },
      styles: { fontSize: 9 }
    });
    
    currentY = (doc as any).lastAutoTable.finalY + 10;
  }
  
  return currentY;
}

// Función genérica para otros reportes
async function generarReporteGenerico(doc: jsPDF, datos: any, margin: number, startY: number): Promise<number> {
  let currentY = startY;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text('Datos del reporte:', margin, currentY);
  currentY += 10;
  
  // Mostrar estructura básica de datos
  doc.setFontSize(10);
  const datosStr = JSON.stringify(datos, null, 2);
  const lines = doc.splitTextToSize(datosStr.substring(0, 1000), 170);
  doc.text(lines, margin, currentY);
  currentY += lines.length * 4;
  
  return currentY;
}
