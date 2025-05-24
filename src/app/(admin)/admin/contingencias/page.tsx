// src/app/(admin)/admin/contingencias/page.tsx - VERSIÓN MEJORADA
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw,
  Clock,
  CheckCircle,
  Eye,
  Calendar,
  MapPin,
  User,
  BarChart3,
  Download,
  Archive,
  Bell,
  Zap,
  CheckSquare,
  Square,
  MoreVertical,
  Settings,
  TrendingUp,
  AlertCircle,
  FileText,
  Users,
  Activity
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCSelect, HCTable, HCTh, HCTd, HCInput } from '@/components/ui/HighContrastComponents';

interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  urgente: boolean;
  tipo?: string;
  ubicacion?: {
    id: string;
    nombre: string;
  };
  conciliacionId?: string;
  usuario: {
    name: string;
  };
  imagenUrl?: string;
  videoUrl?: string;
}

interface ContingenciaStats {
  total: number;
  pendientes: number;
  enRevision: number;
  resueltas: number;
  urgentes: number;
  porTipo: Record<string, number>;
  porOrigen: Record<string, number>;
  tendencia: 'subiendo' | 'bajando' | 'estable';
}

export default function ContingenciasPage() {
  const [contingencias, setContingencias] = useState<Contingencia[]>([]);
  const [selectedContingencias, setSelectedContingencias] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState({
    estado: '',
    origen: '',
    ubicacionId: '',
    tipo: '',
    urgente: '',
    fechaDesde: '',
    fechaHasta: '',
    search: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [stats, setStats] = useState<ContingenciaStats | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<{id: string; nombre: string}[]>([]);

  useEffect(() => {
    fetchContingencias();
    fetchUbicaciones();
  }, [filtros]);

  const fetchUbicaciones = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/ubicaciones');
      if (response.ok) {
        const data = await response.json();
        setUbicaciones(data);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };

  const fetchContingencias = async () => {
    try {
      setIsLoading(true);
      
      const params = new URLSearchParams();
      Object.entries(filtros).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      
      const response = await authenticatedFetch(`/api/contingencias?${params.toString()}`);
      
      if (!response.ok) throw new Error('Error al cargar contingencias');
      
      const data = await response.json();
      setContingencias(data);
      
      // Calcular estadísticas
      calculateStats(data);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar las contingencias');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (data: Contingencia[]) => {
    const stats: ContingenciaStats = {
      total: data.length,
      pendientes: data.filter(c => c.estado === 'pendiente').length,
      enRevision: data.filter(c => c.estado === 'en_revision').length,
      resueltas: data.filter(c => c.estado === 'resuelto').length,
      urgentes: data.filter(c => c.urgente).length,
      porTipo: {},
      porOrigen: {},
      tendencia: 'estable'
    };

    // Agrupar por tipo
    data.forEach(c => {
      const tipo = c.tipo || 'otros';
      stats.porTipo[tipo] = (stats.porTipo[tipo] || 0) + 1;
    });

    // Agrupar por origen
    data.forEach(c => {
      stats.porOrigen[c.origen] = (stats.porOrigen[c.origen] || 0) + 1;
    });

    setStats(stats);
  };

  const handleSelectContingencia = (id: string) => {
    setSelectedContingencias(prev => 
      prev.includes(id) 
        ? prev.filter(cId => cId !== id)
        : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedContingencias(
      selectedContingencias.length === contingencias.length 
        ? [] 
        : contingencias.map(c => c.id)
    );
  };

  const handleBatchAction = async (action: string) => {
    if (selectedContingencias.length === 0) {
      alert('Selecciona al menos una contingencia');
      return;
    }

    setIsProcessingBatch(true);
    try {
      const response = await authenticatedFetch('/api/contingencias/batch', {
        method: 'POST',
        body: JSON.stringify({
          action,
          contingenciaIds: selectedContingencias
        })
      });

      if (!response.ok) throw new Error('Error al procesar acción en lote');

      await fetchContingencias();
      setSelectedContingencias([]);
      alert(`Acción "${action}" aplicada a ${selectedContingencias.length} contingencias`);
    } catch (error) {
      console.error('Error:', error);
      alert('Error al procesar la acción en lote');
    } finally {
      setIsProcessingBatch(false);
    }
  };

  const exportContingencias = async () => {
    try {
      const response = await authenticatedFetch('/api/contingencias/export', {
        method: 'POST',
        body: JSON.stringify(filtros)
      });

      if (!response.ok) throw new Error('Error al exportar');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `contingencias_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error al exportar:', error);
      alert('Error al exportar contingencias');
    }
  };

  const getEstadoConfig = (estado: string) => {
    const configs = {
      pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      en_revision: { color: 'bg-blue-100 text-blue-800', icon: Eye, label: 'En Revisión' },
      resuelto: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Resuelto' },
      rechazado: { color: 'bg-red-100 text-red-800', icon: AlertTriangle, label: 'Rechazado' }
    };
    return configs[estado as keyof typeof configs] || configs.pendiente;
  };

  const getOrigenBadge = (origen: string) => {
    const configs = {
      fabrica: 'bg-purple-100 text-purple-800',
      sucursal: 'bg-indigo-100 text-indigo-800',
      oficina: 'bg-teal-100 text-teal-800'
    };
    return configs[origen as keyof typeof configs] || 'bg-gray-100 text-gray-800';
  };

  const clearFilters = () => {
    setFiltros({
      estado: '',
      origen: '',
      ubicacionId: '',
      tipo: '',
      urgente: '',
      fechaDesde: '',
      fechaHasta: '',
      search: ''
    });
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header con estadísticas */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold mb-2">Centro de Contingencias</h1>
              <p className="text-white/80">Gestión centralizada de incidencias y contingencias</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => setViewMode(viewMode === 'table' ? 'cards' : 'table')}
                className="inline-flex items-center px-3 py-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-white/20"
              >
                {viewMode === 'table' ? <BarChart3 className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-white/20"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </button>
              <button
                onClick={exportContingencias}
                className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-white/20"
              >
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </button>
              <Link 
                href="/admin/contingencias/nueva" 
                className="inline-flex items-center px-4 py-2 bg-white text-[#311716] rounded-md hover:bg-gray-100 font-medium"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Contingencia
              </Link>
            </div>
          </div>

          {/* Estadísticas rápidas */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
              <div className="bg-white/10 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-sm text-white/80">Total</div>
              </div>
              <div className="bg-yellow-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.pendientes}</div>
                <div className="text-sm text-white/80">Pendientes</div>
              </div>
              <div className="bg-blue-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.enRevision}</div>
                <div className="text-sm text-white/80">En Revisión</div>
              </div>
              <div className="bg-green-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.resueltas}</div>
                <div className="text-sm text-white/80">Resueltas</div>
              </div>
              <div className="bg-red-500/20 rounded-lg p-3">
                <div className="text-2xl font-bold">{stats.urgentes}</div>
                <div className="text-sm text-white/80 flex items-center">
                  <Bell className="h-3 w-3 mr-1" />
                  Urgentes
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Panel de filtros expandible */}
        {showFilters && (
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Filtros Avanzados</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <HCLabel htmlFor="search">Búsqueda</HCLabel>
                <HCInput
                  id="search"
                  type="text"
                  placeholder="Buscar por título o descripción..."
                  value={filtros.search}
                  onChange={(e) => setFiltros({...filtros, search: e.target.value})}
                />
              </div>

              <div>
                <HCLabel htmlFor="estado">Estado</HCLabel>
                <HCSelect
                  id="estado"
                  value={filtros.estado}
                  onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                >
                  <option value="">Todos los estados</option>
                  <option value="pendiente">Pendiente</option>
                  <option value="en_revision">En revisión</option>
                  <option value="resuelto">Resuelto</option>
                  <option value="rechazado">Rechazado</option>
                </HCSelect>
              </div>

              <div>
                <HCLabel htmlFor="origen">Origen</HCLabel>
                <HCSelect
                  id="origen"
                  value={filtros.origen}
                  onChange={(e) => setFiltros({...filtros, origen: e.target.value})}
                >
                  <option value="">Todos los orígenes</option>
                  <option value="fabrica">Fábrica</option>
                  <option value="sucursal">Sucursal</option>
                  <option value="oficina">Oficina</option>
                </HCSelect>
              </div>

              <div>
                <HCLabel htmlFor="urgente">Urgencia</HCLabel>
                <HCSelect
                  id="urgente"
                  value={filtros.urgente}
                  onChange={(e) => setFiltros({...filtros, urgente: e.target.value})}
                >
                  <option value="">Todas</option>
                  <option value="true">Solo urgentes</option>
                  <option value="false">No urgentes</option>
                </HCSelect>
              </div>

              <div>
                <HCLabel htmlFor="ubicacion">Ubicación</HCLabel>
                <HCSelect
                  id="ubicacion"
                  value={filtros.ubicacionId}
                  onChange={(e) => setFiltros({...filtros, ubicacionId: e.target.value})}
                >
                  <option value="">Todas las ubicaciones</option>
                  {ubicaciones.map(ubicacion => (
                    <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</option>
                  ))}
                </HCSelect>
              </div>

              <div>
                <HCLabel htmlFor="tipo">Tipo</HCLabel>
                <HCSelect
                  id="tipo"
                  value={filtros.tipo}
                  onChange={(e) => setFiltros({...filtros, tipo: e.target.value})}
                >
                  <option value="">Todos los tipos</option>
                  <option value="producto">Producto</option>
                  <option value="stock">Stock</option>
                  <option value="caja">Caja</option>
                  <option value="sistema">Sistema</option>
                  <option value="otro">Otro</option>
                </HCSelect>
              </div>

              <div>
                <HCLabel htmlFor="fechaDesde">Fecha Desde</HCLabel>
                <HCInput
                  id="fechaDesde"
                  type="date"
                  value={filtros.fechaDesde}
                  onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
                />
              </div>

              <div>
                <HCLabel htmlFor="fechaHasta">Fecha Hasta</HCLabel>
                <HCInput
                  id="fechaHasta"
                  type="date"
                  value={filtros.fechaHasta}
                  onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end mt-4 space-x-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <RefreshCw className="h-4 w-4 mr-2 inline" />
                Limpiar
              </button>
              <button
                onClick={fetchContingencias}
                className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625]"
              >
                <Search className="h-4 w-4 mr-2 inline" />
                Aplicar Filtros
              </button>
            </div>
          </div>
        )}

        {/* Acciones en lote */}
        {selectedContingencias.length > 0 && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <CheckSquare className="h-5 w-5 text-indigo-600 mr-2" />
                <span className="text-indigo-900 font-medium">
                  {selectedContingencias.length} contingencia(s) seleccionada(s)
                </span>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => handleBatchAction('marcar_revision')}
                  disabled={isProcessingBatch}
                  className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Marcar en Revisión
                </button>
                <button
                  onClick={() => handleBatchAction('marcar_urgente')}
                  disabled={isProcessingBatch}
                  className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                >
                  <Bell className="h-3 w-3 mr-1 inline" />
                  Marcar Urgente
                </button>
                <button
                  onClick={() => handleBatchAction('asignar_responsable')}
                  disabled={isProcessingBatch}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                >
                  <Users className="h-3 w-3 mr-1 inline" />
                  Asignar
                </button>
                <button
                  onClick={() => setSelectedContingencias([])}
                  className="px-3 py-1 bg-gray-500 text-white text-sm rounded hover:bg-gray-600"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Contenido principal */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando contingencias...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : contingencias.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay contingencias</h3>
              <p className="mt-1 text-sm text-gray-500">
                Las contingencias aparecerán aquí cuando se reporten incidencias.
              </p>
            </div>
          ) : viewMode === 'table' ? (
            <HCTable className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <HCTh className="w-8">
                    <input
                      type="checkbox"
                      checked={selectedContingencias.length === contingencias.length}
                      onChange={handleSelectAll}
                      className="rounded"
                    />
                  </HCTh>
                  <HCTh>Título</HCTh>
                  <HCTh>Origen</HCTh>
                  <HCTh>Ubicación</HCTh>
                  <HCTh>Estado</HCTh>
                  <HCTh>Urgencia</HCTh>
                  <HCTh>Fecha</HCTh>
                  <HCTh>Creado por</HCTh>
                  <HCTh>Acciones</HCTh>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contingencias.map((contingencia) => {
                  const estadoConfig = getEstadoConfig(contingencia.estado);
                  const IconoEstado = estadoConfig.icon;
                  
                  return (
                    <tr key={contingencia.id} className="hover:bg-gray-50">
                      <HCTd>
                        <input
                          type="checkbox"
                          checked={selectedContingencias.includes(contingencia.id)}
                          onChange={() => handleSelectContingencia(contingencia.id)}
                          className="rounded"
                        />
                      </HCTd>
                      <HCTd>
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-black">
                            {contingencia.titulo}
                            {contingencia.urgente && (
                              <Bell className="h-3 w-3 text-red-500 ml-1 inline" />
                            )}
                          </div>
                        </div>
                      </HCTd>
                      <HCTd>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrigenBadge(contingencia.origen)}`}>
                          {contingencia.origen === 'fabrica' ? 'Fábrica' : 
                           contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
                        </span>
                      </HCTd>
                      <HCTd>
                        {contingencia.ubicacion ? (
                          <span className="text-sm text-gray-900">{contingencia.ubicacion.nombre}</span>
                        ) : (
                          <span className="text-sm text-gray-500">General</span>
                        )}
                      </HCTd>
                      <HCTd>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoConfig.color}`}>
                          <IconoEstado className="h-3 w-3 mr-1" />
                          {estadoConfig.label}
                        </span>
                      </HCTd>
                      <HCTd>
                        {contingencia.urgente ? (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                            <Zap className="h-3 w-3 mr-1" />
                            Urgente
                          </span>
                        ) : (
                          <span className="text-sm text-gray-500">Normal</span>
                        )}
                      </HCTd>
                      <HCTd>
                        <div className="text-sm text-black">
                          {format(new Date(contingencia.fechaCreacion), 'dd/MM/yyyy HH:mm')}
                        </div>
                      </HCTd>
                      <HCTd>
                        <div className="text-sm text-black">{contingencia.usuario.name}</div>
                      </HCTd>
                      <HCTd>
                        <div className="flex space-x-2">
                          <Link 
                            href={`/admin/contingencias/${contingencia.id}`}
                            className="text-indigo-600 hover:text-indigo-900 text-sm"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {contingencia.conciliacionId && (
                            <Link 
                              href={`/admin/conciliaciones/${contingencia.conciliacionId}`}
                              className="text-blue-600 hover:text-blue-900 text-sm"
                              title="Ver conciliación relacionada"
                            >
                              <FileText className="h-4 w-4" />
                            </Link>
                          )}
                          {(contingencia.imagenUrl || contingencia.videoUrl) && (
                            <span className="text-green-600" title="Tiene archivos adjuntos">
                              <Activity className="h-4 w-4" />
                            </span>
                          )}
                        </div>
                      </HCTd>
                    </tr>
                  );
                })}
              </tbody>
            </HCTable>
          ) : (
            // Vista de tarjetas
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
              {contingencias.map((contingencia) => {
                const estadoConfig = getEstadoConfig(contingencia.estado);
                const IconoEstado = estadoConfig.icon;
                
                return (
                  <div key={contingencia.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedContingencias.includes(contingencia.id)}
                          onChange={() => handleSelectContingencia(contingencia.id)}
                          className="rounded mr-2"
                        />
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {contingencia.titulo}
                        </h3>
                      </div>
                      {contingencia.urgente && (
                        <Bell className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                      {contingencia.descripcion}
                    </p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <span className={`px-2 py-1 text-xs rounded-full ${estadoConfig.color}`}>
                        <IconoEstado className="h-3 w-3 mr-1 inline" />
                        {estadoConfig.label}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded-full ${getOrigenBadge(contingencia.origen)}`}>
                        {contingencia.origen}
                      </span>
                    </div>
                    
                    <div className="text-xs text-gray-500 mb-3">
                      <div>Por: {contingencia.usuario.name}</div>
                      <div>{format(new Date(contingencia.fechaCreacion), 'dd/MM/yyyy HH:mm')}</div>
                      {contingencia.ubicacion && (
                        <div>📍 {contingencia.ubicacion.nombre}</div>
                      )}
                    </div>
                    
                    <Link 
                      href={`/admin/contingencias/${contingencia.id}`}
                      className="block w-full text-center py-2 px-4 bg-indigo-600 text-white text-xs rounded hover:bg-indigo-700"
                    >
                      Ver Detalles
                    </Link>
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