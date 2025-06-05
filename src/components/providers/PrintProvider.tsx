// src/components/providers/PrintProvider.tsx
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
      
      console.log('🖨️ Inicializando sistema de impresión...');
      
      // Inicializar el servicio
      await printService.initialize();
      
      // Obtener impresoras disponibles
      const printers = printService.getAvailablePrinters();
      setAvailablePrinters(printers);
      
      setIsInitialized(true);
      console.log('✅ Sistema de impresión inicializado correctamente');
      
    } catch (err) {
      console.error('❌ Error inicializando sistema de impresión:', err);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
    }
  };

  const printFactura = async (facturaId: string, options: any = {}) => {
    return await printService.printFactura(facturaId, options);
  };

  const reprintFactura = async (facturaId: string, printerName?: string) => {
    return await printService.printFactura(facturaId, { auto: false, printerName });
  };

  const value: PrintContextType = {
    isInitialized,
    isLoading,
    error,
    availablePrinters,
    printFactura,
    reprintFactura
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


// Agregar al schema.prisma:
/*
model ConfiguracionImpresora {
  id            String   @id @default(uuid())
  nombre        String
  tipo          String   // thermal, laser, inkjet
  sucursalId    String
  sucursal      Ubicacion @relation(fields: [sucursalId], references: [id])
  esPorDefecto  Boolean  @default(false)
  configuracion Json     // { paperWidth, autocut, encoding, etc. }
  activa        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  @@unique([sucursalId, nombre])
  @@map("configuracion_impresora")
}
*/

// Modificación en layout principal para incluir PrintProvider:
// src/app/(pdv)/layout.tsx
/*
import { PrintProvider } from '@/components/providers/PrintProvider';
import { PrintInitializer } from '@/components/pdv/PrintInitializer';

export default function PDVLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrintProvider>
      <div className="min-h-screen bg-gray-50">
        {children}
        <PrintInitializer />
      </div>
    </PrintProvider>
  );
}
*/