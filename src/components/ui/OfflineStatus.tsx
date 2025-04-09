// src/components/ui/OfflineStatus.tsx
'use client';

import { useState, useEffect } from 'react';

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  // Monitorear estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    // Establecer estado inicial
    setIsOnline(navigator.onLine);
    
    // Añadir event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Simular algunas operaciones pendientes para testing
    setPendingOperations(2);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Siempre mostramos el componente para testing
  // En producción podríamos usar: if (isOnline && pendingOperations === 0) return null;

  const handleSync = () => {
    setIsSyncing(true);
    
    // Simular sincronización
    setTimeout(() => {
      setPendingOperations(0);
      setIsSyncing(false);
    }, 2000);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-lg rounded-lg overflow-hidden w-64 border border-gray-200">
        <div 
          className="px-4 py-3 cursor-pointer flex items-center justify-between"
          onClick={() => setShowDetails(!showDetails)}
        >
          <div className="flex items-center">
            {isOnline ? (
              isSyncing ? (
                <div className="h-3 w-3 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
              ) : (
                <div className="h-3 w-3 bg-green-500 rounded-full mr-2"></div>
              )
            ) : (
              <div className="h-3 w-3 bg-red-500 rounded-full mr-2"></div>
            )}
            <span className="font-medium text-gray-700">
              {isOnline 
                ? isSyncing 
                  ? "Sincronizando..." 
                  : pendingOperations > 0 
                    ? `${pendingOperations} operaciones pendientes` 
                    : "Conectado"
                : "Modo sin conexión"}
            </span>
          </div>
          <svg 
            className={`h-5 w-5 transform transition-transform ${showDetails ? 'rotate-180' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        
        {showDetails && (
          <div className="px-4 py-3 border-t border-gray-200">
            {!isOnline && (
              <p className="text-sm text-gray-600 mb-2">
                Estás trabajando sin conexión. Los cambios se sincronizarán cuando vuelvas a estar conectado.
              </p>
            )}
            
            {isOnline && pendingOperations > 0 && (
              <>
                <p className="text-sm text-gray-600 mb-2">
                  Hay {pendingOperations} operaciones pendientes de sincronizar.
                </p>
                <button
                  onClick={handleSync}
                  disabled={isSyncing}
                  className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-3 rounded text-sm"
                >
                  {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}