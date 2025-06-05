// src/services/print/advancedPrintService.ts
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
  type: 'factura' | 'ticket' | 'batch';
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
   * Imprimir múltiples facturas en lote
   */
  async printBatch(facturaIds: string[], options: {
    printerName?: string;
    copies?: number;
    priority?: 'low' | 'normal' | 'high';
  } = {}): Promise<{ success: boolean; jobId: string; message: string }> {
    
    console.log(`📦 Iniciando impresión en lote de ${facturaIds.length} facturas...`);

    const batchJob: PrintJob = {
      id: `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'batch',
      status: 'pending',
      priority: options.priority || 'normal',
      data: { facturaIds, options },
      printerName: options.printerName,
      copies: options.copies || 1,
      createdAt: new Date(),
      retryCount: 0,
      maxRetries: 2
    };

    // Insertar según prioridad
    this.insertByPriority(batchJob);

    return {
      success: true,
      jobId: batchJob.id,
      message: `Lote de ${facturaIds.length} facturas agregado a la cola`
    };
  }

  /**
   * Imprimir resumen diario de ventas
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
        throw new Error('No se pudieron obtener los datos del resumen');
      }

      const job: PrintJob = {
        id: `summary_${Date.now()}`,
        type: 'batch',
        status: 'pending',
        priority: 'normal',
        data: { summaryData, options },
        printerName: options.printerName,
        copies: 1,
        createdAt: new Date(),
        retryCount: 0,
        maxRetries: 1
      };

      this.printQueue.push(job);

      return {
        success: true,
        message: 'Resumen diario agregado a la cola de impresión'
      };

    } catch (error) {
      console.error('Error generando resumen diario:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error desconocido'
      };
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
  }

  /**
   * Procesar trabajo de resumen diario
   */
  private async processSummaryJob(job: PrintJob): Promise<void> {
    const { summaryData, options } = job.data;
    
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
    html = html.replace(/\{\{fecha\}\}/g, data.fecha);
    html = html.replace(/\{\{sucursal\}\}/g, data.sucursal);
    html = html.replace(/\{\{totalVentas\}\}/g, data.totalVentas.toFixed(2));
    html = html.replace(/\{\{cantidadVentas\}\}/g, data.cantidadVentas.toString());
    html = html.replace(/\{\{totalFacturado\}\}/g, data.totalFacturado.toFixed(2));
    
    // Desglose por método de pago
    let pagosList = '';
    if (data.pagosPorMetodo) {
      for (const pago of data.pagosPorMetodo) {
        pagosList += `
          <tr>
            <td>${this.formatMedioPago(pago.medioPago)}</td>
            <td>$${pago.total.toFixed(2)}</td>
          </tr>
        `;
      }
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
   * Obtener estadísticas de la cola
   */
  public getQueueStats(): {
    total: number;
    pending: number;
    printing: number;
    completed: number;
    failed: number;
    avgProcessingTime: number;
  } {
    const total = this.printQueue.length;
    const pending = this.printQueue.filter(j => j.status === 'pending').length;
    const printing = this.printQueue.filter(j => j.status === 'printing').length;
    const completed = this.printQueue.filter(j => j.status === 'completed').length;
    const failed = this.printQueue.filter(j => j.status === 'failed').length;
    
    // Calcular tiempo promedio de procesamiento
    const completedJobs = this.printQueue.filter(j => 
      j.status === 'completed' && j.startedAt && j.completedAt
    );
    
    const avgProcessingTime = completedJobs.length > 0
      ? completedJobs.reduce((acc, job) => {
          const duration = job.completedAt!.getTime() - job.startedAt!.getTime();
          return acc + duration;
        }, 0) / completedJobs.length
      : 0;

    return {
      total,
      pending,
      printing,
      completed,
      failed,
      avgProcessingTime
    };
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
   * Plantillas de impresión
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
            <tr><td><strong>TOTAL:</strong></td><td style="text-align: right;"><strong>${{total}}</strong></td></tr>
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
          <div class="center">
            <strong>TOTAL: ${{total}}</strong>
          </div>
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
            <tr><td>Total:</td><td>${{totalVentas}}</td></tr>
            <tr><td>Facturado:</td><td>${{totalFacturado}}</td></tr>
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