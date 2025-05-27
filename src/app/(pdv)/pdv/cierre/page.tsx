// src/app/(pdv)/pdv/cierre/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CierreCaja } from '@/components/pdv/CierreCaja';
import { authenticatedFetch } from '@/hooks/useAuth';

export default function CierreCajaPage() {
  const [cierreCajaId, setCierreCajaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sucursalId, setSucursalId] = useState<string | null>(null);
  
  const router = useRouter();
  
  // Obtener sucursalId del localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedSucursalId = localStorage.getItem('sucursalId');
      console.log("SucursalId desde localStorage:", storedSucursalId);
      setSucursalId(storedSucursalId);
    }
  }, []);
  
  // Verificar la caja cuando tenemos sucursalId
  useEffect(() => {
    if (!sucursalId) {
      console.log("Esperando sucursalId...");
      return;
    }
    
    const checkCajaAbierta = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        
        console.log("Verificando caja para sucursal:", sucursalId);
        
        // CORREGIDO: Usar GET en lugar de POST para verificar estado
        const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`);
        console.log('Response status:', response.status);
        
        // CORREGIDO: Manejar respuestas de error de manera segura
        if (response.ok) {
          // Solo intentar parsear JSON si la respuesta es exitosa
          try {
            const data = await response.json();
            console.log("Datos recibidos:", data);
            
            if (data.cierreCaja && data.cierreCaja.id) {
              setCierreCajaId(data.cierreCaja.id);
              console.log("Caja encontrada con ID:", data.cierreCaja.id);
            } else {
              setErrorMessage('No se encontró información válida de la caja abierta');
            }
          } catch (jsonError) {
            console.error('Error al parsear JSON de respuesta exitosa:', jsonError);
            setErrorMessage('Error al procesar la respuesta del servidor');
          }
        } else if (response.status === 404) {
          setErrorMessage('No hay una caja abierta actualmente. Debes abrir una caja antes de poder cerrarla.');
        } else {
          // CORREGIDO: Manejar errores sin asumir que hay JSON válido
          let errorMessage = 'Error al verificar el estado de la caja';
          
          try {
            // Verificar si la respuesta contiene JSON
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } else {
              // Si no es JSON, intentar obtener texto
              const errorText = await response.text();
              if (errorText) {
                errorMessage = `Error del servidor: ${response.status}`;
              }
            }
          } catch (parseError) {
            console.error('Error al parsear respuesta de error:', parseError);
            errorMessage = `Error del servidor (${response.status}): No se pudo obtener detalles del error`;
          }
          
          setErrorMessage(errorMessage);
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        if (error instanceof TypeError && error.message.includes('fetch')) {
          setErrorMessage('Error de conexión. Verifique su conexión a internet.');
        } else {
          setErrorMessage(error instanceof Error ? error.message : 'Error desconocido al verificar la caja');
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCajaAbierta();
  }, [sucursalId]);
  
  // Manejar cierre exitoso
  const handleCierreSuccess = () => {
    setTimeout(() => {
      router.push('/pdv');
    }, 2000);
  };
  
  // Mostrar loading inicial mientras se obtiene sucursalId
  if (!sucursalId && isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-lg">Cargando configuración...</span>
        </div>
      </div>
    );
  }

  // Si no hay sucursalId después de cargar
  if (!sucursalId && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="text-center p-8">
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
        <div className="text-center p-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {errorMessage.includes('No hay una caja abierta') ? 'Caja Cerrada' : 'Error'}
          </h2>
          <p className="text-red-600 mb-6">{errorMessage}</p>
          
          <div className="space-x-4">
            <button
              onClick={() => router.push('/pdv')}
              className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
            >
              Volver al PDV
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="py-2 px-4 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
            >
              Reintentar
            </button>
          </div>
        </div>
      )}
      
      {/* Si está cargando */}
      {isLoading && !errorMessage && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          <span className="ml-3 text-lg">Verificando estado de caja...</span>
        </div>
      )}
      
      {/* Solo mostrar el componente CierreCaja si tenemos un ID válido */}
      {!isLoading && !errorMessage && cierreCajaId && (
        <CierreCaja id={cierreCajaId} onSuccess={handleCierreSuccess} />
      )}
    </div>
  );
}