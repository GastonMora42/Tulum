// src/components/pdv/PrintInitializer.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, Printer, Settings, X } from 'lucide-react';

export function PrintInitializer() {
  const [showSetup, setShowSetup] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Verificar si ya se mostró la configuración inicial
    const hasSeenSetup = localStorage.getItem('printSetupShown');
    const sucursalId = localStorage.getItem('sucursalId');
    
    if (!hasSeenSetup && sucursalId) {
      setTimeout(() => {
        setShowSetup(true);
      }, 2000); // Mostrar después de 2 segundos
    }
  }, []);

  const handleDismiss = () => {
    setDismissed(true);
    setShowSetup(false);
    localStorage.setItem('printSetupShown', 'true');
  };

  const handleSetupPrinters = () => {
    // Lanzar configuración de impresoras
    window.dispatchEvent(new CustomEvent('openPrinterConfig'));
    handleDismiss();
  };

  if (!showSetup || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 max-w-sm bg-white border border-gray-200 rounded-xl shadow-lg p-4 z-50">
      <div className="flex items-start space-x-3">
        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
          <Printer className="w-4 h-4 text-blue-600" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900 mb-1">
            Configurar Impresoras
          </h4>
          <p className="text-sm text-gray-600 mb-3">
            ¿Quieres configurar impresoras para facturación automática?
          </p>
          
          <div className="flex space-x-2">
            <button
              onClick={handleSetupPrinters}
              className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Settings className="w-3 h-3" />
              <span>Configurar</span>
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Más tarde
            </button>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}