// src/app/(fabrica)/fabrica/envios/page.tsx - VERSIÓN MEJORADA
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Package, TruckIcon, AlertTriangle, Search, Filter, RefreshCw, Bell, MapPin, Calendar, CheckCircle } from 'lucide-react';
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
    tipo: string;
  };
  destino: {
    nombre: string;
    tipo: string;
  };
  usuario: {
    name: string;
  };
  items: Array<{
    id: string;
    cantidad: number;
    cantidadRecibida: number | null;
    producto?: {
      nombre: string;
    };
    insumo?: {
      nombre: string;
    };
  }>;
}

export default function EnviosFabricaPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [enviosPendientes, setEnviosPendientes] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>('todos');
  const [busqueda, setBusqueda] = useState<string>('');
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
        return 'bg-yellow-100 text-yellow-800 border border-yellow-300';
      case 'enviado':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'en_transito':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
      case 'recibido':
        return 'bg-green-100 text-green-800 border border-green-300';
      case 'con_contingencia':
        return 'bg-red-100 text-red-800 border border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const getEstadoTexto = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'Pendiente';
      case 'enviado': return 'Enviado';
      case 'en_transito': return 'En Tránsito';
      case 'recibido': return 'Recibido';
      case 'con_contingencia': return 'Con Contingencia';
      default: return estado;
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

  // 🆕 FUNCIÓN PARA OBTENER RESUMEN DE ITEMS
  const getResumenItems = (items: Envio['items']) => {
    const totalItems = items.length;
    const tiposUnicos = [...new Set(items.map(item => 
      item.producto?.nombre || item.insumo?.nombre || 'Desconocido'
    ))].slice(0, 2);
    
    if (totalItems === 1) {
      return tiposUnicos[0];
    } else if (totalItems === 2) {
      return tiposUnicos.join(', ');
    } else {
      return `${tiposUnicos[0]} y ${totalItems - 1} más`;
    }
  };

  // 🆕 FUNCIÓN PARA VERIFICAR SI ESTÁ COMPLETAMENTE RECIBIDO
  const estaCompleta = (envio: Envio) => {
    if (envio.estado !== 'recibido') return false;
    return envio.items.every(item => 
      item.cantidadRecibida !== null && item.cantidadRecibida !== undefined
    );
  };

  // Filtrar envíos
  const enviosFiltrados = envios.filter(envio => {
    if (filtroEstado !== 'todos' && envio.estado !== filtroEstado) return false;
    if (busqueda && !envio.destino.nombre.toLowerCase().includes(busqueda.toLowerCase()) &&
        !envio.id.toLowerCase().includes(busqueda.toLowerCase())) return false;
    return true;
  });

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Envíos de Productos</h1>
          <div className="flex space-x-3">
            <button 
              onClick={fetchData}
              className="text-green-600 hover:text-green-800 flex items-center px-3 py-2 border border-green-300 rounded-md"
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <Link
              href="/fabrica/envios/nuevo"
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center"
            >
              <TruckIcon className="h-4 w-4 mr-2" />
              Nuevo Envío
            </Link>
          </div>
        </div>

        {/* Contador de envíos pendientes */}
        {enviosPendientes.length > 0 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 flex items-center justify-between">
            <div className="flex items-center">
              <Bell className="h-5 w-5 text-amber-500 mr-2" />
              <span className="font-medium text-black">
                Tienes {enviosPendientes.length} envío{enviosPendientes.length !== 1 ? 's' : ''} pendiente{enviosPendientes.length !== 1 ? 's' : ''} de recepción
              </span>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por destino o ID..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                />
              </div>
            </div>
            <div className="md:w-48">
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="todos">Todos los estados</option>
                <option value="pendiente">Pendientes</option>
                <option value="enviado">Enviados</option>
                <option value="en_transito">En Tránsito</option>
                <option value="recibido">Recibidos</option>
                <option value="con_contingencia">Con Contingencia</option>
              </select>
            </div>
          </div>
        </div>

        {/* Historial de Envíos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black flex items-center">
              <Package className="h-5 w-5 text-green-600 mr-2" />
              Historial de Envíos ({enviosFiltrados.length})
            </h3>
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
            ) : enviosFiltrados.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-black">No hay envíos que coincidan con los filtros</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <HCTable>
                  <thead>
                    <tr>
                      <HCTh>ID</HCTh>
                      <HCTh>
                        <div className="flex items-center">
                          <MapPin className="w-4 h-4 mr-1" />
                          Destino
                        </div>
                      </HCTh>
                      <HCTh>Estado</HCTh>
                      <HCTh>Items</HCTh>
                      <HCTh>
                        <div className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1" />
                          Fecha Envío
                        </div>
                      </HCTh>
                      <HCTh>
                        <div className="flex items-center">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Fecha Recepción
                        </div>
                      </HCTh>
                      <HCTh>Acciones</HCTh>
                    </tr>
                  </thead>
                  <tbody>
                    {enviosFiltrados.map(envio => (
                      <tr key={envio.id} className="hover:bg-gray-50">
                        <HCTd>
                          <span className="font-mono text-sm">#{envio.id.slice(-6)}</span>
                        </HCTd>
                        <HCTd>
                          <div className="flex flex-col">
                            <span className="font-medium">{envio.destino.nombre}</span>
                            <span className="text-xs text-gray-500 capitalize">{envio.destino.tipo}</span>
                          </div>
                        </HCTd>
                        <HCTd>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(envio.estado)}`}>
                            {getEstadoTexto(envio.estado)}
                          </span>
                        </HCTd>
                        <HCTd>
                          <div className="text-sm">
                            <div className="font-medium text-gray-900">{getResumenItems(envio.items)}</div>
                            <div className="text-gray-500">{envio.items.length} item{envio.items.length !== 1 ? 's' : ''}</div>
                          </div>
                        </HCTd>
                        <HCTd>
                          <div className="text-sm">
                            {envio.fechaEnvio ? (
                              <>
                                <div className="font-medium text-gray-900">{format(new Date(envio.fechaEnvio), 'dd/MM/yyyy')}</div>
                                <div className="text-gray-500">{format(new Date(envio.fechaEnvio), 'HH:mm')}</div>
                              </>
                            ) : (
                              <span className="text-gray-400">No enviado</span>
                            )}
                          </div>
                        </HCTd>
                        <HCTd>
                          <div className="text-sm">
                            {envio.fechaRecepcion ? (
                              <>
                                <div className="font-medium text-green-700">{format(new Date(envio.fechaRecepcion), 'dd/MM/yyyy')}</div>
                                <div className="text-green-600">{format(new Date(envio.fechaRecepcion), 'HH:mm')}</div>
                                {estaCompleta(envio) && (
                                  <div className="flex items-center text-green-600 text-xs mt-1">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Completo
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400">Pendiente</span>
                            )}
                          </div>
                        </HCTd>
                        <HCTd>
                          <div className="flex space-x-2">
                            <Link
                              href={`/fabrica/envios/${envio.id}`}
                              className="text-green-600 hover:text-green-900 text-sm font-medium"
                            >
                              Ver detalles
                            </Link>
                            {envio.estado === 'pendiente' && (
                              <Link
                                href={`/fabrica/envios/${envio.id}/editar`}
                                className="text-blue-600 hover:text-blue-900 text-sm font-medium"
                              >
                                Editar
                              </Link>
                            )}
                          </div>
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