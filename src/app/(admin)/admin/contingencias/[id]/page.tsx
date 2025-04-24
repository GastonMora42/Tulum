// src/app/(admin)/admin/contingencias/[id]/page.tsx

'use client';

import { useState, useEffect } from 'react';
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
  fechaRespuesta?: string;
  respuesta?: string;
  resueltoPor?: string;
  ajusteRealizado: boolean;
  produccionId?: string;
  envioId?: string;
  usuario: {
    name: string;
  };
}

export default function DetalleContingenciaPage({ params }: { params: { id: string } }) {
  const [contingencia, setContingencia] = useState<Contingencia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [ajusteRealizado, setAjusteRealizado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchContingencia = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedFetch(`/api/contingencias/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar contingencia');
        }
        
        const data = await response.json();
        setContingencia(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar la contingencia');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContingencia();
  }, [params.id]);

  const handleAction = async (accion: string) => {
    try {
      setIsSaving(true);
      
      const body: any = { accion };
      
      if (accion === 'resolver' || accion === 'rechazar') {
        if (!respuesta.trim()) {
          setError('Debe proporcionar una respuesta');
          setIsSaving(false);
          return;
        }
        
        body.respuesta = respuesta;
        
        if (accion === 'resolver') {
          body.ajusteRealizado = ajusteRealizado;
        }
      }
      
      const response = await authenticatedFetch(`/api/contingencias/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al actualizar contingencia');
      }
      
      // Actualizar contingencia en la UI
      const updatedContingencia = await response.json();
      setContingencia(updatedContingencia);
      
      // Limpiar formulario
      setRespuesta('');
      setAjusteRealizado(false);
      
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar la acción');
    } finally {
      setIsSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

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

  const getOrigenBadge = (origen: string) => {
    switch (origen) {
      case 'fabrica':
        return 'bg-purple-100 text-purple-800';
      case 'sucursal':
        return 'bg-indigo-100 text-indigo-800';
      case 'oficina':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  // Determinar si el usuario actual puede resolver la contingencia
  const puedeResolver = user?.roleId === 'admin' || 
                         (contingencia?.origen === 'fabrica' && user?.roleId === 'fabrica') ||
                         (contingencia?.origen === 'sucursal' && user?.roleId === 'vendedor');

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-lg">Cargando contingencia...</p>
      </div>
    );
  }

  if (error && !contingencia) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Volver
        </button>
      </div>
    );
  }

  if (!contingencia) {
    return (
      <div className="text-center py-10">
        <p className="text-lg text-red-500">Contingencia no encontrada</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Detalle de Contingencia</h1>
        <button
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Volver
        </button>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Información de la contingencia */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
          <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              {contingencia.titulo}
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Creada el {formatDate(contingencia.fechaCreacion)} por {contingencia.usuario.name}
            </p>
          </div>
          <div className="flex space-x-2">
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
              {contingencia.estado === 'pendiente' ? 'Pendiente' : 
               contingencia.estado === 'en_revision' ? 'En revisión' : 
               contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
            </span>
            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrigenBadge(contingencia.origen)}`}>
              {contingencia.origen === 'fabrica' ? 'Fábrica' : 
               contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
            </span>
          </div>
        </div>
        <div className="border-t border-gray-200">
          <dl>
            <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
            <dt className="text-sm font-medium text-gray-500">Descripción</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {contingencia.descripcion}
              </dd>
            </div>
            
            {contingencia.produccionId && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Producción relacionada</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <a href={`/fabrica/produccion/${contingencia.produccionId}`} className="text-indigo-600 hover:text-indigo-900">
                    Ver producción
                  </a>
                </dd>
              </div>
            )}
            
            {contingencia.envioId && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Envío relacionado</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <a href={`/fabrica/envios/${contingencia.envioId}`} className="text-indigo-600 hover:text-indigo-900">
                    Ver envío
                  </a>
                </dd>
              </div>
            )}
            
            {contingencia.respuesta && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Respuesta</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {contingencia.respuesta}
                </dd>
              </div>
            )}
            
            {contingencia.fechaRespuesta && (
              <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fecha de respuesta</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(contingencia.fechaRespuesta)}
                </dd>
              </div>
            )}
            
            {contingencia.estado === 'resuelto' && (
              <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Ajuste realizado</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {contingencia.ajusteRealizado ? 'Sí' : 'No'}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Acciones permitidas según el estado */}
      {puedeResolver && contingencia.estado === 'pendiente' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Resolver contingencia
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="respuesta" className="block text-sm font-medium text-gray-700">
                  Respuesta
                </label>
                <textarea
                  id="respuesta"
                  name="respuesta"
                  rows={4}
                  className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                  value={respuesta}
                  onChange={(e) => setRespuesta(e.target.value)}
                ></textarea>
              </div>
              
              <div className="flex items-center">
                <input
                  id="ajusteRealizado"
                  name="ajusteRealizado"
                  type="checkbox"
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  checked={ajusteRealizado}
                  onChange={(e) => setAjusteRealizado(e.target.checked)}
                />
                <label htmlFor="ajusteRealizado" className="ml-2 block text-sm text-gray-900">
                  Se realizó un ajuste de stock
                </label>
              </div>
              
              <div className="flex space-x-3 justify-end">
                <button
                  type="button"
                  onClick={() => handleAction('en_revision')}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Marcar en revisión
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('rechazar')}
                  disabled={isSaving || !respuesta.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Rechazar
                </button>
                <button
                  type="button"
                  onClick={() => handleAction('resolver')}
                  disabled={isSaving || !respuesta.trim()}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}