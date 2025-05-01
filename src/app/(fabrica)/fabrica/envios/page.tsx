'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Package, TruckIcon, AlertTriangle, Search, Filter, RefreshCw, Bell } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

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
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchData = async () => {
    try {
      setRefreshing(true);
      
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
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Programar actualización periódica
    const intervalId = setInterval(fetchData, 60000); // Actualizar cada minuto
    return () => clearInterval(intervalId);
  }, []);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-black';
      case 'enviado':
        return 'bg-blue-100 text-black';
      case 'en_transito':
        return 'bg-indigo-100 text-black';
      case 'recibido':
        return 'bg-green-100 text-black';
      case 'con_contingencia':
        return 'bg-red-100 text-black';
      default:
        return 'bg-gray-100 text-black';
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
    <ContrastEnhancer>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-black">Envíos de Insumos</h1>

        {/* Contador de envíos pendientes */}
        {enviosPendientes.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-amber-500 mr-2" />
              <span className="font-medium text-black">
                Tienes {enviosPendientes.length} envío{enviosPendientes.length !== 1 ? 's' : ''} pendiente{enviosPendientes.length !== 1 ? 's' : ''} de recepción
              </span>
            </div>
            <button 
              onClick={fetchData}
              className="text-green-600 hover:text-green-800 flex items-center"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        )}

        {/* Envíos pendientes de recepción - Panel destacado */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border-2 border-yellow-200">
          <div className="px-4 py-5 sm:px-6 bg-yellow-50 flex justify-between items-center">
            <h3 className="text-lg leading-6 font-medium text-black flex items-center">
              <TruckIcon className="h-5 w-5 mr-2 text-yellow-600" />
              Envíos Pendientes de Recepción
            </h3>
            {enviosPendientes.length > 0 && (
              <span className="bg-yellow-200 text-black py-1 px-3 rounded-full text-sm font-medium">
                {enviosPendientes.length} pendiente{enviosPendientes.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          <div className="border-t border-gray-200">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-black">Cargando envíos pendientes...</p>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-red-500">{error}</p>
              </div>
            ) : enviosPendientes.length === 0 ? (
              <div className="text-center py-10">
                <Package className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-black">No hay envíos pendientes</h3>
                <p className="mt-1 text-sm text-black">
                  Todos los envíos han sido recepcionados correctamente.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {enviosPendientes.map(envio => (
                  <li key={envio.id} className="hover:bg-yellow-50 transition-colors">
                    <div className="block">
                      <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <p className="text-sm font-medium text-indigo-600 mb-1">
                              Envío #{envio.id.slice(-6)}
                            </p>
                            <div className="flex items-center">
                              <span className={`mr-2 px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(envio.estado)}`}>
                                {envio.estado === 'enviado' ? 'Enviado' : 'En tránsito'}
                              </span>
                              <p className="text-sm text-black">
                                Desde: <span className="font-medium">{envio.origen.nombre}</span>
                              </p>
                            </div>
                            <p className="text-sm text-black mt-1">
                              Fecha de envío: {formatDate(envio.fechaEnvio)}
                            </p>
                          </div>
                          <Link
                            href={`/fabrica/envios/${envio.id}`}
                            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
                          >
                            Recibir Envío
                          </Link>
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
            <h3 className="text-lg leading-6 font-medium text-black">Historial de Envíos</h3>
          </div>
          <div className="border-t border-gray-200">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="inline-block animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
                <p className="mt-2 text-sm text-black">Cargando historial...</p>
              </div>
            ) : error ? (
              <div className="text-center py-6">
                <p className="text-red-500">{error}</p>
              </div>
            ) : envios.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-black">No hay envíos en el historial</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <HCTable>
                  <thead>
                    <tr>
                      <HCTh>ID</HCTh>
                      <HCTh>Origen</HCTh>
                      <HCTh>Estado</HCTh>
                      <HCTh>Fecha de envío</HCTh>
                      <HCTh>Fecha de recepción</HCTh>
                      <HCTh>Acciones</HCTh>
                    </tr>
                  </thead>
                  <tbody>
                    {envios.map(envio => (
                      <tr key={envio.id} className="hover:bg-gray-50">
                        <HCTd>{envio.id.slice(-6)}</HCTd>
                        <HCTd>{envio.origen.nombre}</HCTd>
                        <HCTd>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(envio.estado)}`}>
                            {envio.estado === 'pendiente' ? 'Pendiente' : 
                            envio.estado === 'enviado' ? 'Enviado' : 
                            envio.estado === 'en_transito' ? 'En tránsito' : 
                            envio.estado === 'recibido' ? 'Recibido' : 
                            'Con contingencia'}
                          </span>
                        </HCTd>
                        <HCTd>{formatDate(envio.fechaEnvio)}</HCTd>
                        <HCTd>{formatDate(envio.fechaRecepcion)}</HCTd>
                        <HCTd>
                          <Link
                            href={`/fabrica/envios/${envio.id}`}
                            className="text-green-600 hover:text-green-900"
                          >
                            Ver detalles
                          </Link>
                        </HCTd>
                      </tr>
                    ))}
                  </tbody>
                </HCTable>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}