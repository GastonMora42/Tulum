// src/services/print/advancedPrintService.ts - VERSIÓN CORREGIDA
import { authenticatedFetch } from '@/hooks/useAuth';
import { printService } from './printService';

export interface PrintTemplate {
  id: string;
  name: string;
  type: 'factura' | 'ticket' | 'resumen_diario';
  template: string;
  paperSize: '58mm' | '80mm' | 'A4';
  isDefault: boolean;
}

export interface PrintJob {
  id: string;
  type: 'factura' | 'ticket' | 'batch' | 'resumen_diario';
  status: 'pending' | 'printing' | 'completed' | 'failed' | 'cancelled';
  priority: 'low' | 'normal' | 'high';
  data: any;
  printerName?: string;
  copies: number;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

class AdvancedPrintService {
  private printQueue: PrintJob[] = [];
  private isProcessing = false;
  private batchSize = 5;
  private retryDelay = 3000; // 3 segundos
  private templates: Map<string, PrintTemplate> = new Map();

  constructor() {
    this.initializeTemplates();
    this.startBatchProcessor();
  }

  /**
   * Inicializar plantillas de impresión
   */
  private async initializeTemplates() {
    const defaultTemplates: PrintTemplate[] = [
      {
        id: 'factura_termica_80mm',
        name: 'Factura Térmica 80mm',
        type: 'factura',
        template: this.getFacturaTemplate80mm(),
        paperSize: '80mm',
        isDefault: true
      },
      {
        id: 'ticket_venta_58mm',
        name: 'Ticket Venta 58mm',
        type: 'ticket',
        template: this.getTicketTemplate58mm(),
        paperSize: '58mm',
        isDefault: false
      },
      {
        id: 'resumen_diario_80mm',
        name: 'Resumen Diario 80mm',
        type: 'resumen_diario',
        template: this.getResumenTemplate80mm(),
        paperSize: '80mm',
        isDefault: true
      }
    ];

    defaultTemplates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  /**
   * Función auxiliar para crear objetos de retorno seguros
   */
  private createSafeReturnObject(success: boolean, message: string, additionalData?: any): any {
    const baseResult = {
      success: success,
      message: message
    };
    
    if (additionalData) {
      return Object.assign(baseResult, additionalData);
    }
    
    return baseResult;
  }

  /**
   * Imprimir múltiples facturas en lote - REESCRITO
   */
  async printBatch(facturaIds: string[], options: {
    printerName?: string;
    copies?: number;
    priority?: 'low' | 'normal' | 'high';
  } = {}): Promise<{ success: boolean; jobId: string; message: string }> {
    
    console.log(`📦 Iniciando impresión en lote de ${facturaIds.length} facturas...`);

    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const jobMessage = `Lote de ${facturaIds.length} facturas agregado a la cola`;

    const batchJob: PrintJob = {
      id: jobId,
      type: 'batch',
      status: 'pending',
      priority: options.priority || 'normal',
      data: { facturaIds: facturaIds, options: options },
      printerName: options.printerName,
      copies: options.copies || 1,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2
    };

    // Insertar según prioridad
    this.insertByPriority(batchJob);

    // Retornar objeto explícito
    const result = {
      success: true,
      jobId: jobId,
      message: jobMessage
    };

    return result;
  }

  /**
   * Imprimir resumen diario de ventas - REESCRITO
   */
  async printDailySummary(fecha: Date, sucursalId: string, options: {
    includeDetails?: boolean;
    printerName?: string;
  } = {}): Promise<{ success: boolean; message: string }> {
    
    try {
      console.log(`📊 Generando resumen diario para ${fecha.toISOString().split('T')[0]}...`);

      // Obtener datos de ventas del día
      const summaryData = await this.getDailySummaryData(fecha, sucursalId);
      
      if (!summaryData) {
        const errorMessage = 'No se pudieron obtener los datos del resumen';
        return this.createSafeReturnObject(false, errorMessage);
      }

      const job: PrintJob = {
        id: `summary_${Date.now()}`,
        type: 'resumen_diario',
        status: 'pending',
        priority: 'normal',
        data: { summaryData: summaryData, options: options },
        printerName: options.printerName,
        copies: 1,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 1
      };

      this.printQueue.push(job);

      const successMessage = 'Resumen diario agregado a la cola de impresión';
      return this.createSafeReturnObject(true, successMessage);

    } catch (error) {
      console.error('Error generando resumen diario:', error);
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      return this.createSafeReturnObject(false, errorMessage);
    }
  }

  /**
   * Procesador de lotes en segundo plano
   */
  private startBatchProcessor() {
    setInterval(async () => {
      if (this.isProcessing || this.printQueue.length === 0) {
        return;
      }

      this.isProcessing = true;

      try {
        // Procesar trabajos por prioridad
        const sortedJobs = this.printQueue
          .filter(job => job.status === 'pending')
          .sort((a, b) => {
            const priorityOrder = { high: 3, normal: 2, low: 1 };
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          });

        const batch = sortedJobs.slice(0, this.batchSize);
        
        for (const job of batch) {
          try {
            await this.processJob(job);
          } catch (error) {
            console.error(`Error procesando trabajo ${job.id}:`, error);
            await this.handleJobError(job, error);
          }
        }

      } finally {
        this.isProcessing = false;
      }
    }, 2000);
  }

  /**
   * Procesar trabajo individual
   */
  private async processJob(job: PrintJob): Promise<void> {
    console.log(`⚙️ Procesando trabajo: ${job.id} (${job.type})`);
    
    job.status = 'printing';
    job.startedAt = new Date();

    try {
      switch (job.type) {
        case 'factura':
          await this.processFacturaJob(job);
          break;
        case 'ticket':
          await this.processTicketJob(job);
          break;
        case 'batch':
          await this.processBatchJob(job);
          break;
        case 'resumen_diario':
          await this.processSummaryJob(job);
          break;
        default:
          throw new Error(`Tipo de trabajo desconocido: ${job.type}`);
      }

      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`✅ Trabajo ${job.id} completado exitosamente`);

    } catch (error) {
      console.error(`❌ Error en trabajo ${job.id}:`, error);
      throw error;
    }
  }

