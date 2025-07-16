// 1. CORRECCIÓN: src/services/print/integratedPrintManager.ts
import { FukunPrintServiceFixed } from './fukunPrintServiceFixed';
import { authenticatedFetch } from '@/hooks/useAuth';

interface PrinterConfig {
  id: string;
  name: string;
  type: 'fukun' | 'thermal' | 'standard';
  isDefault: boolean;
  isConnected: boolean;
}

export class IntegratedPrintManager {
  private static instance: IntegratedPrintManager;
  private fukunService: FukunPrintServiceFixed;
  private configuredPrinters: PrinterConfig[] = [];
  private currentPrinter: PrinterConfig | null = null;

  private constructor() {
    this.fukunService = new FukunPrintServiceFixed();
  }

  public static getInstance(): IntegratedPrintManager {
    if (!IntegratedPrintManager.instance) {
      IntegratedPrintManager.instance = new IntegratedPrintManager();
    }
    return IntegratedPrintManager.instance;
  }

  /**
   * INICIALIZACIÓN SIMPLIFICADA
   */
  async initialize(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🚀 Inicializando sistema de impresión integrado...');

      // Verificar soporte WebUSB
      if (!navigator.usb) {
        return {
          success: false,
          message: 'WebUSB no soportado. Use Chrome en Android o escritorio.'
        };
      }

      // Intentar conectar automáticamente a Fukun
      const connectionResult = await this.fukunService.connectToFukun();
      
      if (connectionResult.success) {
        this.currentPrinter = {
          id: 'fukun-main',
          name: 'Fukun 80 POS',
          type: 'fukun',
          isDefault: true,
          isConnected: true
        };

        this.configuredPrinters = [this.currentPrinter];
        await this.savePrinterConfig();
      }

      return {
        success: connectionResult.success,
        message: connectionResult.success 
          ? 'Sistema inicializado y Fukun conectada'
          : `Inicializado sin impresora: ${connectionResult.message}`
      };

    } catch (error) {
      console.error('❌ Error inicializando:', error);
      return {
        success: false,
        message: `Error de inicialización: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * 🔧 FUNCIÓN PRINCIPAL - IMPRIMIR FACTURA (CORREGIDA)
   */
  async printFactura(facturaId: string, options: {
    auto?: boolean;
    copies?: number;
  } = {}): Promise<{ success: boolean; message: string; jobId?: string }> {
    
    try {
      console.log(`🖨️ [PRINT] Imprimiendo factura ${facturaId}...`);

      // Verificar que hay impresora conectada
      if (!this.currentPrinter?.isConnected) {
        console.log('🔄 [PRINT] Impresora no conectada, intentando reconectar...');
        const reconnectResult = await this.fukunService.connectToFukun();
        if (!reconnectResult.success) {
          return {
            success: false,
            message: 'No hay impresora conectada. Use el botón "Configurar Impresora" primero.'
          };
        }
        console.log('✅ [PRINT] Reconectado correctamente');
      }

      // 🔧 OBTENER DATOS DE LA FACTURA CON RETRY Y VALIDACIÓN
      console.log('📊 [PRINT] Obteniendo datos de factura...');
      const facturaData = await this.getFacturaDataWithRetry(facturaId);
      
      if (!facturaData) {
        throw new Error('No se pudieron obtener los datos de la factura');
      }

      // 🔧 VALIDAR ESTRUCTURA DE DATOS
      const validatedData = this.validateAndFormatFacturaData(facturaData);
      
      console.log('📋 [PRINT] Datos de factura validados:', {
        tipoComprobante: validatedData.tipoComprobante,
        numeroFactura: validatedData.numeroFactura,
        clienteNombre: validatedData.venta?.clienteNombre,
        itemsCount: validatedData.venta?.items?.length || 0,
        total: validatedData.venta?.total
      });

      // 🔧 IMPRIMIR CON MANEJO DE ERRORES MEJORADO
      console.log('🖨️ [PRINT] Enviando a impresora Fukun...');
      const printResult = await this.fukunService.printFactura(validatedData);

      if (printResult.success) {
        console.log('✅ [PRINT] Impresión exitosa');
        this.showNotification('✅ Factura impresa correctamente', 'success');
        
        // Abrir cajón si la impresión fue exitosa
        setTimeout(() => {
          this.fukunService.openCashDrawer();
        }, 1000);
      } else {
        console.warn('⚠️ [PRINT] Impresión falló:', printResult.message);
      }

      return printResult;

    } catch (error) {
      console.error('❌ [PRINT] Error imprimiendo factura:', error);
      
      // Fallback: abrir PDF
      return await this.fallbackToPDF(facturaId, error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  /**
   * 🔧 NUEVA FUNCIÓN: Obtener datos de factura con retry
   */
  private async getFacturaDataWithRetry(facturaId: string, maxRetries: number = 3): Promise<any> {
    let lastError: any = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📊 [PRINT] Intento ${attempt}/${maxRetries} obteniendo factura ${facturaId}...`);
        
        const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}`);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        
        // Validar que los datos mínimos estén presentes
        if (!data.id) {
          throw new Error('Datos de factura incompletos - Sin ID');
        }

        // 🔧 VALIDAR QUE LA FACTURA TENGA DATOS DE VENTA
        if (!data.venta) {
          throw new Error('Datos de factura incompletos - Sin datos de venta');
        }

        // 🔧 ESPERAR A QUE LA FACTURA ESTÉ COMPLETAMENTE PROCESADA
        if (data.estado === 'procesando' && attempt < maxRetries) {
          console.log(`⏳ [PRINT] Factura aún procesando, esperando...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }

        console.log(`✅ [PRINT] Datos de factura obtenidos en intento ${attempt}`);
        return data;

      } catch (error) {
        lastError = error;
        console.warn(`⚠️ [PRINT] Intento ${attempt} falló:`, error);
        
        if (attempt < maxRetries) {
          const delay = attempt * 1000; // Incrementar delay
          console.log(`🔄 [PRINT] Esperando ${delay}ms antes del siguiente intento...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('No se pudo obtener los datos de la factura después de varios intentos');
  }

  /**
   * 🔧 NUEVA FUNCIÓN: Validar y formatear datos de factura
   */
  private validateAndFormatFacturaData(rawData: any): any {
    console.log('🔍 [PRINT] Validando estructura de datos...');
    
    // Estructura base esperada
    const formattedData = {
      id: rawData.id || 'sin-id',
      tipoComprobante: rawData.tipoComprobante || 'B',
      numeroFactura: rawData.numeroFactura || 1,
      fechaEmision: rawData.fechaEmision || new Date().toISOString(),
      cae: rawData.cae || '',
      vencimientoCae: rawData.vencimientoCae || null,
      estado: rawData.estado || 'completada',
      venta: {
        id: rawData.venta?.id || rawData.ventaId || 'sin-venta-id',
        total: rawData.venta?.total || 0,
        clienteNombre: rawData.venta?.clienteNombre || null,
        clienteCuit: rawData.venta?.clienteCuit || null,
        fecha: rawData.venta?.fecha || new Date().toISOString(),
        items: [],
        sucursal: rawData.venta?.sucursal || rawData.sucursal || { nombre: 'Sucursal' }
      }
    };

    // 🔧 VALIDAR Y FORMATEAR ITEMS
    if (rawData.venta?.items && Array.isArray(rawData.venta.items)) {
      formattedData.venta.items = rawData.venta.items.map((item: any) => ({
        id: item.id || 'sin-id',
        cantidad: item.cantidad || 1,
        precioUnitario: item.precioUnitario || 0,
        descuento: item.descuento || 0,
        producto: {
          id: item.producto?.id || item.productoId || 'sin-producto-id',
          nombre: item.producto?.nombre || item.nombre || 'Producto sin nombre',
          precio: item.producto?.precio || item.precioUnitario || 0,
          descripcion: item.producto?.descripcion || ''
        }
      }));
    } else {
      console.warn('⚠️ [PRINT] No se encontraron items en la venta');
      formattedData.venta.items = [];
    }

    // 🔧 VALIDAR DATOS CRÍTICOS
    if (!formattedData.venta.total || formattedData.venta.total <= 0) {
      console.warn('⚠️ [PRINT] Total de venta es 0 o inválido');
    }

    if (formattedData.venta.items.length === 0) {
      console.warn('⚠️ [PRINT] No hay items para imprimir');
    }

    console.log('✅ [PRINT] Datos validados correctamente:', {
      facturaId: formattedData.id,
      ventaId: formattedData.venta.id,
      total: formattedData.venta.total,
      itemsCount: formattedData.venta.items.length,
      tipoComprobante: formattedData.tipoComprobante
    });

    return formattedData;
  }

  /**
   * TEST DE IMPRESIÓN
   */
  async testPrint(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 [TEST] Ejecutando test de impresión...');

      // Verificar conexión
      if (!this.currentPrinter?.isConnected) {
        const connectResult = await this.fukunService.connectToFukun();
        if (!connectResult.success) {
          return connectResult;
        }
      }

      // Ejecutar test
      const testResult = await this.fukunService.printTest();
      
      if (testResult.success) {
        this.showNotification('✅ Test de impresión exitoso', 'success');
      } else {
        this.showNotification('❌ Error en test de impresión', 'error');
      }

      return testResult;

    } catch (error) {
      console.error('❌ [TEST] Error en test:', error);
      return {
        success: false,
        message: `Error en test: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * CONFIGURAR NUEVA IMPRESORA
   */
  async setupPrinter(): Promise<{ success: boolean; message: string; printersFound?: number }> {
    try {
      console.log('🔧 [SETUP] Configurando impresora...');

      const connectResult = await this.fukunService.connectToFukun();
      
      if (connectResult.success) {
        this.currentPrinter = {
          id: 'fukun-main',
          name: 'Fukun 80 POS',
          type: 'fukun',
          isDefault: true,
          isConnected: true
        };

        this.configuredPrinters = [this.currentPrinter];
        await this.savePrinterConfig();

        return {
          success: true,
          message: 'Impresora Fukun configurada correctamente',
          printersFound: 1
        };
      }

      return connectResult;

    } catch (error) {
      console.error('❌ [SETUP] Error configurando impresora:', error);
      return {
        success: false,
        message: `Error de configuración: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * OBTENER ESTADO DE IMPRESORAS
   */
  getPrinterStatus(): {
    totalPrinters: number;
    connectedPrinters: number;
    defaultPrinter?: string;
    printers: PrinterConfig[];
  } {
    return {
      totalPrinters: this.configuredPrinters.length,
      connectedPrinters: this.configuredPrinters.filter(p => p.isConnected).length,
      defaultPrinter: this.currentPrinter?.name,
      printers: this.configuredPrinters
    };
  }

  /**
   * FUNCIONES AUXILIARES
   */
  private async savePrinterConfig(): Promise<void> {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId || !this.currentPrinter) return;

      const response = await authenticatedFetch('/api/admin/impresoras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: this.currentPrinter.name,
          type: 'thermal',
          sucursalId,
          isDefault: true,
          settings: {
            paperWidth: 80,
            autocut: true,
            encoding: 'utf-8',
            isOnline: true
          }
        })
      });

      if (response.ok) {
        console.log('✅ [CONFIG] Configuración guardada en BD');
      }
    } catch (error) {
      console.warn('⚠️ [CONFIG] No se pudo guardar configuración:', error);
    }
  }

  private async fallbackToPDF(facturaId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📄 [FALLBACK] PDF fallback: ${reason}`);
      
      const pdfUrl = `/api/pdv/facturas/${facturaId}/pdf`;
      window.open(pdfUrl, '_blank');
      
      this.showNotification('📄 PDF abierto para descarga', 'info');
      
      return {
        success: true,
        message: `PDF abierto. Motivo: ${reason}`
      };
    } catch (error) {
      return {
        success: false,
        message: `Error abriendo PDF: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  private showNotification(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };

    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${colors[type]};
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 350px;
      font-size: 14px;
      font-weight: 500;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  /**
   * ABRIR CAJÓN MANUALMENTE
   */
  async openCashDrawer(): Promise<{ success: boolean; message: string }> {
    if (!this.currentPrinter?.isConnected) {
      return {
        success: false,
        message: 'Impresora no conectada'
      };
    }

    return await this.fukunService.openCashDrawer();
  }

  /**
   * VERIFICAR CONEXIÓN
   */
  async checkConnection(): Promise<{ success: boolean; message: string }> {
    const status = this.fukunService.getConnectionStatus();
    
    return {
      success: status.connected,
      message: status.connected 
        ? `Conectado a ${status.deviceName}` 
        : 'No hay impresora conectada'
    };
  }
}

// Exportar instancia singleton
export const printManager = IntegratedPrintManager.getInstance();
