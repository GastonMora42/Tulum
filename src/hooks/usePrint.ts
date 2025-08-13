// src/hooks/usePrint.ts - VERSIÓN CORREGIDA Y MEJORADA
import { useState, useEffect, useCallback } from 'react';

interface PrintStatus {
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
    isLoading: false,
    availablePrinters: [],
    queueStatus: { pending: 0, processing: false }
  });
  
  const [currentPrinter, setCurrentPrinter] = useState<string | null>(null);

  // Inicializar sistema de impresión al montar
  useEffect(() => {
    initializePrintSystem();
  }, []);

  const initializePrintSystem = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true }));
      
      console.log('🖨️ [usePrint] Inicializando sistema de impresión...');
      
      // Importar dinámicamente el servicio de impresión
      const { printManager } = await import('@/services/print/integratedPrintManager');
      
      const result = await printManager.initialize();
      
      if (result.success) {
        const printerStatus = printManager.getPrinterStatus();
        
        setStatus({
          isInitialized: true,
          isLoading: false,
          availablePrinters: printerStatus.printers.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            isDefault: p.isDefault,
            isConnected: p.isConnected
          })),
          queueStatus: { pending: 0, processing: false }
        });
        
        // Establecer impresora actual
        const defaultPrinter = printerStatus.printers.find(p => p.isDefault);
        if (defaultPrinter) {
          setCurrentPrinter(defaultPrinter.name);
        }
        
        console.log('✅ [usePrint] Sistema inicializado correctamente');
      } else {
        setStatus(prev => ({
          ...prev,
          isInitialized: false,
          isLoading: false,
          lastError: result.message
        }));
        
        console.warn('⚠️ [usePrint] Inicialización parcial:', result.message);
      }
      
    } catch (error) {
      console.error('❌ [usePrint] Error inicializando:', error);
      setStatus(prev => ({
        ...prev,
        isInitialized: false,
        isLoading: false,
        lastError: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, []);

  const printFactura = useCallback(async (
    facturaId: string, 
    options: { 
      auto?: boolean; 
      printerName?: string; 
      copies?: number 
    } = {}
  ) => {
    try {
      console.log(`🖨️ [usePrint] Imprimiendo factura ${facturaId}...`);
      
      setStatus(prev => ({ ...prev, lastError: undefined }));
      
      // Importar dinámicamente el servicio
      const { printManager } = await import('@/services/print/integratedPrintManager');
      
      const result = await printManager.printFactura(facturaId, {
        auto: options.auto || false,
        copies: options.copies || 1
      });
      
      if (!result.success && result.message) {
        setStatus(prev => ({ ...prev, lastError: result.message }));
      }
      
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setStatus(prev => ({ ...prev, lastError: errorMessage }));
      
      console.error('❌ [usePrint] Error:', error);
      
      return {
        success: false,
        message: errorMessage
      };
    }
  }, []);

  const testPrint = useCallback(async () => {
    try {
      console.log('🧪 [usePrint] Ejecutando test...');
      
      const { printManager } = await import('@/services/print/integratedPrintManager');
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

  const setupPrinter = useCallback(async () => {
    try {
      console.log('🔧 [usePrint] Configurando impresora...');
      
      const { printManager } = await import('@/services/print/integratedPrintManager');
      const result = await printManager.setupPrinter();
      
      if (result.success) {
        // Actualizar estado
        const printerStatus = printManager.getPrinterStatus();
        setStatus(prev => ({
          ...prev,
          availablePrinters: printerStatus.printers.map(p => ({
            id: p.id,
            name: p.name,
            type: p.type,
            isDefault: p.isDefault,
            isConnected: p.isConnected
          })),
          lastError: undefined
        }));
        
        // Actualizar impresora actual
        const defaultPrinter = printerStatus.printers.find(p => p.isDefault);
        if (defaultPrinter) {
          setCurrentPrinter(defaultPrinter.name);
        }
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

  const checkConnection = useCallback(async () => {
    try {
      const { printManager } = await import('@/services/print/integratedPrintManager');
      const result = await printManager.checkConnection();
      
      // Actualizar estado de conexión
      const printerStatus = printManager.getPrinterStatus();
      setStatus(prev => ({
        ...prev,
        availablePrinters: printerStatus.printers.map(p => ({
          id: p.id,
          name: p.name,
          type: p.type,
          isDefault: p.isDefault,
          isConnected: p.isConnected
        }))
      }));
      
      return result;
      
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Error verificando conexión'
      };
    }
  }, []);

  const openCashDrawer = useCallback(async () => {
    try {
      console.log('💰 [usePrint] Abriendo cajón...');
      
      const { printManager } = await import('@/services/print/integratedPrintManager');
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

  // Funciones de compatibilidad
  const reprintFactura = useCallback(async (facturaId: string, printerName?: string) => {
    console.log(`🔄 [usePrint] Reimprimiendo factura ${facturaId}...`);
    return await printFactura(facturaId, { auto: false, printerName });
  }, [printFactura]);

  const refreshPrinters = useCallback(async () => {
    try {
      await checkConnection();
      console.log('🔄 [usePrint] Lista de impresoras actualizada');
    } catch (error) {
      console.error('❌ [usePrint] Error actualizando impresoras:', error);
    }
  }, [checkConnection]);

  const detectPrinters = useCallback(async () => {
    try {
      console.log('🔍 [usePrint] Detectando impresoras...');
      
      const result = await setupPrinter();
      
      return result.success ? [
        {
          id: 'detected-printer',
          name: 'Impresora Detectada',
          type: 'thermal',
          detected: true
        }
      ] : [];
    } catch (error) {
      console.error('❌ [usePrint] Error detectando impresoras:', error);
      return [];
    }
  }, [setupPrinter]);

  const addPrinter = useCallback(async (config: any) => {
    try {
      console.log('➕ [usePrint] Agregando impresora:', config.name);
      
      const result = await setupPrinter();
      
      if (result.success) {
        await refreshPrinters();
      }
      
      return result.success;
    } catch (error) {
      console.error('❌ [usePrint] Error agregando impresora:', error);
      return false;
    }
  }, [setupPrinter, refreshPrinters]);

  const getStatus = useCallback(() => {
    return {
      ...status,
      currentPrinter
    };
  }, [status, currentPrinter]);

  return {
    // Estados principales
    ...status,
    currentPrinter,
    
    // Funciones principales
    printFactura,
    reprintFactura,
    testPrint,
    setupPrinter,
    openCashDrawer,
    checkConnection,
    
    // Funciones de gestión
    addPrinter,
    refreshPrinters,
    detectPrinters,
    
    // Funciones auxiliares
    initializePrintSystem,
    getStatus
  };
}