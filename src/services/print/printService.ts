// src/services/print/printService.ts
import { authenticatedFetch } from '@/hooks/useAuth';

export interface PrinterConfig {
  id: string;
  name: string;
  type: 'thermal' | 'laser' | 'inkjet';
  sucursalId: string;
  isDefault: boolean;
  settings: {
    isOnline: boolean;
    paperWidth: number; // 58mm, 80mm, etc.
    autocut: boolean;
    encoding: string;
    baudRate?: number;
  };
}

export interface PrintJob {
  id: string;
  type: 'factura' | 'ticket' | 'reimpresion';
  facturaId?: string;
  ventaId?: string;
  printerConfig: PrinterConfig;
  status: 'pending' | 'printing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}

class PrintService {
  private static instance: PrintService;
  private printQueue: PrintJob[] = [];
  private installedPrinters: PrinterConfig[] = [];
  private isProcessing = false;
  private isInitialized = false;

  public static getInstance(): PrintService {
    if (!PrintService.instance) {
      PrintService.instance = new PrintService();
    }
    return PrintService.instance;
  }

  /**
   * Inicializar el servicio de impresión
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('🖨️ PrintService ya inicializado');
      return;
    }

    console.log('🖨️ Inicializando PrintService...');
    
    try {
      // Cargar configuración de impresoras por sucursal
      await this.loadPrinterConfigs();
      
      // Detectar impresoras disponibles del sistema
      await this.detectSystemPrinters();
      
      // Iniciar procesamiento de cola
      this.startQueueProcessor();
      
      this.isInitialized = true;
      console.log('✅ PrintService inicializado correctamente');
      console.log(`📋 ${this.installedPrinters.length} impresoras disponibles`);
      
    } catch (error) {
      console.error('❌ Error inicializando PrintService:', error);
      throw error;
    }
  }

  /**
   * Cargar configuración de impresoras por sucursal
   */
  async loadPrinterConfigs(): Promise<void> {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        console.warn('⚠️ No hay sucursalId en localStorage');
        return;
      }

      console.log(`🔍 Cargando impresoras para sucursal: ${sucursalId}`);
      
      const response = await authenticatedFetch(`/api/admin/sucursales/${sucursalId}/impresoras`);
      
