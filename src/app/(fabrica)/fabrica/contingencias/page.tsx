// src/app/(fabrica)/fabrica/contingencias/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  produccionId?: string;
  envioId?: string;
}

export default function ContingenciasFabricaPage() {
  const [contingencias, setContingencias] = useState<Contingencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchContingencias = async () => {
      try {
        setIsLoading(true);
        
        // Obtener contingencias con origen 'fabrica'
        const response = await authenticatedFetch(`/api/contingencias?origen=fabrica`);
        
        if (!response.ok) {
          throw new Error('Error al cargar contingencias');
        }
        
        const data = await response.json();
        console.log("Contingencias cargadas:", data.length);
        setContingencias(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las contingencias');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchContingencias();
  }, []);

  const getEstadoBadge = (estado: string) => {
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

  const formatDate = (dateString: string) => {
    try {
        return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
      } catch (e) {
        return dateString;
      }
    };
  
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Contingencias de Fábrica</h1>
          <Link 
            href="/fabrica/contingencias/nueva" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
          >
            Reportar Contingencia
          </Link>
        </div>
  
        {/* Lista de contingencias */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-lg">Cargando contingencias...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
            </div>
          ) : contingencias.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-gray-500">No hay contingencias que mostrar</p>
            </div>
          ) : (
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Título
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Estado
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Fecha
      </th>
      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Relacionado
      </th>
      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
        Ver
      </th>
    </tr>
  </thead>
  <tbody className="bg-white divide-y divide-gray-200">
    {contingencias.map((contingencia) => (
      <tr key={contingencia.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{contingencia.titulo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                        {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                         contingencia.estado === 'en_revision' ? 'En revisión' : 
                         contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(contingencia.fechaCreacion)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {contingencia.produccionId ? (
                        <Link href={`/fabrica/produccion/${contingencia.produccionId}`} className="text-purple-600 hover:text-purple-900">
                          Producción
                        </Link>
                      ) : contingencia.envioId ? (
                        <Link href={`/fabrica/envios/${contingencia.envioId}`} className="text-purple-600 hover:text-purple-900">
                          Envío
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
          <Link 
            href={`/fabrica/contingencias/${contingencia.id}`}
            className="text-purple-600 hover:text-purple-900"
          >
            Ver detalles
          </Link>
        </td>
      </tr>
    ))}
  </tbody>
</table>
          )}
        </div>
      </div>
    );
  }