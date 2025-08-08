// src/server/services/producto/barcodeService.ts - VERSIÓN SEGURA Y COMPATIBLE
import { v4 as uuidv4 } from 'uuid';
import prisma from '@/server/db/client';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { createCanvas } from 'canvas';

interface BarcodeAnalysis {
  totalCodes: number;
  numericCodes: number;
  alphanumericCodes: number;
  recommendedFormat: 'NUMERIC' | 'ALPHANUMERIC' | 'MIXED';
  averageLength: number;
  commonPrefixes: string[];
}

export class BarcodeService {
  
  // 🔒 ANÁLISIS DE CÓDIGOS EXISTENTES PARA DETERMINAR FORMATO COMPATIBLE
  async analyzeExistingCodes(): Promise<BarcodeAnalysis> {
    console.log('🔍 [BarcodeService] Analizando códigos existentes para determinar compatibilidad...');
    
    const existingCodes = await prisma.producto.findMany({
      where: { 
        codigoBarras: { not: null },
        activo: true 
      },
      select: { codigoBarras: true }
    });
    
    const codes = existingCodes
      .map(p => p.codigoBarras)
      .filter(Boolean) as string[];
    
    if (codes.length === 0) {
      console.log('📝 [BarcodeService] No hay códigos existentes, usando formato numérico seguro');
      return {
        totalCodes: 0,
        numericCodes: 0,
        alphanumericCodes: 0,
        recommendedFormat: 'NUMERIC',
        averageLength: 13,
        commonPrefixes: []
      };
    }
    
    const numericCodes = codes.filter(code => /^\d+$/.test(code));
    const alphanumericCodes = codes.filter(code => !/^\d+$/.test(code));
    const totalLength = codes.reduce((sum, code) => sum + code.length, 0);
    const averageLength = Math.round(totalLength / codes.length);
    
    // Analizar prefijos comunes
    const prefixes = codes
      .map(code => code.substring(0, 3))
      .reduce((acc, prefix) => {
        acc[prefix] = (acc[prefix] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
    
    const commonPrefixes = Object.entries(prefixes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([prefix]) => prefix);
    
    const analysis: BarcodeAnalysis = {
      totalCodes: codes.length,
      numericCodes: numericCodes.length,
      alphanumericCodes: alphanumericCodes.length,
      recommendedFormat: numericCodes.length > alphanumericCodes.length ? 'NUMERIC' : 
                        alphanumericCodes.length > numericCodes.length ? 'ALPHANUMERIC' : 'MIXED',
      averageLength,
      commonPrefixes
    };
    
    console.log('📊 [BarcodeService] Análisis completado:', analysis);
    return analysis;
  }
  
  // 🔒 GENERAR CÓDIGO COMPATIBLE CON FORMATO EXISTENTE
  async generateCompatibleBarcode(forceFormat?: 'NUMERIC' | 'ALPHANUMERIC'): Promise<string> {
    const analysis = await this.analyzeExistingCodes();
    const format = forceFormat || analysis.recommendedFormat;
    
    console.log(`🎯 [BarcodeService] Generando código en formato ${format}`);
    
    let newCode: string;
    let attempts = 0;
    const maxAttempts = 10;
    
    do {
      if (format === 'NUMERIC') {
        newCode = this.generateNumericCode(analysis);
      } else {
        newCode = this.generateAlphanumericCode(analysis);
      }
      
      // Verificar que el código no existe
      const exists = await prisma.producto.findFirst({
        where: { codigoBarras: newCode }
      });
      
      if (!exists) {
        console.log(`✅ [BarcodeService] Código único generado: ${newCode}`);
        return newCode;
      }
      
      attempts++;
      console.log(`⚠️ [BarcodeService] Código duplicado, reintentando... (${attempts}/${maxAttempts})`);
      
    } while (attempts < maxAttempts);
    
    throw new Error('No se pudo generar un código único después de varios intentos');
  }
  
  // 🔢 GENERAR CÓDIGO NUMÉRICO COMPATIBLE (EAN-13, UPC, etc.)
  private generateNumericCode(analysis: BarcodeAnalysis): string {
    const targetLength = analysis.averageLength > 0 ? analysis.averageLength : 13;
    
    // Si hay prefijos comunes numéricos, usarlos
    const numericPrefixes = analysis.commonPrefixes.filter(p => /^\d+$/.test(p));
    
    if (numericPrefixes.length > 0 && targetLength > 3) {
      // Usar prefijo existente + números aleatorios
      const prefix = numericPrefixes[0];
      const remainingLength = targetLength - prefix.length;
      const randomPart = Math.random()
        .toString()
        .substring(2, 2 + remainingLength)
        .padStart(remainingLength, '0');
      
      return prefix + randomPart;
    }
    
    // Generar código numérico estándar
    if (targetLength === 13) {
      // Formato EAN-13: 779 (Argentina) + código empresa + código producto + dígito verificador
      const countryCode = '779'; // Argentina
      const companyCode = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
      const productCode = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      
      const base = countryCode + companyCode + productCode;
      const checkDigit = this.calculateEAN13CheckDigit(base);
      
      return base + checkDigit;
    }
    
    // Formato personalizado numérico
    return Math.floor(Math.random() * Math.pow(10, targetLength))
      .toString()
      .padStart(targetLength, '0');
  }
  
  // 🔤 GENERAR CÓDIGO ALFANUMÉRICO COMPATIBLE (CODE128)
  private generateAlphanumericCode(analysis: BarcodeAnalysis): string {
    const targetLength = analysis.averageLength > 0 ? analysis.averageLength : 12;
    
    // Si hay prefijos alfanuméricos comunes, usarlos
    const alphaPrefixes = analysis.commonPrefixes.filter(p => !/^\d+$/.test(p));
    
    if (alphaPrefixes.length > 0) {
      const prefix = alphaPrefixes[0];
      const remainingLength = Math.max(4, targetLength - prefix.length);
      const randomPart = Math.random().toString(36).substring(2, 2 + remainingLength).toUpperCase();
      
      return prefix + randomPart;
    }
    
    // Si no hay prefijos, generar código simple y compatible
    const timestamp = Date.now().toString().slice(-6);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    
    return `P${timestamp}${randomSuffix}`; // P de "Producto" + timestamp + random
  }
  
  // 🔢 CALCULAR DÍGITO VERIFICADOR EAN-13
  private calculateEAN13CheckDigit(code12: string): string {
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(code12[i]);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit.toString();
  }
  
  // 🚫 FUNCIÓN SEGURA - NUNCA MODIFICA CÓDIGOS EXISTENTES
  async generateBarcode(productoId: string): Promise<string> {
    // ⚠️ VERIFICAR QUE EL PRODUCTO NO TENGA CÓDIGO EXISTENTE
    const existingProduct = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { codigoBarras: true, nombre: true }
    });
    
    if (existingProduct?.codigoBarras) {
      console.log(`🔒 [BarcodeService] Producto "${existingProduct.nombre}" ya tiene código: ${existingProduct.codigoBarras}`);
      throw new Error(`El producto ya tiene un código de barras asignado: ${existingProduct.codigoBarras}`);
    }
    
    return this.generateCompatibleBarcode();
  }
  
  // 🆕 GENERAR CÓDIGO PARA PRODUCTO NUEVO (SIN ID)
  async generateBarcodeForNewProduct(): Promise<string> {
    return this.generateCompatibleBarcode();
  }
  
  // ⚠️ REGENERAR CÓDIGO EXISTENTE (CON ADVERTENCIAS)
  async regenerateBarcode(productoId: string, confirmed: boolean = false): Promise<string> {
    const product = await prisma.producto.findUnique({
      where: { id: productoId },
      select: { codigoBarras: true, nombre: true }
    });
    
    if (!product) {
      throw new Error('Producto no encontrado');
    }
    
    if (!confirmed && product.codigoBarras) {
      throw new Error(`ADVERTENCIA: El producto "${product.nombre}" ya tiene código "${product.codigoBarras}". Para regenerar, confirme la acción.`);
    }
    
    const newCode = await this.generateCompatibleBarcode();
    console.log(`🔄 [BarcodeService] Código regenerado para "${product.nombre}": ${product.codigoBarras} → ${newCode}`);
    
    return newCode;
  }
  
  // 🔍 OBTENER INFORMACIÓN DE COMPATIBILIDAD
  async getCompatibilityInfo(): Promise<{
    analysis: BarcodeAnalysis;
    recommendations: string[];
    supportedFormats: string[];
  }> {
    const analysis = await this.analyzeExistingCodes();
    const recommendations: string[] = [];
    
    if (analysis.recommendedFormat === 'NUMERIC') {
      recommendations.push('✅ Sistema optimizado para códigos numéricos (máxima compatibilidad)');
      recommendations.push('📱 Compatible con lectores básicos y avanzados');
      recommendations.push('🏪 Formato EAN-13 recomendado para retail');
    } else if (analysis.recommendedFormat === 'ALPHANUMERIC') {
      recommendations.push('⚠️ Sistema usa códigos alfanuméricos');
      recommendations.push('📱 Requiere lectores compatibles con CODE128');
      recommendations.push('✅ Mayor flexibilidad en nombres de productos');
    } else {
      recommendations.push('🔄 Sistema mixto detectado');
      recommendations.push('💡 Considerar estandarizar en un formato');
      recommendations.push('📊 Analizar qué formato funciona mejor');
    }
    
    const supportedFormats = ['CODE128', 'EAN13', 'UPC-A'];
    
    return {
      analysis,
      recommendations,
      supportedFormats
    };
  }
  
  // 🔍 VERIFICAR SI CÓDIGO ES COMPATIBLE
  async isCodeCompatible(code: string): Promise<{
    isCompatible: boolean;
    format: string;
    warnings: string[];
  }> {
    const analysis = await this.analyzeExistingCodes();
    const warnings: string[] = [];
    
    const isNumeric = /^\d+$/.test(code);
    const length = code.length;
    
    // Verificar compatibilidad con códigos existentes
    if (analysis.recommendedFormat === 'NUMERIC' && !isNumeric) {
      warnings.push('⚠️ El código contiene letras pero el sistema usa códigos numéricos');
    }
    
    if (analysis.recommendedFormat === 'ALPHANUMERIC' && isNumeric) {
      warnings.push('💡 El código es numérico pero el sistema usa códigos alfanuméricos');
    }
    
    // Verificar longitud
    if (Math.abs(length - analysis.averageLength) > 3) {
      warnings.push(`📏 Longitud inusual: ${length} caracteres (promedio: ${analysis.averageLength})`);
    }
    
    // Determinar formato
    let format = 'CUSTOM';
    if (isNumeric && length === 13) format = 'EAN13';
    else if (isNumeric && length === 12) format = 'UPC-A';
    else if (!isNumeric) format = 'CODE128';
    
    return {
      isCompatible: warnings.length === 0,
      format,
      warnings
    };
  }
  
  // 🚫 NUNCA MODIFICAR CÓDIGOS EXISTENTES - SOLO VALIDAR
  validateBarcode(code: string): boolean {
    if (!code || code.trim().length === 0) return false;
    if (code.length < 4 || code.length > 20) return false;
    
    // Permitir códigos numéricos y alfanuméricos básicos
    const validPattern = /^[A-Za-z0-9\-]+$/;
    return validPattern.test(code);
  }
  
  // 📊 ESTADÍSTICAS SEGURAS
  async getBarcodeStats(): Promise<{
    total: number;
    withBarcode: number;
    withoutBarcode: number;
    formatAnalysis: BarcodeAnalysis;
    recentlyGenerated: number;
  }> {
    const [total, withBarcode, formatAnalysis] = await Promise.all([
      prisma.producto.count(),
      prisma.producto.count({ where: { codigoBarras: { not: null } } }),
      this.analyzeExistingCodes()
    ]);
    
    // Contar códigos generados recientemente (últimos 7 días)
    const recentlyGenerated = await prisma.producto.count({
      where: {
        codigoBarras: { not: null },
        // Solo si el campo existe en tu schema
        // createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    }).catch(() => 0);
    
    return {
      total,
      withBarcode,
      withoutBarcode: total - withBarcode,
      formatAnalysis,
      recentlyGenerated
    };
  }
  
  // 🔍 BUSCAR PRODUCTO POR CÓDIGO (SIN CAMBIOS)
  async findProductByBarcode(code: string) {
    return prisma.producto.findFirst({
      where: { codigoBarras: code },
      include: { categoria: true }
    });
  }
  
  // 🖼️ GENERAR IMAGEN DE CÓDIGO (VERSIÓN SEGURA)
  generateBarcodeImage(code: string, options: any = {}): string {
    try {
      const defaultOptions = {
        width: 2,
        height: 100,
        displayValue: true,
        fontSize: 12,
        textMargin: 2,
        margin: 10
      };
      
      const finalOptions = { ...defaultOptions, ...options };
      const canvas = createCanvas(300, 120);
      
      // Determinar formato automáticamente
      const format = /^\d+$/.test(code) && code.length === 13 ? 'EAN13' : 'CODE128';
      
      JsBarcode(canvas, code, {
        format,
        ...finalOptions
      });
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('❌ [BarcodeService] Error generando imagen:', error);
      return this.generateTextFallback(code);
    }
  }
  
  // 📄 GENERAR PDF (SIN CAMBIOS FUNCIONALES)
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
  
  // 🔤 FALLBACK DE TEXTO SIMPLE
  private generateTextFallback(code: string): string {
    try {
      const canvas = createCanvas(300, 60);
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, 300, 60);
      ctx.fillStyle = 'black';
      ctx.font = 'bold 16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(code, 150, 35);
      
      return canvas.toDataURL();
    } catch (error) {
      console.error('❌ [BarcodeService] Error en fallback:', error);
      return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAABkCAYAAAA8AQ3AAAAAAXNSR0IArs4c6QAAA...';
    }
  }
}

export const barcodeService = new BarcodeService();