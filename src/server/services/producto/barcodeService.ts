// src/server/services/producto/barcodeService.ts
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/server/db/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { DOMImplementation, XMLSerializer } from 'xmldom';

export class BarcodeService {
  // Genera un código de barras único para un producto
  async generateBarcode(productoId: string, tipo: string = 'CODE128'): Promise<string> {
    // Formato consistente: TULUM-XXXXX donde XXXXX son los primeros caracteres del ID
    const codigo = `TULUM-${productoId.substring(0, 8)}`;
    
    // Verificar si ya existe un producto con ese código
    const existingProduct = await prisma.producto.findFirst({
      where: { codigoBarras: codigo }
    });
    
    // Si existe, crear un código único con un sufijo identificable
    if (existingProduct) {
      const uniqueCode = `${codigo}-${uuidv4().substring(0, 4)}`;
      return uniqueCode;
    }
    
    return codigo;
  }
  
  // Buscar producto por código de barras
  async findProductByBarcode(code: string) {
    return prisma.producto.findFirst({
      where: { codigoBarras: code }
    });
  }
  
  // Generar SVG del código de barras (para uso interno)
  private generateBarcodeSVG(code: string, options: any = {}): string {
    // Crear un documento DOM virtual para generar SVG
    const document = new DOMImplementation().createDocument('http://www.w3.org/1999/xhtml', 'html', null);
    const svgNode = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    
    // Generar el código de barras usando JsBarcode
    JsBarcode(svgNode, code, {
      format: 'CODE128',
      width: 2,
      height: 100,
      displayValue: true,
      ...options
    });
    
    // Convertir el nodo SVG a string
    return new XMLSerializer().serializeToString(svgNode);
  }
  
