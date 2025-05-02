// src/app/(pdv)/pdv/contingencias/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { AlertTriangle, CheckCircle, Clock, Eye, Plus } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';

// Definir tipos
interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  fechaRespuesta?: string;
  respuesta?: string;
}

export default function ContingenciasPage() {
  const [contingencias, setContingencias] = useState<Contingencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  // Cargar contingencias
  useEffect(() => {
    const loadContingencias = async () => {
      try {
        setIsLoading(true);
        
        // Obtener contingencias de la sucursal del usuario
        const response = await authenticatedFetch(`/api/contingencias?origen=sucursal`);
        
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

    loadContingencias();
  }, []);

  // Mostrar badge según estado
  const getBadgeClass = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_revision':
        return 'bg-blue-100 text-blue-800';
      case 'resuelto':
        return 'bg-green-100 text-green-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#311716]">Contingencias</h1>
        <Link 
          href="/pdv/contingencias/nueva" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#311716] hover:bg-[#462625]"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nueva Contingencia
        </Link>
      </div>

      {/* Lista de contingencias */}
      <div className="bg-white shadow-sm rounded-lg overflow-hidden border border-gray-200">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-[#9c7561] border-t-transparent rounded-full mb-2"></div>
            <p className="text-gray-600">Cargando contingencias...</p>
          </div>
        ) : contingencias.length === 0 ? (
          <div className="p-12 text-center">
            <AlertTriangle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No hay contingencias</h3>
            <p className="text-gray-600">No se encontraron contingencias registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Título</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contingencias.map((contingencia) => (
                  <tr key={contingencia.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contingencia.titulo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getBadgeClass(contingencia.estado)}`}>
                        {contingencia.estado === 'pendiente' ? (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Pendiente
                          </span>
                        ) : contingencia.estado === 'en_revision' ? (
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            En revisión
                          </span>
                        ) : contingencia.estado === 'resuelto' ? (
                          <span className="flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Resuelto
                          </span>
                        ) : (
                          <span className="flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Rechazado
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {format(new Date(contingencia.fechaCreacion), 'dd/MM/yyyy HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <Link 
                        href={`/pdv/contingencias/${contingencia.id}`}
                        className="text-[#9c7561] hover:text-[#311716]"
                      >
                        <span className="flex items-center justify-end">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalle
                        </span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}