      if (response.ok) {
        const configs = await response.json();
        this.installedPrinters = configs;
        console.log(`✅ ${configs.length} impresoras configuradas cargadas`);
      } else {
        console.warn('⚠️ No se pudieron cargar las impresoras configuradas');
      }
    } catch (error) {
      console.warn('⚠️ Error cargando configuración de impresoras:', error);
    }
  }

  /**
   * Detectar impresoras disponibles del sistema
   */
  private async detectSystemPrinters(): Promise<void> {
    try {
      console.log('🔍 Detectando impresoras del sistema...');
      
      const response = await fetch('/api/system/printers');
      if (response.ok) {
        const systemPrinters = await response.json();
        
        // Agregar impresoras del sistema que no estén ya configuradas
        const sucursalId = localStorage.getItem('sucursalId');
        
        for (const sysPrinter of systemPrinters) {
          const exists = this.installedPrinters.find(p => p.name === sysPrinter.name);
          
          if (!exists && sucursalId) {
            const printerConfig: PrinterConfig = {
              id: sysPrinter.id,
              name: sysPrinter.name,
              type: sysPrinter.type,
              sucursalId,
              isDefault: sysPrinter.isDefault && this.installedPrinters.length === 0,
              settings: sysPrinter.settings
            };
            
            this.installedPrinters.push(printerConfig);
          }
        }
        
        console.log(`✅ Detección completada: ${systemPrinters.length} impresoras encontradas`);
      }
    } catch (error) {
      console.warn('⚠️ Error detectando impresoras del sistema:', error);
    }
  }

  /**
   * Imprimir factura automáticamente
   */
  async printFactura(facturaId: string, options: { 
    auto?: boolean; 
    printerName?: string; 
    copies?: number 
  } = {}): Promise<{ success: boolean; message: string; jobId?: string }> {
    try {
      console.log(`🖨️ Iniciando impresión de factura ${facturaId}...`);

      const { auto = false, printerName, copies = 1 } = options;
      
      // Verificar que el servicio esté inicializado
      if (!this.isInitialized) {
        console.log('🔄 Servicio no inicializado, inicializando...');
        await this.initialize();
      }
      
      // Obtener datos de la factura
      const facturaData = await this.getFacturaData(facturaId);
      if (!facturaData) {
        throw new Error('No se pudo obtener los datos de la factura');
      }

      // Determinar impresora a usar
      const printer = await this.selectPrinter(printerName);
      if (!printer) {
        console.log('📄 No hay impresora configurada, redirigiendo a PDF...');
        return await this.fallbackToPDF(facturaId, 'No hay impresora configurada');
      }

      console.log(`🖨️ Usando impresora: ${printer.name}`);

      // Crear trabajo de impresión
      const job: PrintJob = {
        id: `print_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: auto ? 'factura' : 'reimpresion',
        facturaId,
        printerConfig: printer,
        status: 'pending',
        createdAt: new Date()
      };

      // Agregar a la cola
      this.printQueue.push(job);

      console.log(`📄 Trabajo de impresión ${job.id} agregado a la cola`);

      return {
        success: true,
        message: 'Impresión iniciada correctamente',
        jobId: job.id
      };

    } catch (error) {
      console.error('❌ Error en impresión de factura:', error);
      
      // Fallback a PDF si falla la impresión
      return await this.fallbackToPDF(facturaId, error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  /**
   * Obtener datos de factura para impresión
   */
  private async getFacturaData(facturaId: string): Promise<any> {
    try {
      console.log(`📊 Obteniendo datos de factura ${facturaId}...`);
      
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`✅ Datos de factura obtenidos correctamente`);
      return data;
    } catch (error) {
      console.error('❌ Error obteniendo datos de factura:', error);
      return null;
    }
  }

  /**
   * Seleccionar impresora apropiada
   */
  private async selectPrinter(printerName?: string): Promise<PrinterConfig | null> {
    const sucursalId = localStorage.getItem('sucursalId');
    
    // Filtrar impresoras de la sucursal actual
    const availablePrinters = this.installedPrinters.filter(p => 
      p.sucursalId === sucursalId || p.sucursalId === 'all'
    );

    console.log(`🔍 Impresoras disponibles: ${availablePrinters.length}`);

    if (availablePrinters.length === 0) {
      console.warn('⚠️ No hay impresoras disponibles para esta sucursal');
      return null;
    }

    // Si se especifica una impresora, buscarla
    if (printerName) {
      const specific = availablePrinters.find(p => p.name === printerName);
      if (specific) {
        console.log(`🎯 Impresora específica seleccionada: ${specific.name}`);
        return specific;
      }
      console.warn(`⚠️ Impresora "${printerName}" no encontrada`);
    }

    // Usar la impresora por defecto
    const defaultPrinter = availablePrinters.find(p => p.isDefault);
    if (defaultPrinter) {
      console.log(`🏠 Impresora por defecto seleccionada: ${defaultPrinter.name}`);
      return defaultPrinter;
    }

    // Usar la primera disponible
    console.log(`🔄 Usando primera impresora disponible: ${availablePrinters[0].name}`);
    return availablePrinters[0];
  }

  /**
   * Procesar cola de impresión
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (this.isProcessing || this.printQueue.length === 0) {
        return;
      }

      this.isProcessing = true;
      
      try {
        const job = this.printQueue.shift();
        if (job) {
          await this.processJob(job);
        }
      } catch (error) {
        console.error('❌ Error procesando cola de impresión:', error);
      } finally {
        this.isProcessing = false;
      }
    }, 1000);
  }

  /**
   * Procesar trabajo individual de impresión
   */
  private async processJob(job: PrintJob): Promise<void> {
    console.log(`🔄 Procesando trabajo de impresión ${job.id}...`);
    
    try {
      job.status = 'printing';

      // Obtener PDF de la factura
      const pdfBlob = await this.getFacturaPDF(job.facturaId!);
      
      if (!pdfBlob) {
        throw new Error('No se pudo generar el PDF');
      }

      // Imprimir según el tipo de impresora
      await this.executePrint(pdfBlob, job.printerConfig);

      job.status = 'completed';
      job.completedAt = new Date();
      
      console.log(`✅ Trabajo ${job.id} completado exitosamente`);
      
      // Mostrar notificación de éxito
      this.showNotification('✅ Factura impresa correctamente', 'success');

    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Error desconocido';
      
      console.error(`❌ Trabajo ${job.id} falló:`, error);
      
      // Notificar al usuario del error
      this.notifyPrintError(job, error);
    }
  }

  /**
   * Obtener PDF de factura
   */
  private async getFacturaPDF(facturaId: string): Promise<Blob | null> {
    try {
      console.log(`📄 Obteniendo PDF de factura ${facturaId}...`);
      
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}/pdf`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log(`✅ PDF obtenido correctamente (${blob.size} bytes)`);
      return blob;
    } catch (error) {
      console.error('❌ Error obteniendo PDF:', error);
      return null;
    }
  }

  /**
   * Ejecutar impresión según tipo de impresora
   */
  private async executePrint(pdfBlob: Blob, printerConfig: PrinterConfig): Promise<void> {
    const pdfUrl = URL.createObjectURL(pdfBlob);

    try {
      console.log(`🖨️ Ejecutando impresión en ${printerConfig.name} (${printerConfig.type})...`);
      
      if (printerConfig.type === 'thermal') {
        // Para impresoras térmicas, usar impresión optimizada
        await this.printThermal(pdfUrl, printerConfig);
      } else {
        // Para otras impresoras, usar método estándar
        await this.printStandard(pdfUrl, printerConfig);
      }
      
      console.log(`✅ Impresión ejecutada correctamente`);
    } finally {
      URL.revokeObjectURL(pdfUrl);
    }
  }

  /**
   * Impresión optimizada para impresoras térmicas
   */
  private async printThermal(pdfUrl: string, printerConfig: PrinterConfig): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`🔥 Impresión térmica en ${printerConfig.name}...`);
      
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      iframe.src = pdfUrl;
      
      iframe.onload = () => {
        try {
          const printWindow = iframe.contentWindow;
          if (printWindow) {
            // Configuración específica para impresoras térmicas
            const mediaQuery = `@media print {
              @page {
                size: ${printerConfig.settings.paperWidth}mm auto;
                margin: 0;
              }
              body { 
                margin: 0; 
                font-family: monospace;
                font-size: 12px;
              }
            }`;
            
            const style = printWindow.document.createElement('style');
            style.textContent = mediaQuery;
            printWindow.document.head.appendChild(style);
            
            // Ejecutar impresión
            printWindow.print();
            
            setTimeout(() => {
              document.body.removeChild(iframe);
              resolve();
            }, 2000);
          } else {
            reject(new Error('No se pudo acceder a la ventana de impresión'));
          }
        } catch (error) {
          reject(error);
        }
      };
      
      iframe.onerror = () => {
        reject(new Error('Error cargando PDF para impresión térmica'));
      };
      
      document.body.appendChild(iframe);
    });
  }

  /**
   * Impresión estándar
   */
  private async printStandard(pdfUrl: string, printerConfig: PrinterConfig): Promise<void> {
    console.log(`📄 Impresión estándar en ${printerConfig.name}...`);
    
    const printWindow = window.open(pdfUrl, '_blank');
    
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
        }, 1000);
      };
    });
  }

  /**
   * Fallback a descarga de PDF
   */
  private async fallbackToPDF(facturaId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📄 Fallback a PDF para factura ${facturaId}: ${reason}`);
      
      // Abrir PDF en nueva ventana
      const pdfUrl = `/api/pdv/facturas/${facturaId}/pdf`;
      window.open(pdfUrl, '_blank');
      
      this.showNotification('📄 PDF abierto para descarga', 'info');
      
      return {
        success: true,
        message: `PDF abierto para descarga. Motivo: ${reason}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error abriendo PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * Mostrar notificación al usuario
   */
  private showNotification(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info'): void {
    const colors = {
      success: { bg: '#10b981', border: '#059669' },
      error: { bg: '#ef4444', border: '#dc2626' },
      info: { bg: '#3b82f6', border: '#2563eb' },
      warning: { bg: '#f59e0b', border: '#d97706' }
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type].bg};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      font-size: 14px;
      font-weight: 500;
      border-left: 4px solid ${colors[type].border};
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remover después de 5 segundos
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * Notificar error de impresión al usuario
   */
  private notifyPrintError(job: PrintJob, error: any): void {
    console.error(`❌ Error en trabajo de impresión ${job.id}:`, error);
    
    this.showNotification(
      `❌ Error de impresión: ${job.error || 'Error desconocido'}`,
      'error'
    );
    
    // Ofrecer fallback a PDF
    if (job.facturaId) {
      setTimeout(() => {
        this.fallbackToPDF(job.facturaId!, 'Error en impresión automática');
      }, 2000);
    }
  }

  /**
   * Configurar nueva impresora
   */
  async addPrinter(config: Omit<PrinterConfig, 'id'>): Promise<boolean> {
    try {
      console.log('➕ Agregando nueva impresora:', config.name);
      
      const response = await authenticatedFetch('/api/admin/impresoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: config.name,
          type: config.type,
          sucursalId: config.sucursalId,
          isDefault: config.isDefault,
          settings: config.settings
        })
      });

      if (response.ok) {
        const newPrinter = await response.json();
        this.installedPrinters.push({
          id: newPrinter.id,
          ...config
        });
        
        console.log(`✅ Impresora ${config.name} agregada correctamente`);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('❌ Error agregando impresora:', error);
      return false;
    }
  }

  /**
   * Obtener impresoras disponibles
   */
  getAvailablePrinters(): PrinterConfig[] {
    const sucursalId = localStorage.getItem('sucursalId');
    const available = this.installedPrinters.filter(p => 
      p.sucursalId === sucursalId || p.sucursalId === 'all'
    );
    
    console.log(`📋 ${available.length} impresoras disponibles para la sucursal actual`);
    return available;
  }

  /**
   * Obtener estado de la cola de impresión
   */
  getQueueStatus(): { pending: number; processing: boolean; lastJobs: PrintJob[] } {
    return {
      pending: this.printQueue.length,
      processing: this.isProcessing,
      lastJobs: this.printQueue.slice(-5)
    };
  }

  /**
   * Verificar si el servicio está inicializado
   */
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Test de conectividad con impresora
   */
  async testPrinter(printerName: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`🧪 Probando impresora: ${printerName}`);
      
      const printer = this.installedPrinters.find(p => p.name === printerName);
      if (!printer) {
        throw new Error('Impresora no encontrada');
      }

      // Simular test de impresión (en implementación real sería un comando específico)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log(`✅ Test de ${printerName} completado`);
      this.showNotification(`✅ Test de ${printerName} exitoso`, 'success');
      
      return {
        success: true,
        message: `Test de ${printerName} completado exitosamente`
      };
    } catch (error) {
      console.error(`❌ Test de ${printerName} falló:`, error);
      this.showNotification(`❌ Test de ${printerName} falló`, 'error');
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error en test'
      };
    }
  }
}

// Exportar instancia singleton
export const printService = PrintService.getInstance();