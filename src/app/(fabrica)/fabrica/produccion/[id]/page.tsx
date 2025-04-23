// src/app/(fabrica)/fabrica/produccion/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Box, ArrowLeft, CheckCircle, AlertTriangle, Clock, CalendarClock } from 'lucide-react';

interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo: {
    nombre: string;
    unidadMedida: string;
  };
}

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items: RecetaItem[];
  productoRecetas: Array<{
    id: string;
    productoId: string;
    producto: {
      nombre: string;
    }
  }>;
}

interface Contingencia {
  id: string;
  titulo: string;
  estado: string;
  fechaCreacion: string;
}

interface Produccion {
  id: string;
  recetaId: string;
  cantidad: number;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  observaciones: string | null;
  receta: Receta;
  usuario: {
    name: string;
  };
  contingencias: Contingencia[];
}

export default function DetalleProduccionPage({ params }: { params: { id: string } }) {
  const [produccion, setProduccion] = useState<Produccion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [cantidadProducida, setCantidadProducida] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const router = useRouter();
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    const fetchProduccion = async () => {
      try {
        setIsLoading(true);
        
        const response = await authenticatedFetch(`/api/fabrica/produccion/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar producción');
        }
        
        const data = await response.json();
        setProduccion(data);
        
        // Inicializar cantidad producida con la cantidad esperada
        setCantidadProducida(data.cantidad * data.receta.rendimiento);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar la producción');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduccion();
  }, [params.id]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_proceso':
        return 'bg-blue-100 text-blue-800';
      case 'finalizada':
        return 'bg-green-100 text-green-800';
      case 'con_contingencia':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const handleFinalizar = async () => {
    if (!produccion) return;
    
    try {
      setIsFinalizando(true);
      
      // Seleccionar el primer producto asociado a la receta (en un caso real deberíamos permitir elegir)
      const productoId = produccion.receta.productoRecetas[0]?.productoId;
      
      if (!productoId) {
        throw new Error('No hay productos asociados a esta receta');
      }
      
      const response = await authenticatedFetch(`/api/fabrica/produccion/${params.id}/finalizar`, {
        method: 'POST',
        body: JSON.stringify({
          productoId,
          ubicacionId: 'ubicacion-fabrica', // En un caso real, esto debería venir del contexto o selección
          cantidadProducida,
          observaciones
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al finalizar producción');
      }
      
      // Refrescar datos
      router.refresh();
      
      // Actualizar estado localmente
      setProduccion(prev => prev ? {...prev, estado: 'finalizada', fechaFin: new Date().toISOString()} : null);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al finalizar la producción');
    } finally {
      setIsFinalizando(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !produccion) {
    return (
      <div className="text-center py-10">
        <AlertTriangle className="mx-auto h-12 w-12 text-red-400" />
        <h3 className="mt-2 text-lg font-medium text-red-900">Error</h3>
        <p className="mt-1 text-red-500">{error || 'No se pudo cargar la producción'}</p>
        <button
          onClick={() => router.push('/fabrica/produccion')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-3">Producción #{produccion.id.slice(-6)}</h1>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(produccion.estado)}`}>
            {produccion.estado === 'pendiente' ? 'Pendiente' : 
             produccion.estado === 'en_proceso' ? 'En proceso' : 
             produccion.estado === 'finalizada' ? 'Finalizada' : 
             'Con contingencia'}
          </span>
        </div>
        <button
          onClick={() => router.push('/fabrica/produccion')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Información general */}
        <div className="md:col-span-2 bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Información de la Producción</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Receta</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {produccion.receta.nombre}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Cantidad</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {produccion.cantidad} lotes
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Rendimiento esperado</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {produccion.cantidad * produccion.receta.rendimiento} unidades
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fecha de inicio</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(produccion.fechaInicio)}
                </dd>
              </div>
              {produccion.fechaFin && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Fecha de finalización</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(produccion.fechaFin)}
                  </dd>
                </div>
              )}
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Responsable</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {produccion.usuario.name}
                </dd>
              </div>
              {produccion.observaciones && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2 whitespace-pre-line">
                    {produccion.observaciones}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>
        
        {/* Acciones y estado */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Estado y Acciones</h3>
          </div>
          <div className="border-t border-gray-200 p-4 space-y-4">
{produccion.estado === 'en_proceso' && (
  <div className="space-y-4">
    <h4 className="font-medium">Finalizar producción</h4>
    <div>
      <label htmlFor="cantidadProducida" className="block text-sm font-medium text-gray-700 mb-1">
        Cantidad producida
      </label>
      <input
        type="number"
        id="cantidadProducida"
        name="cantidadProducida"
        min="1"
        value={cantidadProducida}
        onChange={(e) => setCantidadProducida(parseInt(e.target.value) || 0)}
        className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
      />
    </div>
    

                <div>
                  <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones
                  </label>
                  <textarea
                    id="observaciones"
                    name="observaciones"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Observaciones sobre la producción"
                  ></textarea>
                </div>
                <button
      onClick={handleFinalizar}
      disabled={isFinalizando}
      className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
    >
      {isFinalizando ? "Finalizando..." : "Finalizar Producción"}
    </button>
  </div>
)}
          
            {produccion.estado === 'con_contingencia' && (
              <div className="bg-red-50 border-l-4 border-red-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-5 w-5 text-red-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700">
                      Esta producción tiene contingencias pendientes de resolver.
                    </p>
                    <Link
                      href={`/fabrica/contingencias?produccionId=${produccion.id}`}
                      className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                    >
                      Ver Contingencias
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {produccion.estado === 'finalizada' && (
              <div className="bg-green-50 border-l-4 border-green-400 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-green-700">
                      Producción finalizada correctamente.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Enlace al detalle de la receta */}
            <Link
              href={`/fabrica/recetas/${produccion.recetaId}`}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 w-full justify-center mt-4"
            >
              <Box className="mr-2 h-4 w-4" />
              Ver Receta
            </Link>
            
            {/* Reportar contingencia */}
            {['en_proceso', 'pendiente'].includes(produccion.estado) && hasPermission('contingencia:crear') && (
              <Link
                href={`/fabrica/contingencias/nueva?produccionId=${produccion.id}`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 w-full justify-center mt-2"
              >
                <AlertTriangle className="mr-2 h-4 w-4" />
                Reportar Contingencia
              </Link>
            )}
          </div>
        </div>
      </div>
      
      {/* Insumos utilizados */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Insumos Utilizados</h3>
        </div>
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insumo
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad por Lote
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad Total
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidad
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {produccion.receta.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {item.insumo.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.cantidad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.cantidad * produccion.cantidad}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {item.insumo.unidadMedida}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Contingencias */}
      {produccion.contingencias.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Contingencias</h3>
          </div>
          <div className="border-t border-gray-200">
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
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {produccion.contingencias.map((contingencia) => (
                  <tr key={contingencia.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {contingencia.titulo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        contingencia.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        contingencia.estado === 'en_revision' ? 'bg-blue-100 text-blue-800' :
                        contingencia.estado === 'resuelto' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                         contingencia.estado === 'en_revision' ? 'En revisión' :
                         contingencia.estado === 'resuelto' ? 'Resuelto' :
                         'Rechazado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(contingencia.fechaCreacion)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/fabrica/contingencias/${contingencia.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Ver detalles
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}