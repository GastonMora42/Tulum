// src/app/(admin)/admin/envios-insumos/page.tsx (MEJORADA)
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { 
  Package, 
  Plus, 
  Filter, 
  RefreshCw, 
  TruckIcon,
  Clock,
  CheckCircle,
  AlertTriangle,
  Send,
  Eye,
  Search,
  Calendar,
  MapPin,
  User
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
  origen: { nombre: string; };
  destino: { nombre: string; };
  usuario: { name: string; };
  items: Array<{
    id: string;
    cantidad: number;
    insumo: {
      nombre: string;
      unidadMedida: string;
    };
  }>;
}

export default function EnviosInsumosPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    origen: '',
    destino: '',
    fechaDesde: '',
    fechaHasta: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const estadosConfig = {
    pendiente: { 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Clock, 
      label: 'Pendiente',
      description: 'Esperando procesamiento'
    },
    enviado: { 
      color: 'bg-blue-100 text-blue-800', 
      icon: Send, 
      label: 'Enviado',
      description: 'En camino al destino'
    },
    en_transito: { 
      color: 'bg-indigo-100 text-indigo-800', 
      icon: TruckIcon, 
      label: 'En Tránsito',
      description: 'Transportándose'
    },
    recibido: { 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle, 
      label: 'Recibido',
      description: 'Entregado exitosamente'
    },
    con_contingencia: { 
      color: 'bg-red-100 text-red-800', 
      icon: AlertTriangle, 
      label: 'Con Contingencia',
      description: 'Requiere atención'
    }
  };

  useEffect(() => {
    fetchEnvios();
  }, [filtros]);

  const fetchEnvios = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await authenticatedFetch(`/api/admin/envios-insumos?${params.toString()}`);
      
      if (!response.ok) throw new Error('Error al cargar envíos');
      
      const data = await response.json();
      setEnvios(data);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar los envíos');
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoConfig = (estado: string) => {
    return estadosConfig[estado as keyof typeof estadosConfig] || estadosConfig.pendiente;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const clearFilters = () => {
    setFiltros({
      estado: '',
      origen: '',
      destino: '',
      fechaDesde: '',
      fechaHasta: ''
    });
  };

  // Estadísticas rápidas
  const stats = {
    total: envios.length,
    pendientes: envios.filter(e => e.estado === 'pendiente').length,
    enTransito: envios.filter(e => e.estado === 'en_transito' || e.estado === 'enviado').length,
    recibidos: envios.filter(e => e.estado === 'recibido').length,
    contingencias: envios.filter(e => e.estado === 'con_contingencia').length
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header Mejorado */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Envíos de Insumos</h1>
              <p className="text-white/80">Controla y administra todos los envíos de insumos del sistema</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-white/20 transition-colors"
              >
                <Filter className="h-4 w-4 mr-2" />
                {showFilters ? 'Ocultar Filtros' : 'Filtros'}
              </button>
              <Link 
                href="/admin/envios/nuevo" 
                className="inline-flex items-center px-4 py-2 bg-white text-[#311716] rounded-md hover:bg-gray-100 transition-colors font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Envío
              </Link>
            </div>
          </div>
        </div>

        {/* Estadísticas Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="bg-gray-100 p-2 rounded-lg">
                <Package className="h-6 w-6 text-gray-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-600">Total</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-yellow-200 p-4">
            <div className="flex items-center">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-yellow-700">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900">{stats.pendientes}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-blue-200 p-4">
            <div className="flex items-center">
              <div className="bg-blue-100 p-2 rounded-lg">
                <TruckIcon className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-blue-700">En Tránsito</p>
                <p className="text-2xl font-bold text-blue-900">{stats.enTransito}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-green-200 p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-700">Recibidos</p>
                <p className="text-2xl font-bold text-green-900">{stats.recibidos}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-red-200 p-4">
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700">Contingencias</p>
                <p className="text-2xl font-bold text-red-900">{stats.contingencias}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Filtros Expandible */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Avanzados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <select
                  value={filtros.estado}
                  onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="enviado">Enviado</option>
                  <option value="en_transito">En tránsito</option>
                  <option value="recibido">Recibido</option>
                  <option value="con_contingencia">Con contingencia</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Desde</label>
                <input
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Hasta</label>
                <input
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Limpiar
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={fetchEnvios}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#311716] hover:bg-[#462625]"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista Mejorada de Envíos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando envíos...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : envios.length === 0 ? (
            <div className="text-center py-12">
              <TruckIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay envíos</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza creando un nuevo envío de insumos.
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/envios/nuevo"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#311716] hover:bg-[#462625]"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Envío
                </Link>
              </div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {envios.map((envio) => {
                const estadoConfig = getEstadoConfig(envio.estado);
                const IconoEstado = estadoConfig.icon;
                
                return (
                  <div key={envio.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${estadoConfig.color.replace('text-', 'bg-').replace('800', '100')}`}>
                            <IconoEstado className={`h-5 w-5 ${estadoConfig.color.includes('yellow') ? 'text-yellow-600' : 
                                                                    estadoConfig.color.includes('blue') ? 'text-blue-600' :
                                                                    estadoConfig.color.includes('indigo') ? 'text-indigo-600' :
                                                                    estadoConfig.color.includes('green') ? 'text-green-600' :
                                                                    'text-red-600'}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              Envío #{envio.id.substring(envio.id.length - 8)}
                            </h3>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoConfig.color}`}>
                              {estadoConfig.label}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-green-500" />
                              <span className="font-medium">Origen:</span>
                              <span className="ml-1">{envio.origen.nombre}</span>
                            </div>
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-red-500" />
                              <span className="font-medium">Destino:</span>
                              <span className="ml-1">{envio.destino.nombre}</span>
                            </div>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="font-medium">Creado por:</span>
                              <span className="ml-1">{envio.usuario.name}</span>
                            </div>
                          </div>
                          
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="flex items-center text-gray-500">
                                <Calendar className="h-4 w-4 mr-1" />
                                Creado: {formatDate(envio.fechaCreacion)}
                              </span>
                            </div>
                            {envio.fechaEnvio && (
                              <div>
                                <span className="flex items-center text-blue-600">
                                  <Send className="h-4 w-4 mr-1" />
                                  Enviado: {formatDate(envio.fechaEnvio)}
                                </span>
                              </div>
                            )}
                            {envio.fechaRecepcion && (
                              <div>
                                <span className="flex items-center text-green-600">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Recibido: {formatDate(envio.fechaRecepcion)}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Resumen de items */}
                          <div className="mt-3 flex items-center text-sm text-gray-500">
                            <Package className="h-4 w-4 mr-1" />
                            <span>{envio.items.length} insumos • </span>
                            <span className="ml-1">
                              {envio.items.reduce((sum, item) => sum + item.cantidad, 0)} unidades totales
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="text-right text-xs text-gray-500 mb-2">
                          {estadoConfig.description}
                        </div>
                        <Link 
                          href={`/admin/envios/${envio.id}`}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalles
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}