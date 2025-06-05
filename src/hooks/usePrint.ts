// src/hooks/usePrint.ts
import { useState, useEffect, useCallback } from 'react';
import { printService, PrinterConfig } from '@/services/print/printService';

export interface PrintStatus {
  isInitialized: boolean;
  isLoading: boolean;
  availablePrinters: PrinterConfig[];
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

  // Inicializar servicio de impresión
  useEffect(() => {
    let mounted = true;

    const initializePrintService = async () => {
      try {
        await printService.initialize();
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            availablePrinters: printService.getAvailablePrinters()
          }));
        }
      } catch (error) {
        console.error('Error inicializando servicio de impresión:', error);
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isLoading: false,
            lastError: error instanceof Error ? error.message : 'Error desconocido'
          }));
        }
      }
    };

    initializePrintService();

    return () => {
      mounted = false;
    };
  }, []);

  // Actualizar estado de la cola periódicamente
  useEffect(() => {
    const interval = setInterval(() => {
      const queueStatus = printService.getQueueStatus();
      setStatus(prev => ({
        ...prev,
        queueStatus: {
          pending: queueStatus.pending,
          processing: queueStatus.processing
        }
      }));
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  // Imprimir factura
  const printFactura = useCallback(async (
    facturaId: string, 
    options: { auto?: boolean; printerName?: string; copies?: number } = {}
  ) => {
    try {
      setStatus(prev => ({ ...prev, lastError: undefined }));
      
      const result = await printService.printFactura(facturaId, options);
      
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

  // Reimprimir factura desde historial
  const reprintFactura = useCallback(async (facturaId: string, printerName?: string) => {
    return await printFactura(facturaId, { auto: false, printerName });
  }, [printFactura]);

  // Configurar nueva impresora
  const addPrinter = useCallback(async (config: Omit<PrinterConfig, 'id'>) => {
    try {
      const success = await printService.addPrinter(config);
      
      if (success) {
        setStatus(prev => ({
          ...prev,
          availablePrinters: printService.getAvailablePrinters()
        }));
      }
      
      return success;
    } catch (error) {
      console.error('Error agregando impresora:', error);
      return false;
    }
  }, []);

  // Actualizar lista de impresoras
  const refreshPrinters = useCallback(async () => {
    try {
      await printService.initialize();
      setStatus(prev => ({
        ...prev,
        availablePrinters: printService.getAvailablePrinters()
      }));
    } catch (error) {
      console.error('Error actualizando impresoras:', error);
    }
  }, []);

  return {
    ...status,
    printFactura,
    reprintFactura,
    addPrinter,
    refreshPrinters
  };
}