  /**
   * Procesar trabajo de factura individual - IMPLEMENTADO
   */
  private async processFacturaJob(job: PrintJob): Promise<void> {
    const { facturaId, options = {} } = job.data;
    
    console.log(`📄 Procesando factura individual: ${facturaId}`);

    // Usar el servicio base para imprimir
    const result = await printService.printFactura(facturaId, {
      printerName: job.printerName,
      copies: job.copies,
      auto: false
    });

    if (!result.success) {
      throw new Error(result.message || 'Error en impresión de factura');
    }

    console.log(`✅ Factura ${facturaId} impresa correctamente`);
  }

  /**
   * Procesar trabajo de ticket - IMPLEMENTADO
   */
  private async processTicketJob(job: PrintJob): Promise<void> {
    const { ventaId, options = {} } = job.data;
    
    console.log(`🎫 Procesando ticket de venta: ${ventaId}`);

    try {
      // Generar ticket temporal para la venta
      const response = await authenticatedFetch('/api/pdv/tickets/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ventaId,
          format: 'thermal',
          paperWidth: 80
        })
      });

      if (!response.ok) {
        throw new Error('No se pudo generar el ticket');
      }

      const ticketData = await response.json();

      // Si hay impresora configurada, enviar a imprimir
      if (job.printerName) {
        await this.printTicketContent(ticketData, job.printerName);
      } else {
        console.log('✅ Ticket generado (sin impresión automática)');
      }

    } catch (error) {
      console.error('Error procesando ticket:', error);
      throw error;
    }
  }

  /**
   * Procesar trabajo de lote
   */
  private async processBatchJob(job: PrintJob): Promise<void> {
    const { facturaIds, options } = job.data;
    
    console.log(`📦 Procesando lote de ${facturaIds.length} facturas...`);

    let processed = 0;
    let errors = 0;

    for (const facturaId of facturaIds) {
      try {
        const result = await printService.printFactura(facturaId, {
          printerName: job.printerName,
          copies: job.copies,
          auto: false
        });

        if (result.success) {
          processed++;
        } else {
          errors++;
          console.warn(`⚠️ Error en factura ${facturaId}: ${result.message}`);
        }

        // Pausa entre impresiones para no saturar
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (error) {
        errors++;
        console.error(`❌ Error imprimiendo factura ${facturaId}:`, error);
      }
    }

    if (errors > 0) {
      throw new Error(`Lote completado con errores: ${processed} exitosas, ${errors} fallidas`);
    }

    console.log(`✅ Lote completado: ${processed} facturas procesadas`);
  }

  /**
   * Procesar trabajo de resumen diario
   */
  private async processSummaryJob(job: PrintJob): Promise<void> {
    const { summaryData, options } = job.data;
    
    console.log(`📊 Procesando resumen diario...`);
    
    // Generar contenido HTML del resumen
    const htmlContent = this.generateSummaryHTML(summaryData, options);
    
    // Convertir a PDF y enviar a impresora
    const pdfBlob = await this.htmlToPdf(htmlContent);
    
    if (!pdfBlob) {
      throw new Error('No se pudo generar PDF del resumen');
    }

    // Usar el servicio base para imprimir
    const printer = printService.getAvailablePrinters()
      .find(p => p.name === job.printerName) || 
      printService.getAvailablePrinters().find(p => p.isDefault);

    if (!printer) {
      throw new Error('No hay impresora disponible para el resumen');
    }

    await this.printPdfToThermal(pdfBlob, printer);
    console.log(`✅ Resumen diario impreso correctamente`);
  }

  /**
   * Imprimir contenido de ticket - NUEVA FUNCIÓN
   */
  private async printTicketContent(ticketData: any, printerName: string): Promise<void> {
    try {
      // Crear blob con el contenido del ticket
      const content = this.formatTicketForPrint(ticketData);
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      
      // Crear URL temporal y abrir para impresión
      const url = URL.createObjectURL(blob);
      
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión');
      }

      return new Promise((resolve, reject) => {
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
              printWindow.close();
              resolve();
            } catch (error) {
              reject(error);
            }
          }, 500);
        };
      });
    } catch (error) {
      console.error('Error imprimiendo ticket:', error);
      throw error;
    }
  }

  /**
   * Formatear ticket para impresión térmica
   */
  private formatTicketForPrint(ticketData: any): string {
    const { venta } = ticketData;
    const fecha = new Date(venta.fecha).toLocaleString('es-AR');
    
    let content = '';
    content += '========================================\n';
    content += '           TULUM AROMATERAPIA          \n';
    content += '              TICKET VENTA             \n';
    content += '========================================\n';
    content += `Ticket: #${venta.id.slice(-6)}\n`;
    content += `Fecha: ${fecha}\n`;
    content += `Vendedor: ${venta.usuario?.name || 'N/A'}\n`;
    content += '----------------------------------------\n';
    
    // Items
    venta.items.forEach((item: any) => {
      const producto = item.producto.nombre.substring(0, 25);
      const cantidad = item.cantidad;
      const precio = item.precioUnitario;
      const subtotal = cantidad * precio;
      
      content += `${producto}\n`;
      content += `  ${cantidad} x $${precio.toFixed(2)} = $${subtotal.toFixed(2)}\n`;
    });
    
    content += '----------------------------------------\n';
    content += `TOTAL: $${venta.total.toFixed(2)}\n`;
    content += '========================================\n';
    
    // Métodos de pago
    if (venta.pagos?.length > 0) {
      content += 'PAGOS:\n';
      venta.pagos.forEach((pago: any) => {
        content += `  ${this.formatMedioPago(pago.medioPago)}: $${pago.monto.toFixed(2)}\n`;
      });
      content += '----------------------------------------\n';
    }
    
    content += '         ¡Gracias por su compra!       \n';
    content += '========================================\n';
    
    return content;
  }

  /**
   * Manejar error en trabajo
   */
  private async handleJobError(job: PrintJob, error: any): Promise<void> {
    job.retryCount++;
    job.error = error instanceof Error ? error.message : 'Error desconocido';

    if (job.retryCount <= job.maxRetries) {
      console.log(`🔄 Reintentando trabajo ${job.id} (intento ${job.retryCount}/${job.maxRetries})`);
      
      // Esperar antes del reintento
      setTimeout(() => {
        job.status = 'pending';
        job.error = undefined;
      }, this.retryDelay * job.retryCount);
      
    } else {
      console.error(`💀 Trabajo ${job.id} falló definitivamente después de ${job.maxRetries} intentos`);
      job.status = 'failed';
      job.completedAt = new Date();
      
      // Notificar al usuario
      this.notifyJobFailure(job);
    }
  }

  /**
   * Insertar trabajo por prioridad
   */
  private insertByPriority(job: PrintJob): void {
    const priorityOrder = { high: 3, normal: 2, low: 1 };
    
    let insertIndex = this.printQueue.length;
    
    for (let i = 0; i < this.printQueue.length; i++) {
      if (priorityOrder[job.priority] > priorityOrder[this.printQueue[i].priority]) {
        insertIndex = i;
        break;
      }
    }
    
    this.printQueue.splice(insertIndex, 0, job);
  }

  /**
   * Obtener datos para resumen diario
   */
  private async getDailySummaryData(fecha: Date, sucursalId: string): Promise<any> {
    try {
      const fechaStr = fecha.toISOString().split('T')[0];
      
      const response = await authenticatedFetch(
        `/api/pdv/reportes/resumen-diario?fecha=${fechaStr}&sucursalId=${sucursalId}`
      );

      if (!response.ok) {
        throw new Error('Error obteniendo datos del resumen');
      }

      return await response.json();
    } catch (error) {
      console.error('Error obteniendo datos de resumen:', error);
      return null;
    }
  }

  /**
   * Generar HTML para resumen diario
   */
  private generateSummaryHTML(data: any, options: any): string {
    const template = this.templates.get('resumen_diario_80mm');
    if (!template) {
      throw new Error('Plantilla de resumen no encontrada');
    }

    // Sustituir variables en la plantilla
    let html = template.template;
    
    // Variables básicas
    html = html.replace(/\{\{fecha\}\}/g, data.fecha || '');
    html = html.replace(/\{\{sucursal\}\}/g, data.sucursal || '');
    html = html.replace(/\{\{totalVentas\}\}/g, (data.totalVentas || 0).toFixed(2));
    html = html.replace(/\{\{cantidadVentas\}\}/g, (data.cantidadVentas || 0).toString());
    html = html.replace(/\{\{totalFacturado\}\}/g, (data.totalFacturado || 0).toFixed(2));
    
    // Desglose por método de pago
    let pagosList = '';
    if (data.pagosPorMetodo && Array.isArray(data.pagosPorMetodo)) {
      data.pagosPorMetodo.forEach((pagoItem: any) => {
        pagosList += `
          <tr>
            <td>${this.formatMedioPago(pagoItem.medioPago || '')}</td>
            <td>${(pagoItem.total || 0).toFixed(2)}</td>
          </tr>
        `;
      });
    }
    html = html.replace(/\{\{pagosPorMetodo\}\}/g, pagosList);

    return html;
  }

  /**
   * Convertir HTML a PDF
   */
  private async htmlToPdf(html: string): Promise<Blob | null> {
    try {
      // En un entorno real, usarías una librería como Puppeteer o jsPDF
      // Por ahora, crear un blob simple
      const blob = new Blob([html], { type: 'text/html' });
      return blob;
    } catch (error) {
      console.error('Error convirtiendo HTML a PDF:', error);
      return null;
    }
  }

  /**
   * Imprimir PDF en impresora térmica
   */
  private async printPdfToThermal(pdfBlob: Blob, printer: any): Promise<void> {
    const url = URL.createObjectURL(pdfBlob);
    
    try {
      const printWindow = window.open(url, '_blank');
      if (!printWindow) {
        throw new Error('No se pudo abrir ventana de impresión');
      }

      return new Promise((resolve, reject) => {
        printWindow.onload = () => {
          setTimeout(() => {
            try {
              printWindow.print();
              printWindow.close();
              resolve();
            } catch (error) {
              reject(error);
            }
          }, 500);
        };
      });
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  /**
   * Notificar fallo de trabajo
   */
  private notifyJobFailure(job: PrintJob): void {
    const notification = document.createElement('div');
    notification.className = 'print-job-failure-notification';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: #fee;
        border: 1px solid #fcc;
        color: #c66;
        padding: 15px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 350px;
      ">
        <strong>Error en Trabajo de Impresión</strong><br>
        Tipo: ${job.type}<br>
        Error: ${job.error}<br>
        <div style="margin-top: 10px;">
          <button onclick="advancedPrintService.retryJob('${job.id}')" style="
            margin-right: 10px;
            padding: 5px 10px;
            background: #c66;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Reintentar</button>
          <button onclick="this.parentElement.parentElement.parentElement.remove()" style="
            padding: 5px 10px;
            background: #999;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Cerrar</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 15000);
  }

  /**
   * Reintentar trabajo fallido
   */
  public retryJob(jobId: string): void {
    const job = this.printQueue.find(j => j.id === jobId);
    if (job && job.status === 'failed') {
      job.status = 'pending';
      job.retryCount = 0;
      job.error = undefined;
      console.log(`🔄 Reintentando trabajo ${jobId} manualmente`);
    }
  }

  /**
   * Obtener estadísticas de la cola - CORREGIDO
   */
  public getQueueStats(): {
    total: number;
    pending: number;
    printing: number;
    completed: number;
    failed: number;
    avgProcessingTime: number;
  } {
    // Calcular contadores
    const totalJobs = this.printQueue.length;
    const pendingJobs = this.printQueue.filter(j => j.status === 'pending').length;
    const printingJobs = this.printQueue.filter(j => j.status === 'printing').length;
    const completedJobs = this.printQueue.filter(j => j.status === 'completed').length;
    const failedJobs = this.printQueue.filter(j => j.status === 'failed').length;
    
    // Calcular tiempo promedio de procesamiento
    const jobsWithTiming = this.printQueue.filter(j => 
      j.status === 'completed' && j.startedAt && j.completedAt
    );
    
    let averageTime = 0;
    if (jobsWithTiming.length > 0) {
      const totalTime = jobsWithTiming.reduce((acc, job) => {
        const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
        return acc + duration;
      }, 0);
      averageTime = totalTime / jobsWithTiming.length;
    }

    // Retornar objeto con propiedades explícitas
    const stats = {
      total: totalJobs,
      pending: pendingJobs,
      printing: printingJobs,
      completed: completedJobs,
      failed: failedJobs,
      avgProcessingTime: averageTime
    };

    return stats;
  }

  /**
   * Formatear medio de pago para resumen
   */
  private formatMedioPago(medio: string): string {
    const map: Record<string, string> = {
      'efectivo': 'Efectivo',
      'tarjeta_credito': 'T. Crédito',
      'tarjeta_debito': 'T. Débito',
      'transferencia': 'Transferencia',
      'qr': 'QR'
    };
    return map[medio] || medio;
  }

  /**
   * Plantillas de impresión - CORREGIDAS
   */
  private getFacturaTemplate80mm(): string {
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; font-size: 10px; margin: 5mm; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 2px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <strong>TULUM AROMATERAPIA</strong><br>
            FACTURA {{tipoFactura}}<br>
            {{numeroFactura}}<br>
            {{fecha}}
          </div>
          <div class="line"></div>
          {{detalleProductos}}
          <div class="line"></div>
          <table>
            <tr><td><strong>TOTAL:</strong></td><td style="text-align: right;"><strong>{{totalMonto}}</strong></td></tr>
          </table>
          <div class="line"></div>
          <div class="center">
            CAE: {{cae}}<br>
            Vto: {{vencimientoCae}}
          </div>
        </body>
      </html>
    `;
  }

  private getTicketTemplate58mm(): string {
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: 58mm auto; margin: 0; }
            body { font-family: monospace; font-size: 9px; margin: 3mm; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 3px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <strong>TULUM</strong><br>
            TICKET VENTA<br>
            #{{numeroVenta}}<br>
            {{fecha}}
          </div>
          <div class="line"></div>
          {{detalleProductos}}
          <div class="line"></div>
          <table>
            <tr><td><strong>TOTAL:</strong></td><td style="text-align: right;"><strong>{{totalMonto}}</strong></td></tr>
          </table>
        </body>
      </html>
    `;
  }

  private getResumenTemplate80mm(): string {
    return `
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            @page { size: 80mm auto; margin: 0; }
            body { font-family: monospace; font-size: 10px; margin: 5mm; }
            .center { text-align: center; }
            .line { border-bottom: 1px dashed #000; margin: 5px 0; }
            table { width: 100%; border-collapse: collapse; }
            td { padding: 1px 0; }
          </style>
        </head>
        <body>
          <div class="center">
            <strong>RESUMEN DIARIO</strong><br>
            {{sucursal}}<br>
            {{fecha}}
          </div>
          <div class="line"></div>
          <table>
            <tr><td>Ventas:</td><td>{{cantidadVentas}}</td></tr>
            html = html.replace(/\{\{totalVentas\}\}/g, (data.totalVentas || 0).toFixed(2));
html = html.replace(/\{\{totalFacturado\}\}/g, (data.totalFacturado || 0).toFixed(2));
          </table>
          <div class="line"></div>
          <strong>Pagos por método:</strong>
          <table>
            {{pagosPorMetodo}}
          </table>
        </body>
      </html>
    `;
  }
}

// Exportar instancia singleton
export const advancedPrintService = new AdvancedPrintService();

// Hacer disponible globalmente para notificaciones
(window as any).advancedPrintService = advancedPrintService;