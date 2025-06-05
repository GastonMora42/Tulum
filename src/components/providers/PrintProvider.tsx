// src/components/providers/PrintProvider.tsx - VERSIÓN CORREGIDA
'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { printService, PrinterConfig } from '@/services/print/printService';

interface PrintContextType {
  isInitialized: boolean;
  isLoading: boolean;
  error?: string;
  availablePrinters: PrinterConfig[];
  printFactura: (facturaId: string, options?: any) => Promise<any>;
  reprintFactura: (facturaId: string, printerName?: string) => Promise<any>;
  refreshPrinters: () => Promise<void>;
}

const PrintContext = createContext<PrintContextType | null>(null);

export function PrintProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | undefined>();
  const [availablePrinters, setAvailablePrinters] = useState<PrinterConfig[]>([]);

  useEffect(() => {
    initializePrintService();
  }, []);

  const initializePrintService = async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      
      console.log('🖨️ Inicializando sistema de impresión desde Provider...');
      
      // Inicializar el servicio
      await printService.initialize();
      
      // Obtener impresoras disponibles
      const printers = printService.getAvailablePrinters();
      setAvailablePrinters(printers);
      
      setIsInitialized(true);
      console.log('✅ Sistema de impresión inicializado correctamente desde Provider');
      
    } catch (err) {
      console.error('❌ Error inicializando sistema de impresión desde Provider:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const printFactura = async (facturaId: string, options: any = {}) => {
    try {
      console.log(`🖨️ PrintProvider: Imprimiendo factura ${facturaId}...`);
      const result = await printService.printFactura(facturaId, options);
      console.log(`📄 PrintProvider: Resultado impresión:`, result);
      return result;
    } catch (error) {
      console.error('❌ PrintProvider: Error en impresión:', error);
      throw error;
    }
  };

  const reprintFactura = async (facturaId: string, printerName?: string) => {
    console.log(`🔄 PrintProvider: Reimprimiendo factura ${facturaId}...`);
    return await printFactura(facturaId, { auto: false, printerName });
  };

  const refreshPrinters = async () => {
    try {
      console.log('🔄 PrintProvider: Actualizando lista de impresoras...');
      await printService.initialize();
      const printers = printService.getAvailablePrinters();
      setAvailablePrinters(printers);
      console.log(`✅ PrintProvider: ${printers.length} impresoras disponibles`);
    } catch (error) {
      console.error('❌ PrintProvider: Error actualizando impresoras:', error);
    }
  };

  const value: PrintContextType = {
    isInitialized,
    isLoading,
    error,
    availablePrinters,
    printFactura,
    reprintFactura,
    refreshPrinters
  };

  return (
    <PrintContext.Provider value={value}>
      {children}
    </PrintContext.Provider>
  );
}

export function usePrintContext() {
  const context = useContext(PrintContext);
  if (!context) {
    throw new Error('usePrintContext debe usarse dentro de PrintProvider');
  }
  return context;
}