// src/hooks/usePrint.ts - VERSIÓN ACTUALIZADA PARA FUKUN
import { useState, useEffect, useCallback } from 'react';
import { printManager } from '@/services/print/integratedPrintManager';

export interface PrintStatus {
  isInitialized: boolean;
  isLoading: boolean;
  availablePrinters: Array<{
    id: string;
    name: string;
    type: string;
    isDefault: boolean;
    isConnected: boolean;
  }>;
  queueStatus: {
    pending: number;
    processing: boolean;
  };
  lastError?: string;
}

export function usePrint() {
  const [status, setStatus] = useState<PrintStatus>({
    isInitialized: false,
    isLoading: true,
    availablePrinters: [],
    queueStatus: { pending: 0, processing: false }
  });

  // Inicializar automáticamente al montar el componente
  useEffect(() => {
    let mounted = true;

    const initializePrintSystem = async () => {
      try {
        console.log('🖨️ Inicializando sistema de impresión Fukun...');
        
        const result = await printManager.initialize();
        
        if (mounted) {
          const printerStatus = printManager.getPrinterStatus();
          
          setStatus({
            isInitialized: result.success,
            isLoading: false,
            availablePrinters: printerStatus.printers,
            queueStatus: { pending: 0, processing: false },
            lastError: result.success ? undefined : result.message
          });
          
          console.log(result.success ? '✅ Sistema inicializado' : '⚠️ Inicialización parcial');
        }
      } catch (error) {
        console.error('❌ Error inicializando sistema:', error);
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            lastError: error instanceof Error ? error.message : 'Error desconocido'
          }));
        }
      }
    };

    initializePrintSystem();

    return () => {
      mounted = false;
    };
  }, []);

  // Imprimir factura - FUNCIÓN PRINCIPAL
  const printFactura = useCallback(async (
    facturaId: string, 
    options: { auto?: boolean; printerName?: string; copies?: number } = {}
  ) => {
    try {
      console.log(`🖨️ Imprimiendo factura ${facturaId}...`);
      setStatus(prev => ({ ...prev, lastError: undefined }));
      
      const result = await printManager.printFactura(facturaId, {
        auto: options.auto,
        copies: options.copies
      });
      
      if (!result.success) {
        setStatus(prev => ({ ...prev, lastError: result.message }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setStatus(prev => ({ ...prev, lastError: errorMessage }));
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  // Test de impresión
  const testPrint = useCallback(async () => {
    console.log('🧪 Ejecutando test de impresión...');
    
    try {
      const result = await printManager.testPrint();
      
      if (!result.success) {
        setStatus(prev => ({ ...prev, lastError: result.message }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error en test';
      setStatus(prev => ({ ...prev, lastError: errorMessage }));
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  // Configurar impresora - REEMPLAZA autodetección
  const setupPrinter = useCallback(async () => {
    try {
      console.log('🔧 Configurando impresora Fukun...');
      
      const result = await printManager.setupPrinter();
      
      if (result.success) {
        // Actualizar estado con nueva configuración
        const printerStatus = printManager.getPrinterStatus();
        setStatus(prev => ({
          ...prev,
          availablePrinters: printerStatus.printers,
          lastError: undefined
        }));
      } else {
        setStatus(prev => ({ ...prev, lastError: result.message }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error configurando';
      setStatus(prev => ({ ...prev, lastError: errorMessage }));
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  // Verificar conexión
  const checkConnection = useCallback(async () => {
    try {
      const result = await printManager.checkConnection();
      
      // Actualizar estado de conexión
      const printerStatus = printManager.getPrinterStatus();
      setStatus(prev => ({
        ...prev,
        availablePrinters: printerStatus.printers
      }));
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error verificando conexión'
      };
    }
  }, []);

  // Abrir cajón de dinero
  const openCashDrawer = useCallback(async () => {
    try {
      console.log('💰 Abriendo cajón de dinero...');
      
      const result = await printManager.openCashDrawer();
      
      if (!result.success) {
        setStatus(prev => ({ ...prev, lastError: result.message }));
      }
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error abriendo cajón';
      setStatus(prev => ({ ...prev, lastError: errorMessage }));
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  // Reimprimir factura (alias de printFactura)
  const reprintFactura = useCallback(async (facturaId: string, printerName?: string) => {
    console.log(`🔄 Reimprimiendo factura ${facturaId}...`);
    return await printFactura(facturaId, { auto: false, printerName });
  }, [printFactura]);

  // Actualizar lista de impresoras
  const refreshPrinters = useCallback(async () => {
    try {
      // Verificar estado actual
      await checkConnection();
      
      console.log('🔄 Lista de impresoras actualizada');
    } catch (error) {
      console.error('Error actualizando impresoras:', error);
    }
  }, [checkConnection]);

  // Función de compatibilidad - detectar impresoras (ahora simplificada)
  const detectPrinters = useCallback(async () => {
    try {
      console.log('🔍 Detectando impresoras...');
      
      const result = await printManager.setupPrinter();
      
      return result.success ? [
        {
          id: 'fukun-main',
          name: 'Fukun 80 POS',
          type: 'thermal',
          detected: true
        }
      ] : [];
    } catch (error) {
      console.error('Error detectando impresoras:', error);
      return [];
    }
  }, []);

  // Función de compatibilidad - agregar impresora (simplificada)
  const addPrinter = useCallback(async (config: any) => {
    try {
      console.log('➕ Agregando impresora:', config.name);
      
      // Para Fukun, solo necesitamos configurar la conexión
      const result = await printManager.setupPrinter();
      
      if (result.success) {
        await refreshPrinters();
      }
      
      return result.success;
    } catch (error) {
      console.error('Error agregando impresora:', error);
      return false;
    }
  }, [refreshPrinters]);

  return {
    // Estados
    ...status,
    
    // Funciones principales
    printFactura,
    reprintFactura,
    testPrint,
    setupPrinter,
    openCashDrawer,
    checkConnection,
    
    // Funciones de compatibilidad (mantienen la API existente)
    addPrinter,
    refreshPrinters,
    detectPrinters,
    
    // Información adicional
    getStatus: () => printManager.getPrinterStatus()
  };
}