'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Package, TruckIcon, AlertTriangle, Search, Filter, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
  origen: {
    nombre: string;
  };
  destino: {
    nombre: string;
  };
  usuario: {
    name: string;
  };
}

export default function EnviosFabricaPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [enviosPendientes, setEnviosPendientes] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchEnvios = async () => {
      try {
        setIsLoading(true);
        
        // Cargar envíos pendientes específicamente para la fábrica
        const pendientesResponse = await authenticatedFetch('/api/fabrica/envios-pendientes');
        
        if (!pendientesResponse.ok) {
          throw new Error('Error al cargar envíos pendientes');
        }
        
        const pendientesData = await pendientesResponse.json();
        setEnviosPendientes(pendientesData);
        
        // Cargar todos los envíos relacionados con la fábrica
        const todosResponse = await authenticatedFetch('/api/fabrica/envios');
        
        if (!todosResponse.ok) {
          throw new Error('Error al cargar historial de envíos');
        }
        
        const todosData = await todosResponse.json();
        setEnvios(todosData);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar los envíos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvios();
  }, []);

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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Envíos de Insumos</h1>

      {/* Envíos pendientes de recepción */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-yellow-50">
          <h3 className="text-lg leading-6 font-medium text-yellow-900 flex items-center">
            <TruckIcon className="h-5 w-5 mr-2 text-yellow-600" />
            Envíos Pendientes de Recepción
          </h3>
        </div>
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando envíos pendientes...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-500">{error}</p>
            </div>
          ) : enviosPendientes.length === 0 ? (
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay envíos pendientes</h3>
              <p className="mt-1 text-sm text-gray-500">
                No tienes envíos pendientes de recepción actualmente.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {enviosPendientes.map(envio => (
                <li key={envio.id}>
                  <div className="block hover:bg-gray-50">
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-indigo-600 truncate">
                            Envío #{envio.id.slice(-6)}
                          </p>
                          <span className={`ml-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(envio.estado)}`}>
                            {envio.estado === 'enviado' ? 'Enviado' : 'En tránsito'}
                          </span>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <Link
                            href={`/fabrica/envios/${envio.id}`}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                          >
                            Recibir Envío
                          </Link>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Desde: {envio.origen.nombre}
                          </p>
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Fecha de envío: {formatDate(envio.fechaEnvio)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Historial de Envíos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Historial de Envíos</h3>
        </div>
        <div className="border-t border-gray-200">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-gray-500">Cargando historial...</p>
            </div>
          ) : error ? (
            <div className="text-center py-6">
              <p className="text-red-500">{error}</p>
            </div>
          ) : envios.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-500">No hay envíos en el historial</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ID
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Origen
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de envío
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de recepción
                    </th>
                    <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {envios.map(envio => (
                    <tr key={envio.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {envio.id.slice(-6)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {envio.origen.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(envio.estado)}`}>
                          {envio.estado === 'pendiente' ? 'Pendiente' : 
                          envio.estado === 'enviado' ? 'Enviado' : 
                          envio.estado === 'en_transito' ? 'En tránsito' : 
                          envio.estado === 'recibido' ? 'Recibido' : 
                          'Con contingencia'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(envio.fechaEnvio)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(envio.fechaRecepcion)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/fabrica/envios/${envio.id}`}
                          className="text-green-600 hover:text-green-900"
                        >
                          Ver detalles
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
    </div>
  );
}