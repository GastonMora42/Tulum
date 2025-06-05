// src/hooks/usePrint.ts - VERSIÓN CORREGIDA
import { useState, useEffect, useCallback } from 'react';
import { printService, PrinterConfig } from '@/services/print/printService';
import { authenticatedFetch } from '@/hooks/useAuth';

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
        console.log('🖨️ Inicializando servicio de impresión...');
        
        await printService.initialize();
        
        if (mounted) {
          setStatus(prev => ({
            ...prev,
            isInitialized: true,
            isLoading: false,
            availablePrinters: printService.getAvailablePrinters()
          }));
          
          console.log('✅ Servicio de impresión inicializado');
        }
      } catch (error) {
        console.error('❌ Error inicializando servicio de impresión:', error);
        
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
      console.log(`🖨️ Imprimiendo factura ${facturaId}...`);
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
    console.log(`🔄 Reimprimiendo factura ${facturaId}...`);
    return await printFactura(facturaId, { auto: false, printerName });
  }, [printFactura]);

  // Configurar nueva impresora
  const addPrinter = useCallback(async (config: Omit<PrinterConfig, 'id'>) => {
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
        await refreshPrinters();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error agregando impresora:', error);
      return false;
    }
  }, []);

  // Actualizar lista de impresoras
  const refreshPrinters = useCallback(async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      const response = await authenticatedFetch(`/api/admin/sucursales/${sucursalId}/impresoras`);
      
      if (response.ok) {
        const printers = await response.json();
        setStatus(prev => ({
          ...prev,
          availablePrinters: printers
        }));
        
        // Actualizar también el servicio
        await printService.loadPrinterConfigs();
      }
    } catch (error) {
      console.error('Error actualizando impresoras:', error);
    }
  }, []);

  // Detectar impresoras automáticamente
  const detectPrinters = useCallback(async () => {
    try {
      console.log('🔍 Detectando impresoras...');
      
      const response = await authenticatedFetch('/api/system/printers');
      if (response.ok) {
        const detectedPrinters = await response.json();
        console.log(`🔍 Detectadas ${detectedPrinters.length} impresoras`);
        return detectedPrinters;
      }
      
      return [];
    } catch (error) {
      console.error('Error detectando impresoras:', error);
      return [];
    }
  }, []);

  return {
    // Estados
    ...status,
    
    // Funciones
    printFactura,
    reprintFactura,
    addPrinter,
    refreshPrinters,
    detectPrinters
  };
}