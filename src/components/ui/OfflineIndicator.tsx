// src/components/ui/OfflineIndicator.tsx
'use client';

import { useState, useEffect } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Wifi, WifiOff, Save, AlertTriangle } from 'lucide-react';

export function OfflineIndicator() {
  const { isOnline, pendingOperations, syncNow, isSyncing } = useOffline();
  const [showDetail, setShowDetail] = useState(false);
  
  // Auto-hide details after showing
  useEffect(() => {
    if (showDetail) {
      const timer = setTimeout(() => {
        setShowDetail(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [showDetail]);
  
  // Don't show anything if online with no pending operations
  if (isOnline && pendingOperations === 0) {
    return null;
  }
  
  return (
    <div
      className="fixed bottom-4 right-4 z-50"
      onClick={() => setShowDetail(!showDetail)}
    >
      <div className={`flex items-center rounded-full shadow-lg transition-all duration-300 ${
        isOnline ? 'bg-amber-100' : 'bg-red-100'
      } ${showDetail ? 'px-4' : 'px-3'} py-2`}>
        {!isOnline && (
          <WifiOff className="h-5 w-5 text-red-600 mr-2" />
        )}
        
        {isOnline && isSyncing && (
          <Save className="h-5 w-5 text-amber-600 animate-pulse mr-2" />
        )}
        
        {isOnline && !isSyncing && pendingOperations > 0 && (
          <AlertTriangle className="h-5 w-5 text-amber-600 mr-2" />
        )}
        
        {showDetail && (
          <div className="text-sm font-medium">
            {!isOnline ? (
              'Modo sin conexión'
            ) : isSyncing ? (
              'Sincronizando...'
            ) : (
              <>
                {pendingOperations} operaciones pendientes
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    syncNow();
                  }}
                  className="ml-2 bg-amber-200 px-2 py-1 rounded text-xs font-bold hover:bg-amber-300"
                >
                  Sincronizar
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Add this component to src/app/(pdv)/layout.tsx