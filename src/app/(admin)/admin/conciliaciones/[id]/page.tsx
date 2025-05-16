// src/app/(admin)/admin/conciliaciones/[id]/page.tsx
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ConciliacionContingenciasPage({ params }: { params: { id: string } }) {
  const [contingencias, setContingencias] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  useEffect(() => {
    const fetchContingencias = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedFetch(`/api/contingencias?conciliacionId=${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar contingencias');
        }
        
        const data = await response.json();
        setContingencias(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las contingencias');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchContingencias();
  }, [params.id]);
  
  // Mostrar badge según estado
  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_revision': return 'bg-blue-100 text-blue-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Contingencias de Conciliación #{params.id}</h1>
          <button
            onClick={() => router.back()}
            className="text-indigo-600 hover:text-indigo-900"
          >
            Volver
          </button>
        </div>
        
        {isLoading ? (
          <div className="text-center p-8">Cargando contingencias...</div>
        ) : contingencias.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay contingencias</h3>
            <p className="mt-1 text-sm text-gray-500">
              Esta conciliación no tiene contingencias registradas.
            </p>
          </div>
        ) : (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <ul className="divide-y divide-gray-200">
              {contingencias.map((contingencia: any) => (
                <li key={contingencia.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {contingencia.titulo}
                    </p>
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeClass(contingencia.estado)}`}>
                      {contingencia.estado === 'pendiente' ? (
                        <span className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          Pendiente
                        </span>
                      ) : contingencia.estado === 'resuelto' ? (
                        <span className="flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Resuelto
                        </span>
                      ) : (
                        contingencia.estado
                      )}
                    </span>
                  </div>
                  <div className="mt-2 sm:flex sm:justify-between">
                    <div className="sm:flex">
                      <p className="flex items-center text-sm text-gray-500">
                        {contingencia.descripcion.substring(0, 100)}
                        {contingencia.descripcion.length > 100 ? '...' : ''}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>
                        Creada el {new Date(contingencia.fechaCreacion).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={() => router.push(`/admin/contingencias/${contingencia.id}`)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Ver detalles
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}