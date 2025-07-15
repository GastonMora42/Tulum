// src/services/print/integratedPrintManager.ts
// REEMPLAZO COMPLETO DEL SISTEMA DE IMPRESIÓN ACTUAL

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
        // Registrar impresora Fukun como configurada
        this.currentPrinter = {
          id: 'fukun-main',
          name: 'Fukun 80 POS',
          type: 'fukun',
          isDefault: true,
          isConnected: true
        };

        this.configuredPrinters = [this.currentPrinter];

        // Guardar en base de datos si no existe
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
   * FUNCIÓN PRINCIPAL - IMPRIMIR FACTURA
   * Esta reemplaza la función en tu printService actual
   */
  async printFactura(facturaId: string, options: {
    auto?: boolean;
    copies?: number;
  } = {}): Promise<{ success: boolean; message: string; jobId?: string }> {
    
    try {
      console.log(`🖨️ Imprimiendo factura ${facturaId}...`);

      // Verificar que hay impresora conectada
      if (!this.currentPrinter?.isConnected) {
        // Intentar reconectar automáticamente
        const reconnectResult = await this.fukunService.connectToFukun();
        if (!reconnectResult.success) {
          return {
            success: false,
            message: 'No hay impresora conectada. Use el botón "Configurar Impresora" primero.'
          };
        }
      }

      // Obtener datos de la factura
      console.log('📊 Obteniendo datos de factura...');
      const facturaData = await this.getFacturaData(facturaId);
      
      if (!facturaData) {
        throw new Error('No se pudieron obtener los datos de la factura');
      }

      // Imprimir usando Fukun
      const printResult = await this.fukunService.printFactura(facturaData);

      if (printResult.success) {
        // Mostrar notificación de éxito
        this.showNotification('✅ Factura impresa correctamente', 'success');
        
        // Abrir cajón si la impresión fue exitosa
        setTimeout(() => {
          this.fukunService.openCashDrawer();
        }, 1000);
      }

      return printResult;

    } catch (error) {
      console.error('❌ Error imprimiendo factura:', error);
      
      // Fallback: abrir PDF
      return await this.fallbackToPDF(facturaId, error instanceof Error ? error.message : 'Error desconocido');
    }
  }

  /**
   * TEST DE IMPRESIÓN
   * Esta función reemplaza la funcionalidad de test en tu código actual
   */
  async testPrint(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('🧪 Ejecutando test de impresión...');

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
      console.error('❌ Error en test:', error);
      return {
        success: false,
        message: `Error en test: ${error instanceof Error ? error.message : 'Error desconocido'}`
      };
    }
  }

  /**
   * CONFIGURAR NUEVA IMPRESORA
   * Esta función reemplaza la autodetección compleja
   */
  async setupPrinter(): Promise<{ success: boolean; message: string; printersFound?: number }> {
    try {
      console.log('🔧 Configurando impresora...');

      const connectResult = await this.fukunService.connectToFukun();
      
      if (connectResult.success) {
        // Actualizar configuración
        this.currentPrinter = {
          id: 'fukun-main',
          name: 'Fukun 80 POS',
          type: 'fukun',
          isDefault: true,
          isConnected: true
        };

        this.configuredPrinters = [this.currentPrinter];
        
        // Guardar configuración
        await this.savePrinterConfig();

        return {
          success: true,
          message: 'Impresora Fukun configurada correctamente',
          printersFound: 1
        };
      }

      return connectResult;

    } catch (error) {
      console.error('❌ Error configurando impresora:', error);
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
  private async getFacturaData(facturaId: string): Promise<any> {
    try {
      console.log(`📊 Obteniendo datos de factura ${facturaId}...`);
      
      const response = await authenticatedFetch(`/api/pdv/facturas/${facturaId}`);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('✅ Datos de factura obtenidos');
      return data;

    } catch (error) {
      console.error('❌ Error obteniendo factura:', error);
      throw error;
    }
  }

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
        console.log('✅ Configuración guardada en BD');
      }
    } catch (error) {
      console.warn('⚠️ No se pudo guardar configuración:', error);
    }
  }

  private async fallbackToPDF(facturaId: string, reason: string): Promise<{ success: boolean; message: string }> {
    try {
      console.log(`📄 Fallback a PDF: ${reason}`);
      
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

// Exportar instancia singleton para reemplazar printService
export const printManager = IntegratedPrintManager.getInstance();