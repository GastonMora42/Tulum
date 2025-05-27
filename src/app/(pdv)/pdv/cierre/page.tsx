// src/app/(pdv)/pdv/cierre/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CierreCaja } from '@/components/pdv/CierreCaja';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Loader2, XCircle, RefreshCw } from 'lucide-react';

export default function CierreCajaPage() {
  const [cierreCajaId, setCierreCajaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  
  const router = useRouter();
  
  // Manejar montaje del componente para evitar hidratación
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // Obtener sucursalId después del montaje
  useEffect(() => {
    if (isMounted) {
      const storedSucursalId = localStorage.getItem('sucursalId');
      console.log("SucursalId recuperado:", storedSucursalId);
      setSucursalId(storedSucursalId);
    }
  }, [isMounted]);
  
  // Verificar la caja cuando tenemos sucursalId
  const checkCajaAbierta = useCallback(async () => {
    if (!sucursalId) return;
    
    try {
      setIsLoading(true);
      setErrorMessage(null);
      
      console.log("Verificando caja para sucursal:", sucursalId);
      
      const response = await authenticatedFetch(
        `/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`
      );
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log("Datos de caja recibidos:", data);
        
        if (data.cierreCaja?.id) {
          setCierreCajaId(data.cierreCaja.id);
          console.log("Caja encontrada con ID:", data.cierreCaja.id);
        } else {
          setErrorMessage('No se encontró información válida de la caja abierta');
        }
      } else if (response.status === 404) {
        setErrorMessage('No hay una caja abierta actualmente. Debes abrir una caja antes de poder cerrarla.');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setErrorMessage(errorData.error || 'Error al verificar el estado de la caja');
      }
    } catch (error) {
      console.error('Error al verificar caja:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Error desconocido al verificar la caja'
      );
    } finally {
      setIsLoading(false);
    }
  }, [sucursalId]);
  
  // Ejecutar verificación cuando tengamos sucursalId
  useEffect(() => {
    if (sucursalId) {
      checkCajaAbierta();
    }
  }, [sucursalId, checkCajaAbierta]);
  
  // Manejar cierre exitoso
  const handleCierreSuccess = () => {
    setTimeout(() => {
      router.push('/pdv');
    }, 2000);
  };
  
  // Intentar de nuevo
  const handleRetry = () => {
    checkCajaAbierta();
  };
  
  // No renderizar nada hasta que el componente esté montado
  if (!isMounted) {
    return null;
  }
  
  // Mostrar loading mientras obtenemos sucursalId
  if (!sucursalId && isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <span className="ml-3 text-lg">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  // Si no hay sucursalId después de cargar
  if (!sucursalId && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Configuración Requerida</h2>
          <p className="text-red-600 mb-6">
            No se ha configurado una sucursal para este punto de venta. 
            Por favor contacta al administrador.
          </p>
          
          <button
            onClick={() => router.push('/pdv')}
            className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Volver al PDV
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Si hay error */}
      {errorMessage && (
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <XCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {errorMessage.includes('No hay una caja abierta') ? 'Caja Cerrada' : 'Error'}
          </h2>
          <p className="text-gray-600 mb-6">{errorMessage}</p>
          
          <div className="flex justify-center gap-4">
            <button
              onClick={() => router.push('/pdv')}
              className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Volver al PDV
            </button>
            
            <button
              onClick={handleRetry}
              className="py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      {/* Si está cargando */}
      {isLoading && !errorMessage && (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
          <span className="ml-3 text-lg">Verificando estado de caja...</span>
        </div>
      )}
      
      {/* Solo mostrar CierreCaja si tenemos un ID válido */}
      {!isLoading && !errorMessage && cierreCajaId && (
        <CierreCaja id={cierreCajaId} onSuccess={handleCierreSuccess} />
      )}
    </div>
  );
}