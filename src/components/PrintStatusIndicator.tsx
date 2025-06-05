
// src/components/pdv/PrintStatusIndicator.tsx
import React from 'react';
import { Printer, AlertTriangle, CheckCircle, Loader } from 'lucide-react';
import { usePrintContext } from '@/components/providers/PrintProvider';

export function PrintStatusIndicator() {
  const { isInitialized, isLoading, error, availablePrinters } = usePrintContext();

  if (isLoading) {
    return (
      <div className="flex items-center space-x-2 text-blue-600 text-sm">
        <Loader className="w-4 h-4 animate-spin" />
        <span>Inicializando impresoras...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center space-x-2 text-red-600 text-sm">
        <AlertTriangle className="w-4 h-4" />
        <span>Error en sistema de impresión</span>
      </div>
    );
  }

  if (!isInitialized) {
    return (
      <div className="flex items-center space-x-2 text-gray-600 text-sm">
        <Printer className="w-4 h-4" />
        <span>Sistema de impresión no disponible</span>
      </div>
    );
  }

  const printerCount = availablePrinters.length;
  const defaultPrinter = availablePrinters.find(p => p.isDefault);

  return (
    <div className="flex items-center space-x-2 text-green-600 text-sm">
      <CheckCircle className="w-4 h-4" />
      <span>
        {printerCount === 0 
          ? 'Sin impresoras configuradas'
          : `${printerCount} impresora${printerCount > 1 ? 's' : ''} disponible${printerCount > 1 ? 's' : ''}`
        }
        {defaultPrinter && ` (${defaultPrinter.name})`}
      </span>
    </div>
  );
}
