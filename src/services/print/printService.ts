// src/services/print/printService.ts
export interface PrinterConfig {
    id: string;
    name: string;
    type: 'thermal' | 'laser' | 'inkjet';
    sucursalId: string;
    isDefault: boolean;
    settings: {
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
      console.log('🖨️ Inicializando servicio de impresión...');
      
      try {
        // Detectar impresoras disponibles
        await this.detectPrinters();
        
        // Cargar configuración de impresoras por sucursal
        await this.loadPrinterConfigs();
        
        // Iniciar procesamiento de cola
        this.startQueueProcessor();
        
        console.log('✅ Servicio de impresión inicializado correctamente');
      } catch (error) {
        console.error('❌ Error inicializando servicio de impresión:', error);
      }
    }
  
    /**
     * Detectar impresoras disponibles en el sistema
     */
    private async detectPrinters(): Promise<void> {
      try {
        // Usar la Web API para detectar impresoras (si está disponible)
        if ('navigator' in globalThis && 'printer' in navigator) {
          // @ts-ignore - API experimental
          const printers = await navigator.printer.getPrinters?.();
          console.log('Impresoras detectadas:', printers);
        }
  
        // Detectar impresoras mediante consulta al sistema
        await this.querySystemPrinters();
      } catch (error) {
        console.warn('No se pudieron detectar impresoras automáticamente:', error);
      }
    }
  
    /**
     * Consultar impresoras del sistema (fallback)
     */
    private async querySystemPrinters(): Promise<void> {
      try {
        const response = await fetch('/api/system/printers');
        if (response.ok) {
          const printers = await response.json();
          this.installedPrinters = printers;
        }
      } catch (error) {
        console.warn('No se pudo consultar impresoras del sistema:', error);
      }
    }
  
    /**
     * Cargar configuración de impresoras por sucursal
     */
    private async loadPrinterConfigs(): Promise<void> {
      try {
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) return;
  
        const response = await fetch(`/api/admin/sucursales/${sucursalId}/impresoras`);
        if (response.ok) {
          const configs = await response.json();
          this.installedPrinters = [...this.installedPrinters, ...configs];
        }
      } catch (error) {
        console.warn('No se pudo cargar configuración de impresoras:', error);
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
        
        // Obtener datos de la factura
        const facturaData = await this.getFacturaData(facturaId);
        if (!facturaData) {
          throw new Error('No se pudo obtener los datos de la factura');
        }
  
        // Determinar impresora a usar
        const printer = await this.selectPrinter(printerName);
        if (!printer) {
          return await this.fallbackToPDF(facturaId, 'No hay impresora configurada');
        }
  
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
        const response = await fetch(`/api/pdv/facturas/${facturaId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
  
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
  
        return await response.json();
      } catch (error) {
        console.error('Error obteniendo datos de factura:', error);
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
  
      if (availablePrinters.length === 0) {
        return null;
      }
  
      // Si se especifica una impresora, buscarla
      if (printerName) {
        const specific = availablePrinters.find(p => p.name === printerName);
        if (specific) return specific;
      }
  
      // Usar la impresora por defecto
      const defaultPrinter = availablePrinters.find(p => p.isDefault);
      if (defaultPrinter) return defaultPrinter;
  
      // Usar la primera disponible
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
          console.error('Error procesando cola de impresión:', error);
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
        await this.executeprint(pdfBlob, job.printerConfig);
  
        job.status = 'completed';
        job.completedAt = new Date();
        
        console.log(`✅ Trabajo ${job.id} completado exitosamente`);
  
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
        const response = await fetch(`/api/pdv/facturas/${facturaId}/pdf`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          }
        });
  
        if (!response.ok) {
          throw new Error(`Error ${response.status}: ${response.statusText}`);
        }
  
        return await response.blob();
      } catch (error) {
        console.error('Error obteniendo PDF:', error);
        return null;
      }
    }
  
    /**
     * Ejecutar impresión según tipo de impresora
     */
    private async executeprint(pdfBlob: Blob, printerConfig: PrinterConfig): Promise<void> {
      const pdfUrl = URL.createObjectURL(pdfBlob);
  
      try {
        if (printerConfig.type === 'thermal') {
          // Para impresoras térmicas, usar impresión silenciosa
          await this.printSilent(pdfUrl, printerConfig);
        } else {
          // Para otras impresoras, usar método estándar
          await this.printStandard(pdfUrl, printerConfig);
        }
      } finally {
        URL.revokeObjectURL(pdfUrl);
      }
    }
  
    /**
     * Impresión silenciosa para impresoras térmicas
     */
    private async printSilent(pdfUrl: string, printerConfig: PrinterConfig): Promise<void> {
      return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.style.display = 'none';
        iframe.src = pdfUrl;
        
        iframe.onload = () => {
          try {
            // Configurar impresión para papel térmico
            const printWindow = iframe.contentWindow;
            if (printWindow) {
              // Configuración específica para impresoras térmicas
              const mediaQuery = `@media print {
                @page {
                  size: ${printerConfig.settings.paperWidth}mm auto;
                  margin: 0;
                }
                body { margin: 0; }
              }`;
              
              const style = printWindow.document.createElement('style');
              style.textContent = mediaQuery;
              printWindow.document.head.appendChild(style);
              
              // Ejecutar impresión
              printWindow.print();
              
              setTimeout(() => {
                document.body.removeChild(iframe);
                resolve();
              }, 1000);
            } else {
              reject(new Error('No se pudo acceder a la ventana de impresión'));
            }
          } catch (error) {
            reject(error);
          }
        };
        
        iframe.onerror = () => {
          reject(new Error('Error cargando PDF para impresión'));
        };
        
        document.body.appendChild(iframe);
      });
    }
  
    /**
     * Impresión estándar
     */
    private async printStandard(pdfUrl: string, printerConfig: PrinterConfig): Promise<void> {
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
          }, 500);
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
     * Notificar error de impresión al usuario
     */
    private notifyPrintError(job: PrintJob, error: any): void {
      // Crear notificación visual
      const notification = document.createElement('div');
      notification.className = 'print-error-notification';
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
          max-width: 300px;
        ">
          <strong>Error de Impresión</strong><br>
          ${job.error || 'Error desconocido'}<br>
          <button onclick="this.parentElement.parentElement.remove()" style="
            margin-top: 10px;
            padding: 5px 10px;
            background: #c66;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          ">Cerrar</button>
        </div>
      `;
      
      document.body.appendChild(notification);
      
      // Auto-remover después de 10 segundos
      setTimeout(() => {
        if (notification.parentElement) {
          notification.remove();
        }
      }, 10000);
    }
  
    /**
     * Configurar nueva impresora
     */
    async addPrinter(config: Omit<PrinterConfig, 'id'>): Promise<boolean> {
      try {
        const newConfig: PrinterConfig = {
          id: `printer_${Date.now()}`,
          ...config
        };
  
        const response = await fetch('/api/admin/impresoras', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
          },
          body: JSON.stringify(newConfig)
        });
  
        if (response.ok) {
          this.installedPrinters.push(newConfig);
          return true;
        }
  
        return false;
      } catch (error) {
        console.error('Error agregando impresora:', error);
        return false;
      }
    }
  
    /**
     * Obtener impresoras disponibles
     */
    getAvailablePrinters(): PrinterConfig[] {
      const sucursalId = localStorage.getItem('sucursalId');
      return this.installedPrinters.filter(p => 
        p.sucursalId === sucursalId || p.sucursalId === 'all'
      );
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
  }
  
  // Exportar instancia singleton
  export const printService = PrintService.getInstance();