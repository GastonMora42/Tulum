'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Package, Plus, Search, Filter, RefreshCw, TruckIcon } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCSelect, HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

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

export default function EnviosPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const fetchEnvios = async () => {
      try {
        setIsLoading(true);
        
        // Construir query params
        const params = new URLSearchParams();
        if (filtroEstado) params.append('estado', filtroEstado);
        
        const response = await authenticatedFetch(`/api/admin/envios-insumos?${params.toString()}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar envíos');
        }
        
        const data = await response.json();
        setEnvios(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar los envíos');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvios();
  }, [filtroEstado]);

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
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Gestión de Envíos de Insumos</h1>
          <Link 
            href="/admin/envios/nuevo" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Envío
          </Link>
        </div>
  
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col md:flex-row gap-4 md:items-end">
            <div className="flex-1">
              <HCLabel htmlFor="filtroEstado" className="block text-sm font-medium mb-1">
                Filtrar por estado
              </HCLabel>
              <HCSelect
                id="filtroEstado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="enviado">Enviado</option>
                <option value="en_transito">En tránsito</option>
                <option value="recibido">Recibido</option>
                <option value="con_contingencia">Con contingencia</option>
              </HCSelect>
            </div>
            
            <button
              type="button"
              onClick={() => setFiltroEstado('')}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar filtros
            </button>
          </div>
        </div>
  
        {/* Lista de envíos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-black">Cargando envíos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
            </div>
          ) : envios.length === 0 ? (
            <div className="text-center py-10">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-black">No hay envíos</h3>
              <p className="mt-1 text-sm text-black">
                Comienza creando un nuevo envío de insumos.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/envios/nuevo"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Envío
                </Link>
              </div>
            </div>
          ) : (
            <HCTable className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    ID
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Origen → Destino
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Estado
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Fecha de creación
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Fecha de envío
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                  >
                    Acciones
                  </HCTh>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {envios.map((envio) => (
                  <tr key={envio.id} className="hover:bg-gray-50">
                    <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                      {envio.id.substring(envio.id.length - 6)}
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">
                        {envio.origen.nombre} → {envio.destino.nombre}
                      </div>
                      <div className="text-xs text-black">
                        Creado por: {envio.usuario.name}
                      </div>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        envio.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                        envio.estado === 'enviado' ? 'bg-blue-100 text-blue-800' :
                        envio.estado === 'en_transito' ? 'bg-indigo-100 text-indigo-800' :
                        envio.estado === 'recibido' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {envio.estado.charAt(0).toUpperCase() + envio.estado.slice(1)}
                      </span>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(envio.fechaCreacion)}
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatDate(envio.fechaEnvio)}
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/admin/envios/${envio.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Ver detalles
                      </Link>
                    </HCTd>
                  </tr>
                ))}
              </tbody>
            </HCTable>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}