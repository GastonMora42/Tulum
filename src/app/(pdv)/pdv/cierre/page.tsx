// src/app/(pdv)/pdv/cierre/page.tsx - versión corregida
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CierreCaja } from '@/components/pdv/CierreCaja';
import { authenticatedFetch } from '@/hooks/useAuth';

export default function CierreCajaPage() {
  const [cierreCajaId, setCierreCajaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const router = useRouter();
  
  useEffect(() => {
    const checkCajaAbierta = async () => {
      try {
        setIsLoading(true);
        
        // Obtener ID de la sucursal
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          setErrorMessage('No se ha configurado una sucursal para este punto de venta');
          setIsLoading(false);
          return;
        }
        
        console.log("Verificando caja para sucursal:", sucursalId);
        
        const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        console.log("Respuesta del API:", response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log("Datos de caja:", data);
          setCierreCajaId(data.cierreCaja.id);
        } else if (response.status === 404) {
          // No hay caja abierta, pero es un estado válido
          console.log("No hay caja abierta");
          setCierreCajaId(null);
        } else {
          throw new Error('Error al verificar el estado de la caja');
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        setErrorMessage(error instanceof Error ? error.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCajaAbierta();
  }, [router]);
  
  // Manejar cierre exitoso
  const handleCierreSuccess = () => {
    // Redirigir al PDV después de un cierre exitoso
    setTimeout(() => {
      router.push('/pdv');
    }, 2000);
  };
  
return (
  <div className="container mx-auto px-4 py-6">
    {/* Si hay error */}
    {errorMessage && (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Error</h2>
        <p className="text-red-600 mb-6">{errorMessage}</p>
        
        <button
          onClick={() => router.push('/pdv')}
          className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Volver al PDV
        </button>
      </div>
    )}
    
    {/* Si está cargando */}
    {isLoading && (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg">Cargando...</span>
      </div>
    )}
    
    {/* Si no hay caja abierta */}
    {!isLoading && !errorMessage && cierreCajaId === null && (
      <div className="text-center p-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">No hay una caja abierta</h2>
        <p className="text-gray-600 mb-6">Debe abrir una caja antes de realizar un cierre</p>
        
        <button
          onClick={() => router.push('/pdv')}
          className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Volver al PDV
        </button>
      </div>
    )}
    
    {/* Solo mostrar el componente CierreCaja si tenemos un ID válido */}
    {!isLoading && !errorMessage && cierreCajaId && (
      <CierreCaja id={cierreCajaId} onSuccess={handleCierreSuccess} />
    )}
  </div>
);
}