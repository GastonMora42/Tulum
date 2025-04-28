// src/components/ui/OfflineStatus.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Save, Wifi, WifiOff, X, ArrowUpRight, MinusSquare, PanelLeftClose } from 'lucide-react';

export function OfflineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [showDetails, setShowDetails] = useState(false);
  const [pendingOperations, setPendingOperations] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [position, setPosition] = useState({ right: '1rem', bottom: '1rem' });
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isPortalReady, setIsPortalReady] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);

  
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
    
    // Preparar para portal
    setIsPortalReady(true);
    
    // Recuperar posición guardada
    const savedPosition = localStorage.getItem('offlineStatusPosition');
    if (savedPosition) {
      try {
        setPosition(JSON.parse(savedPosition));
      } catch (e) {
        console.error('Error parsing saved position', e);
      }
    }
    
    const savedMinimized = localStorage.getItem('offlineStatusMinimized');
    if (savedMinimized === 'true') {
      setIsMinimized(true);
    }
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleSync = () => {
    setIsSyncing(true);
    
    // Simular sincronización
    setTimeout(() => {
      setPendingOperations(0);
      setIsSyncing(false);
    }, 2000);
  };
  
  // Drag functionality
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setIsDragging(true);
  };
  
  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging) return;
    
    const newPosition = {
      left: `${e.clientX - dragOffset.x}px`,
      top: `${e.clientY - dragOffset.y}px`,
      right: 'auto',
      bottom: 'auto'
    };
    
    setPosition(newPosition);
  };
  
  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      // Save position to localStorage
      localStorage.setItem('offlineStatusPosition', JSON.stringify(position));
    }
  };
  
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);
  
  const toggleMinimize = () => {
    const newState = !isMinimized;
    setIsMinimized(newState);
    localStorage.setItem('offlineStatusMinimized', String(newState));
  };
  
  // No renderizar en el servidor
  if (typeof window === 'undefined' || !isPortalReady) {
    return null;
  }

  const component = (
    <div 
      ref={containerRef}
      className={`fixed z-50 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
      style={position}
    >
      <div 
        className={`bg-white shadow-md rounded-lg overflow-hidden border border-gray-200 transition-all ${
          isMinimized ? 'w-10 h-10' : 'w-auto max-w-[250px]'
        }`}
      >
        {isMinimized ? (
          // Versión minimizada
          <button 
            onClick={toggleMinimize}
            className={`w-full h-full flex items-center justify-center ${
              isOnline 
                ? isSyncing ? 'bg-amber-50' : 'bg-green-50' 
                : 'bg-red-50'
            }`}
          >
            {isOnline ? (
              isSyncing ? (
                <Save size={16} className="text-amber-600 animate-pulse" />
              ) : (
                <Wifi size={16} className="text-green-600" />
              )
            ) : (
              <WifiOff size={16} className="text-red-600" />
            )}
          </button>
        ) : (
          // Versión normal
          <>
            <div 
              onMouseDown={handleMouseDown}
              className="px-3 py-2 cursor-move flex items-center justify-between bg-gray-50 border-b border-gray-200"
            >
              <div className="flex items-center">
                {isOnline ? (
                  isSyncing ? (
                    <div className="h-2 w-2 bg-amber-400 rounded-full mr-2 animate-pulse"></div>
                  ) : (
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  )
                ) : (
                  <div className="h-2 w-2 bg-red-500 rounded-full mr-2"></div>
                )}
                <span className="text-xs font-medium text-gray-700 truncate">
                  {isOnline 
                    ? isSyncing 
                      ? "Sincronizando..." 
                      : pendingOperations > 0 
                        ? `${pendingOperations} pendientes` 
                        : "Conectado"
                    : "Sin conexión"}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <button 
                  onClick={() => setShowDetails(!showDetails)} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowUpRight size={14} />
                </button>
                <button 
                  onClick={toggleMinimize} 
                  className="text-gray-400 hover:text-gray-600"
                >
                  <MinusSquare size={14} />
                </button>
              </div>
            </div>
            
            {showDetails && (
              <div className="px-3 py-2 text-xs">
                {!isOnline && (
                  <p className="text-gray-600 mb-2">
                    Modo sin conexión. Los cambios se sincronizarán automáticamente.
                  </p>
                )}
                
                {isOnline && pendingOperations > 0 && (
                  <>
                    <p className="text-gray-600 mb-2">
                      {pendingOperations} operación(es) pendiente(s).
                    </p>
                    <button
                      onClick={handleSync}
                      disabled={isSyncing}
                      className="w-full mt-1 bg-indigo-600 hover:bg-indigo-700 text-white py-1 px-2 rounded text-xs"
                    >
                      {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  // Usar portal para renderizar en el nivel superior del DOM
  return createPortal(component, document.body);
}