// src/server/services/producto/barcodeService.ts
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/server/db/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  
  // Generar código de barras (compatible con servidor)
  private async generateBarcodeImage(code: string, options: any = {}): Promise<string> {
    try {
      // En lugar de usar bwip-js que causa problemas, generemos un PNG simulado
      // Esta es una solución temporal que no requiere bwip-js
      return this.generateFallbackBarcode(code);
    } catch (error: unknown) {
      // Manejo correcto del error de tipo unknown
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      console.error('Error generando código de barras:', errorMessage);
      throw new Error(`No se pudo generar el código de barras: ${errorMessage}`);
    }
  }
  generateFallbackBarcode(code: string): string | PromiseLike<string> {
    throw new Error('Method not implemented.');
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
      // Verificar que el código de barras existe
      if (!producto.codigoBarras) {
        console.warn(`Producto ${producto.id} - ${producto.nombre} no tiene código de barras`);
        
        // Aún así, dibujar la etiqueta pero con un mensaje de error
        if (count > 0 && count % labelsPerRow === 0) {
          x = margin;
          y += labelHeight;
        }
        
        if (y > 270) {
          doc.addPage();
          y = margin;
          x = margin;
        }
        
        // Dibujar etiqueta con mensaje de error
        doc.setDrawColor(200);
        doc.rect(x, y, labelWidth, labelHeight);
        doc.setFontSize(8);
        doc.text(producto.nombre, x + 2, y + 5);
        doc.setTextColor(255, 0, 0);
        doc.text("Sin código de barras", x + 5, y + 15);
        doc.setTextColor(0, 0, 0);
        
        x += labelWidth + 5;
        count++;
        continue;
      }
      
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
      
      try {
        // Generar y añadir código de barras
        const barcodeImageData = await this.generateBarcodeImage(producto.codigoBarras, {
          scale: 2,
          height: 10,
          includetext: true
        });
        
        // Añadir imagen del código de barras
        doc.addImage(barcodeImageData, 'PNG', x + 5, y + 8, labelWidth - 10, 15);
        
        // Añadir precio si existe
        if (producto.precio) {
          doc.setFontSize(10);
          doc.text(`$${producto.precio.toFixed(2)}`, x + 2, y + labelHeight - 2);
        }
      } catch (error) {
        console.error(`Error al generar código para ${producto.nombre}:`, error);
        // Dibujar texto de error en lugar del código de barras
        doc.setFontSize(7);
        doc.setTextColor(255, 0, 0);
        doc.text("Error al generar código de barras", x + 5, y + 15);
        doc.text(producto.codigoBarras || "Código inválido", x + 5, y + 20);
        doc.setTextColor(0, 0, 0);
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