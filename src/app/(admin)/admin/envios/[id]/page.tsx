'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft, Send, TruckIcon, AlertTriangle, Loader2, Package } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Link from 'next/link';

interface ItemEnvio {
  id: string;
  insumoId: string;
  cantidad: number;
  cantidadRecibida: number | null;
  insumo: {
    id: string;
    nombre: string;
    unidadMedida: string;
  };
}

interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  estado: string;
  fechaCreacion: string;
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
  observaciones: string | null;
  usuarioId: string;
  origen: {
    id: string;
    nombre: string;
    tipo: string;
  };
  destino: {
    id: string;
    nombre: string;
    tipo: string;
  };
  usuario: {
    id: string;
    name: string;
    email: string;
  };
  items: ItemEnvio[];
  contingencias: Contingencia[];
}

export default function DetalleEnvioPage({ params }: { params: { id: string } }) {
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEnvio = async () => {
      try {
        setIsLoading(true);
        
        const response = await authenticatedFetch(`/api/envios/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el envío');
        }
        
        const data = await response.json();
        setEnvio(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar el envío');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvio();
  }, [params.id]);

  const handleEnviar = async () => {
    if (!envio || envio.estado !== 'pendiente') return;
    
    try {
      setIsProcessing(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/envios-insumos/${envio.id}/enviar`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al marcar como enviado');
      }
      
      // Actualizar envío
      const updatedEnvio = await response.json();
      setEnvio(updatedEnvio);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al marcar como enviado');
    } finally {
      setIsProcessing(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'en_transito':
        return 'bg-indigo-100 text-indigo-800';
      case 'recibido':
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Cargando envío...</span>
      </div>
    );
  }

  if (error || !envio) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">{error || 'Envío no encontrado'}</div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-3">Detalle de Envío #{envio.id.slice(-6)}</h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(envio.estado)}`}>
            {envio.estado === 'pendiente' ? 'Pendiente' : 
             envio.estado === 'enviado' ? 'Enviado' : 
             envio.estado === 'en_transito' ? 'En tránsito' : 
             envio.estado === 'recibido' ? 'Recibido' : 
             'Con contingencia'}
          </span>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </button>
      </div>

      {/* Información general */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Información General</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Origen</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {envio.origen.nombre} ({envio.origen.tipo})
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Destino</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {envio.destino.nombre} ({envio.destino.tipo})
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Creado por</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {envio.usuario.name}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fecha de creación</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(envio.fechaCreacion)}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fecha de envío</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(envio.fechaEnvio)}
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fecha de recepción</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(envio.fechaRecepcion)}
              </dd>
            </div>
            {envio.observaciones && (
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Observaciones</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {envio.observaciones}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Contingencias */}
      {envio.contingencias && envio.contingencias.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-red-50">
            <h3 className="text-lg leading-6 font-medium text-red-900 flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
              Contingencias
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <ul className="divide-y divide-gray-200">
              {envio.contingencias.map(contingencia => (
                <li key={contingencia.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-md font-medium text-gray-900">
                        {contingencia.titulo}
                      </h4>
                      <p className="mt-1 text-sm text-gray-500">
                        {formatDate(contingencia.fechaCreacion)}
                      </p>
                      <p className="mt-2 text-sm text-gray-700">
                        {contingencia.descripcion}
                      </p>
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contingencia.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        contingencia.estado === 'en_revision' ? 'bg-blue-100 text-blue-800' :
                        contingencia.estado === 'resuelto' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {contingencia.estado === 'pendiente' ? 'Pendiente' :
                         contingencia.estado === 'en_revision' ? 'En Revisión' :
                         contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                      </span>
                      <div className="mt-2">
                        <Link
                          href={`/admin/contingencias/${contingencia.id}`}
                          className="text-indigo-600 hover:text-indigo-900 text-sm font-medium"
                        >
                          Ver detalle
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Insumos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
            <Package className="h-5 w-5 mr-2 text-gray-500" />
            Insumos
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Insumo
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cantidad enviada
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Cantidad recibida
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Diferencia
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {envio.items.map(item => {
                const diferencia = item.cantidadRecibida !== null
                  ? item.cantidad - item.cantidadRecibida
                  : null;
                
                return (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.insumo.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.cantidad} {item.insumo.unidadMedida}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.cantidadRecibida !== null
                        ? `${item.cantidadRecibida} ${item.insumo.unidadMedida}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {diferencia !== null ? (
                        <span className={diferencia === 0
                          ? 'text-green-600'
                          : 'text-red-600'
                        }>
                          {diferencia > 0 ? `-${diferencia}` : `+${Math.abs(diferencia)}`} {item.insumo.unidadMedida}
                        </span>
                      ) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Acciones */}
      {envio.estado === 'pendiente' && (
        <div className="flex justify-end">
          <button
            onClick={handleEnviar}
            disabled={isProcessing}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {isProcessing ? (
              <>
                <Loader2 className="animate-spin h-4 w-4 mr-2" />
                Procesando...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Marcar como enviado
              </>
            )}
          </button>
        </div>
      )}

      {envio.estado === 'con_contingencia' && (
        <div className="bg-red-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-red-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">
                Este envío tiene contingencias pendientes
              </h3>
              <div className="mt-2 text-sm text-red-700">
                <p>
                  Se han detectado discrepancias entre las cantidades enviadas y recibidas.
                  Por favor, revisa y resuelve las contingencias para continuar con el proceso.
                </p>
              </div>
              <div className="mt-4">
                <div className="-mx-2 -my-1.5 flex">
                  <Link
                    href={`/admin/contingencias/${envio.contingencias[0]?.id || ''}`}
                    className="bg-red-50 px-2 py-1.5 rounded-md text-sm font-medium text-red-800 hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Ver contingencia
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}