  // Generar PDF con múltiples códigos para impresión en lote
  async printBarcodes(productIds: string[]): Promise<Buffer> {
    // Obtener productos
    const productos = await prisma.producto.findMany({
      where: {
        id: { in: productIds }
      }
    });
    
    // Crear documento PDF
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    
    // Configurar variables para layout de etiquetas
    const margin = 10; // margen en mm
    const labelWidth = 50; // ancho de etiqueta en mm
    const labelHeight = 30; // alto de etiqueta en mm
    const labelsPerRow = 3;
    const pageWidth = 210; // A4 ancho en mm
    
    let x = margin;
    let y = margin;
    let count = 0;
    
    // Añadir título
    doc.setFontSize(16);
    doc.text('Etiquetas de códigos de barras - Tulum ERP', margin, y);
    y += 10;
    
    // Añadir fecha
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleDateString()}`, margin, y);
    y += 15;
    
    // Generar etiquetas para cada producto
    for (const producto of productos) {
      if (!producto.codigoBarras) continue;
      
      // Calcular posición de la etiqueta
      if (count > 0 && count % labelsPerRow === 0) {
        x = margin;
        y += labelHeight;
      }
      
      if (y > 270) { // Casi al final de la página A4
        doc.addPage();
        y = margin;
        x = margin;
      }
      
      // Dibujar borde de etiqueta
      doc.setDrawColor(200);
      doc.rect(x, y, labelWidth, labelHeight);
      
      // Añadir información del producto
      doc.setFontSize(8);
      doc.text(producto.nombre.length > 25 ? producto.nombre.substring(0, 22) + '...' : producto.nombre, x + 2, y + 5);
      
      // Generar y añadir código de barras como SVG
      try {
        const svgString = this.generateBarcodeSVG(producto.codigoBarras, {
          width: 1.5,
          height: 15,
          fontSize: 8,
          margin: 0
        });
        
        // Convertir SVG a data URL para insertar en PDF
        const svgBase64 = Buffer.from(svgString).toString('base64');
        const imgSrc = `data:image/svg+xml;base64,${svgBase64}`;
        
        // Añadir imagen del código de barras
        doc.addImage(imgSrc, 'SVG', x + 5, y + 8, labelWidth - 10, 15);
        
        // Añadir precio si existe
        if (producto.precio) {
          doc.setFontSize(10);
          doc.text(`$${producto.precio.toFixed(2)}`, x + 2, y + labelHeight - 2);
        }
      } catch (error) {
        console.error(`Error al generar código para ${producto.nombre}:`, error);
        doc.text(`Error: ${producto.codigoBarras}`, x + 5, y + 15);
      }
      
      // Actualizar posición para la siguiente etiqueta
      x += labelWidth + 5;
      count++;
    }
    
    // Si no hay productos
    if (count === 0) {
      doc.text('No hay productos con códigos de barras para imprimir', margin, y);
    }
    
    // Devolver como buffer
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  // Generar PDF con etiquetas de un solo producto (múltiples copias)
  async printProductBarcode(productoId: string, copies: number = 1): Promise<Buffer> {
    const producto = await prisma.producto.findUnique({
      where: { id: productoId }
    });
    
    if (!producto || !producto.codigoBarras) {
      throw new Error('Producto no encontrado o sin código de barras');
    }
    
    // Crear lista de IDs repetidos según cantidad de copias
    const productIds = Array(copies).fill(productoId);
    
    // Usar la función existente para generar el PDF
    return this.printBarcodes(productIds);
  }
  
  // Generar PDF de inventario con códigos de barras
  async generateInventoryBarcodeSheet(ubicacionId?: string): Promise<Buffer> {
    // Buscar productos con stock en la ubicación específica
    const stockItems = ubicacionId ? 
      await prisma.stock.findMany({
        where: {
          ubicacionId,
          productoId: { not: null },
          cantidad: { gt: 0 }
        },
        include: {
          producto: true,
          ubicacion: true
        }
      }) : 
      await prisma.stock.findMany({
        where: {
          productoId: { not: null },
          cantidad: { gt: 0 }
        },
        include: {
          producto: true,
          ubicacion: true
        }
      });
    
    // Extraer productos con códigos de barras
    const productos = stockItems
      .filter(item => item.producto?.codigoBarras)
      .map(item => ({
        id: item.producto!.id,
        nombre: item.producto!.nombre,
        codigoBarras: item.producto!.codigoBarras!,
        precio: item.producto!.precio,
        stock: item.cantidad,
        ubicacion: item.ubicacion.nombre
      }));
    
    // Crear PDF
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(16);
    doc.text('Inventario con Códigos de Barras', 14, 15);
    
    // Fecha de generación
    doc.setFontSize(10);
    doc.text(`Generado: ${new Date().toLocaleString()}`, 14, 22);
    
    // Tabla de inventario con códigos
    const tableColumn = [
      { header: 'Producto', dataKey: 'nombre' },
      { header: 'Código', dataKey: 'codigoBarras' },
      { header: 'Stock', dataKey: 'stock' },
      { header: 'Precio', dataKey: 'precio' },
      { header: 'Ubicación', dataKey: 'ubicacion' }
    ];
    
    const tableRows = productos.map(p => ({
      nombre: p.nombre,
      codigoBarras: p.codigoBarras,
      stock: p.stock.toString(),
      precio: `$${p.precio.toFixed(2)}`,
      ubicacion: p.ubicacion
    }));
    
    autoTable(doc, {
      head: [tableColumn.map(c => c.header)],
      body: tableRows.map(row => 
        tableColumn.map(col => row[col.dataKey as keyof typeof row])
      ),
      startY: 30,
      styles: { overflow: 'linebreak' },
      columnStyles: { 0: { cellWidth: 60 } }
    });
    
    return Buffer.from(doc.output('arraybuffer'));
  }
  
  // Validar código de barras
  validateBarcode(code: string): boolean {
    // Verificar formato básico (comienza con TULUM-)
    if (!code.startsWith('TULUM-')) {
      return false;
    }
    
    // Se podrían agregar más validaciones si fuera necesario
    // Por ejemplo, verificar longitud, caracteres válidos, etc.
    return true;
  }
}

export const barcodeService = new BarcodeService();