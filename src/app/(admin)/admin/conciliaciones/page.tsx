// src/app/(admin)/admin/conciliaciones/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Calendar,
  MapPin,
  User,
  BarChart3
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface Conciliacion {
  id: string;
  sucursalId: string;
  fecha: string;
  estado: string;
  usuarioId: string;
  detalles: any;
  observaciones?: string;
  sucursal: {
    nombre: string;
    tipo: string;
  };
  usuario: {
    name: string;
  };
  _count: {
    contingencias: number;
  };
}

export default function ConciliacionesPage() {
  const [conciliaciones, setConciliaciones] = useState<Conciliacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    sucursal: '',
    fechaDesde: '',
    fechaHasta: '',
    usuario: ''
  });
  const [showFilters, setShowFilters] = useState(false);

  const estadosConfig = {
    pendiente: { 
      color: 'bg-yellow-100 text-yellow-800', 
      icon: Clock, 
      label: 'Pendiente',
      description: 'En proceso de revisión'
    },
    completada: { 
      color: 'bg-green-100 text-green-800', 
      icon: CheckCircle, 
      label: 'Completada',
      description: 'Conciliación finalizada'
    },
    con_contingencia: { 
      color: 'bg-red-100 text-red-800', 
      icon: AlertTriangle, 
      label: 'Con Contingencia',
      description: 'Requiere atención'
    }
  };

  useEffect(() => {
    fetchConciliaciones();
  }, [filtros]);

  const fetchConciliaciones = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await authenticatedFetch(`/api/admin/conciliaciones?${params.toString()}`);
      
      if (!response.ok) throw new Error('Error al cargar conciliaciones');
      
      const data = await response.json();
      setConciliaciones(data);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar las conciliaciones');
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoConfig = (estado: string) => {
    return estadosConfig[estado as keyof typeof estadosConfig] || estadosConfig.pendiente;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const clearFilters = () => {
    setFiltros({
      estado: '',
      sucursal: '',
      fechaDesde: '',
      fechaHasta: '',
      usuario: ''
    });
  };

  // Estadísticas rápidas
  const stats = {
    total: conciliaciones.length,
    pendientes: conciliaciones.filter(c => c.estado === 'pendiente').length,
    completadas: conciliaciones.filter(c => c.estado === 'completada').length,
    conContingencias: conciliaciones.filter(c => c.estado === 'con_contingencia').length,
    totalContingencias: conciliaciones.reduce((sum, c) => sum + c._count.contingencias, 0)
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Gestión de Conciliaciones</h1>
              <p className="text-white/80">Supervisa y administra las conciliaciones de inventario</p>
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
                href="/admin/conciliaciones/nueva" 
                className="inline-flex items-center px-4 py-2 bg-white text-[#311716] rounded-md hover:bg-gray-100 transition-colors font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Conciliación
              </Link>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
            <div className="flex items-center">
              <div className="bg-gray-100 p-2 rounded-lg">
                <FileText className="h-6 w-6 text-gray-600" />
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

          <div className="bg-white rounded-lg shadow border border-green-200 p-4">
            <div className="flex items-center">
              <div className="bg-green-100 p-2 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-green-700">Completadas</p>
                <p className="text-2xl font-bold text-green-900">{stats.completadas}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-red-200 p-4">
            <div className="flex items-center">
              <div className="bg-red-100 p-2 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-red-700">Con Contingencias</p>
                <p className="text-2xl font-bold text-red-900">{stats.conContingencias}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-orange-200 p-4">
            <div className="flex items-center">
              <div className="bg-orange-100 p-2 rounded-lg">
                <BarChart3 className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-orange-700">Contingencias</p>
                <p className="text-2xl font-bold text-orange-900">{stats.totalContingencias}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Panel de Filtros */}
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
                  <option value="completada">Completada</option>
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
                  onClick={fetchConciliaciones}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#311716] hover:bg-[#462625]"
                >
                  <Search className="h-4 w-4 mr-2" />
                  Buscar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Lista de Conciliaciones */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando conciliaciones...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : conciliaciones.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay conciliaciones</h3>
              <p className="mt-1 text-sm text-gray-500">
                Las conciliaciones aparecerán aquí cuando se generen desde las sucursales.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {conciliaciones.map((conciliacion) => {
                const estadoConfig = getEstadoConfig(conciliacion.estado);
                const IconoEstado = estadoConfig.icon;
                
                return (
                  <div key={conciliacion.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${estadoConfig.color.replace('text-', 'bg-').replace('800', '100')}`}>
                            <IconoEstado className={`h-5 w-5 ${estadoConfig.color.includes('yellow') ? 'text-yellow-600' : 
                                                                    estadoConfig.color.includes('green') ? 'text-green-600' :
                                                                    'text-red-600'}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-gray-900">
                              Conciliación #{conciliacion.id.substring(conciliacion.id.length - 8)}
                            </h3>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoConfig.color}`}>
                              {estadoConfig.label}
                            </span>
                            {conciliacion._count.contingencias > 0 && (
                              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                                {conciliacion._count.contingencias} contingencias
                              </span>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                            <div className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="font-medium">Sucursal:</span>
                              <span className="ml-1">{conciliacion.sucursal.nombre}</span>
                            </div>
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="font-medium">Responsable:</span>
                              <span className="ml-1">{conciliacion.usuario.name}</span>
                            </div>
                            <div className="flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              <span className="font-medium">Fecha:</span>
                              <span className="ml-1">{formatDate(conciliacion.fecha)}</span>
                            </div>
                          </div>
                          
                          {conciliacion.observaciones && (
                            <div className="mt-3 text-sm text-gray-600">
                              <p className="italic">"{conciliacion.observaciones}"</p>
                            </div>
                          )}

                          <div className="mt-3 text-xs text-gray-500">
                            {estadoConfig.description}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end space-y-2">
                        <div className="flex space-x-2">
                          <Link 
                            href={`/admin/conciliaciones/${conciliacion.id}`}
                            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Ver detalles
                          </Link>
                          
                          {conciliacion._count.contingencias > 0 && (
                            <Link 
                              href={`/admin/conciliaciones/${conciliacion.id}/contingencias`}
                              className="inline-flex items-center px-3 py-2 border border-orange-300 shadow-sm text-sm leading-4 font-medium rounded-md text-orange-700 bg-orange-50 hover:bg-orange-100"
                            >
                              <AlertTriangle className="h-4 w-4 mr-1" />
                              Contingencias
                            </Link>
                          )}
                        </div>
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