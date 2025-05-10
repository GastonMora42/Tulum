// src/app/(pdv)/pdv/cierre/page.tsx (actualizado)
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CierreCaja } from '@/components/pdv/CierreCaja';
import { authenticatedFetch } from '@/hooks/useAuth';

export default function CierreCajaPage() {
  const [cierreCajaId, setCierreCajaId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const router = useRouter();
  
  useEffect(() => {
    const checkCajaAbierta = async () => {
      try {
        setIsLoading(true);
        
        // Obtener ID de la sucursal
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          // Si no hay sucursal, mostrar mensaje y no redirigir automáticamente
          setError('No se ha configurado una sucursal para este punto de venta');
          setIsLoading(false);
          return;
        }
        
        const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        
        if (response.ok) {
          const data = await response.json();
          setCierreCajaId(data.cierreCaja.id);
        } else if (response.status === 404) {
          // No hay caja abierta, pero es un estado válido
          setCierreCajaId(null);
        } else {
          throw new Error('Error al verificar el estado de la caja');
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        setError(error instanceof Error ? error.message : 'Error desconocido');
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
  
  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        <span className="ml-3 text-lg">Cargando...</span>
      </div>
    );
  }
  
  // Si no hay caja abierta
  if (!cierreCajaId) {
    return (
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
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-6">
      <CierreCaja id={cierreCajaId} onSuccess={handleCierreSuccess} />
    </div>
  );
}

function setError(arg0: string) {
  throw new Error('Function not implemented.');
}
