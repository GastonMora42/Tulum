// src/app/(admin)/admin/cierres/page.tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  Settings, PiggyBank, History, Trash2, Filter, Download, 
  Search, Calendar, MapPin, User, TrendingUp, AlertCircle,
  CheckCircle, Clock, DollarSign, Edit3, Save, X, Plus,
  Eye, BarChart3, RefreshCw
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ConfiguracionCierre {
  id: string;
  sucursalId: string;
  montoFijo: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  sucursal: { nombre: string };
  usuario: { name: string; email: string };
}

interface CierreHistorial {
  id: string;
  sucursalId: string;
  fechaApertura: string;
  fechaCierre: string;
  montoInicial: number;
  montoFinal: number;
  diferencia: number;
  estado: string;
  totalEgresos: number;
  recuperoFondo: number;
  montoFijoReferencia: number;
  requiereRecuperoProximo: boolean;
  alertaMontoInsuficiente: string | null;
  esCierreConDiferencias: boolean;
  razonCierreForzado: string | null;
  observaciones: string | null;
  sucursal: { nombre: string };
  usuarioApertura: { name: string; email: string };
  usuarioCierre: { name: string; email: string } | null;
  estadisticas: {
    totalVentas: number;
    ventasEfectivo: number;
    cantidadVentas: number;
    totalEgresos: number;
    duracionTurno: number | null;
  };
}

export default function AdminCierresPage() {
  const [activeTab, setActiveTab] = useState<'configuracion' | 'historial'>('configuracion');
  
  // Estados para configuración
  const [configuraciones, setConfiguraciones] = useState<ConfiguracionCierre[]>([]);
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [editingConfig, setEditingConfig] = useState<string | null>(null);
  const [tempMontoFijo, setTempMontoFijo] = useState<string>('');
  
  // Estados para historial
  const [historialCierres, setHistorialCierres] = useState<CierreHistorial[]>([]);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any>(null);
  const [selectedCierres, setSelectedCierres] = useState<Set<string>>(new Set());
  
  // Estados de filtros
  const [filtros, setFiltros] = useState({
    sucursalId: '',
    estado: '',
    fechaDesde: '',
    fechaHasta: '',
    usuarioId: ''
  });
  
  // Estados de paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 20;
  
  // Estados de UI
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setSaving] = useState(false);
  const [notification, setNotification] = useState<any>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Cargar configuraciones
  const loadConfiguraciones = async () => {
    try {
      const [responseConfig, responseSucursales] = await Promise.all([
        authenticatedFetch('/api/admin/configuracion-cierres'),
        authenticatedFetch('/api/admin/ubicaciones?tipo=sucursal')
      ]);
      
      if (responseConfig.ok && responseSucursales.ok) {
        const dataConfig = await responseConfig.json();
        const dataSucursales = await responseSucursales.json();
        
        setConfiguraciones(dataConfig);
        setSucursales(dataSucursales);
      }
    } catch (error) {
      console.error('Error al cargar configuraciones:', error);
      setNotification({
        type: 'error',
        message: 'Error al cargar configuraciones'
      });
    }
  };
  
  // Cargar historial de cierres
  const loadHistorialCierres = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
        ...Object.fromEntries(Object.entries(filtros).filter(([_, v]) => v))
      });
      
      const response = await authenticatedFetch(`/api/admin/historial-cierres?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setHistorialCierres(data.data);
        setEstadisticasGenerales(data.estadisticas);
        setTotalPages(data.pagination.totalPages);
      }
    } catch (error) {
      console.error('Error al cargar historial:', error);
      setNotification({
        type: 'error',
        message: 'Error al cargar historial de cierres'
      });
    }
  };
  
  // Efecto para cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await loadConfiguraciones();
      if (activeTab === 'historial') {
        await loadHistorialCierres();
      }
      setIsLoading(false);
    };
    
    loadData();
  }, [activeTab]);
  
  // Efecto para recargar historial cuando cambian filtros o página
  useEffect(() => {
    if (activeTab === 'historial') {
      loadHistorialCierres();
    }
  }, [filtros, currentPage]);
  
  // Guardar configuración
  const saveConfiguracion = async (sucursalId: string, montoFijo: number) => {
    try {
      setSaving(true);
      
      const response = await authenticatedFetch('/api/admin/configuracion-cierres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursalId, montoFijo })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        setNotification({
          type: 'success',
          message: 'Configuración guardada correctamente'
        });
        
        await loadConfiguraciones();
        setEditingConfig(null);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      console.error('Error al guardar configuración:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al guardar configuración'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Eliminar cierres seleccionados
  const eliminarCierresSeleccionados = async () => {
    if (selectedCierres.size === 0) return;
    
    const confirmacion = confirm(
      `¿Estás seguro de eliminar ${selectedCierres.size} cierre(s)? Esta acción no se puede deshacer.`
    );
    
    if (!confirmacion) return;
    
    try {
      setSaving(true);
      
      const response = await authenticatedFetch('/api/admin/historial-cierres', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cierreIds: Array.from(selectedCierres) })
      });
      
      if (response.ok) {
        const data = await response.json();
        
        setNotification({
          type: 'success',
          message: data.message
        });
        
        setSelectedCierres(new Set());
        await loadHistorialCierres();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error);
      }
    } catch (error) {
      console.error('Error al eliminar cierres:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al eliminar cierres'
      });
    } finally {
      setSaving(false);
    }
  };
  
  // Manejar selección de cierres
  const toggleCierreSelection = (cierreId: string) => {
    const newSelection = new Set(selectedCierres);
    if (newSelection.has(cierreId)) {
      newSelection.delete(cierreId);
    } else {
      newSelection.add(cierreId);
    }
    setSelectedCierres(newSelection);
  };
  
  const selectAllCierres = () => {
    if (selectedCierres.size === historialCierres.length) {
      setSelectedCierres(new Set());
    } else {
      setSelectedCierres(new Set(historialCierres.map(c => c.id)));
    }
  };
  
  // Configuraciones organizadas por sucursal
  const configuracionesPorSucursal = useMemo(() => {
    const configs = new Map();
    
    // Primero agregar sucursales existentes con configuración
    configuraciones.forEach(config => {
      configs.set(config.sucursalId, config);
    });
    
    // Luego agregar sucursales sin configuración
    sucursales.forEach(sucursal => {
      if (!configs.has(sucursal.id)) {
        configs.set(sucursal.id, {
          id: null,
          sucursalId: sucursal.id,
          montoFijo: 10000,
          activo: true,
          sucursal: { nombre: sucursal.nombre },
          usuario: null,
          createdAt: null,
          updatedAt: null
        });
      }
    });
    
    return Array.from(configs.values());
  }, [configuraciones, sucursales]);
  
  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center">
            <PiggyBank className="w-8 h-8 text-blue-600 mr-3" />
            Gestión de Cierres
          </h1>
          <p className="text-gray-600 mt-2">
            Configura montos fijos por sucursal y revisa el historial de cierres de caja
          </p>
        </div>
      </div>
      
      {/* Notificaciones */}
      {notification && (
        <div className={`mb-6 p-4 rounded-lg border ${
          notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
          notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
          'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center justify-between">
            <p className="font-medium">{notification.message}</p>
            <button
              onClick={() => setNotification(null)}
              className="ml-4 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
      
      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            <button
              onClick={() => setActiveTab('configuracion')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'configuracion'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Settings className="w-5 h-5 inline mr-2" />
              Configuración de Montos
            </button>
            <button
              onClick={() => setActiveTab('historial')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'historial'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <History className="w-5 h-5 inline mr-2" />
              Historial de Cierres
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mr-3" />
              <span className="text-lg text-gray-600">Cargando...</span>
            </div>
          ) : activeTab === 'configuracion' ? (
            /* TAB CONFIGURACIÓN */
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Montos Fijos por Sucursal
                </h2>
                <p className="text-gray-600">
                  Define el monto fijo de referencia para cada sucursal. Este monto se usa para determinar 
                  cuándo se requiere recupero de fondo y generar alertas.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {configuracionesPorSucursal.map((config) => (
                  <div key={config.sucursalId} className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-900">
                        {config.sucursal?.nombre}
                      </h3>
                      <button
                        onClick={() => {
                          setEditingConfig(config.sucursalId);
                          setTempMontoFijo(config.montoFijo.toString());
                        }}
                        className="p-1 text-gray-500 hover:text-blue-600 rounded"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                    </div>
                    
                    {editingConfig === config.sucursalId ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Monto Fijo
                          </label>
                          <div className="relative">
                            <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                            <input
                              type="number"
                              step="0.01"
                              value={tempMontoFijo}
                              onChange={(e) => setTempMontoFijo(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="10000.00"
                            />
                          </div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <button
                            onClick={() => saveConfiguracion(config.sucursalId, parseFloat(tempMontoFijo))}
                            disabled={isSaving}
                            className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                          >
                            {isSaving ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 mr-1" />
                            )}
                            <span className="text-sm">Guardar</span>
                          </button>
                          <button
                            onClick={() => setEditingConfig(null)}
                            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="text-3xl font-bold text-blue-600 mb-2">
                          ${config.montoFijo.toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 space-y-1">
                          {config.createdAt ? (
                            <>
                              <p>Configurado por: {config.usuario?.name}</p>
                              <p>Última actualización: {format(new Date(config.updatedAt), 'dd/MM/yyyy HH:mm')}</p>
                            </>
                          ) : (
                            <p className="text-orange-600">Usando valor por defecto</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* TAB HISTORIAL */
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    Historial de Cierres
                  </h2>
                  <p className="text-gray-600">
                    Revisa todos los cierres de caja realizados y gestiona los registros históricos
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center"
                  >
                    <Filter className="w-4 h-4 mr-2" />
                    Filtros
                  </button>
                  
                  {selectedCierres.size > 0 && (
                    <button
                      onClick={eliminarCierresSeleccionados}
                      disabled={isSaving}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center"
                    >
                      {isSaving ? (
                        <RefreshCw className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-2" />
                      )}
                      Eliminar ({selectedCierres.size})
                    </button>
                  )}
                </div>
              </div>
              
              {/* Estadísticas Generales */}
              {estadisticasGenerales && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <BarChart3 className="w-8 h-8 text-blue-600 mr-3" />
                      <div>
                        <p className="text-sm text-blue-600 font-medium">Total Cierres</p>
                        <p className="text-2xl font-bold text-blue-900">{estadisticasGenerales.totalCierres}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-green-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <TrendingUp className="w-8 h-8 text-green-600 mr-3" />
                      <div>
                        <p className="text-sm text-green-600 font-medium">Promedio Final</p>
                        <p className="text-2xl font-bold text-green-900">
                          ${estadisticasGenerales.promedioMontoFinal?.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-red-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="w-8 h-8 text-red-600 mr-3" />
                      <div>
                        <p className="text-sm text-red-600 font-medium">Total Egresos</p>
                        <p className="text-2xl font-bold text-red-900">
                          ${estadisticasGenerales.totalEgresos?.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <div className="flex items-center">
                      <RefreshCw className="w-8 h-8 text-yellow-600 mr-3" />
                      <div>
                        <p className="text-sm text-yellow-600 font-medium">Total Recuperos</p>
                        <p className="text-2xl font-bold text-yellow-900">
                          ${estadisticasGenerales.totalRecuperos?.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Filtros */}
              {showFilters && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sucursal
                      </label>
                      <select
                        value={filtros.sucursalId}
                        onChange={(e) => setFiltros({...filtros, sucursalId: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Todas</option>
                        {sucursales.map(sucursal => (
                          <option key={sucursal.id} value={sucursal.id}>
                            {sucursal.nombre}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={filtros.estado}
                        onChange={(e) => setFiltros({...filtros, estado: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Todos</option>
                        <option value="cerrado">Cerrado</option>
                        <option value="con_contingencia">Con Contingencia</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Desde
                      </label>
                      <input
                        type="date"
                        value={filtros.fechaDesde}
                        onChange={(e) => setFiltros({...filtros, fechaDesde: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha Hasta
                      </label>
                      <input
                        type="date"
                        value={filtros.fechaHasta}
                        onChange={(e) => setFiltros({...filtros, fechaHasta: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div className="flex items-end">
                      <button
                        onClick={() => setFiltros({ sucursalId: '', estado: '', fechaDesde: '', fechaHasta: '', usuarioId: '' })}
                        className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Tabla de Historial */}
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedCierres.size === historialCierres.length && historialCierres.length > 0}
                            onChange={selectAllCierres}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Sucursal
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Duración
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Montos
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Ventas
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Usuario
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {historialCierres.map((cierre) => (
                        <tr key={cierre.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <input
                              type="checkbox"
                              checked={selectedCierres.has(cierre.id)}
                              onChange={() => toggleCierreSelection(cierre.id)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">
                                {cierre.sucursal?.nombre}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {format(new Date(cierre.fechaCierre), 'dd/MM/yyyy')}
                            </div>
                            <div className="text-sm text-gray-500">
                              {format(new Date(cierre.fechaCierre), 'HH:mm')}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">
                                {cierre.estadisticas.duracionTurno ? 
                                  `${cierre.estadisticas.duracionTurno}h` : 
                                  'N/A'
                                }
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900">
                                Inicial: ${cierre.montoInicial.toFixed(2)}
                              </div>
                              <div className="text-gray-900">
                                Final: ${cierre.montoFinal?.toFixed(2)}
                              </div>
                              {cierre.diferencia !== 0 && (
                                <div className={`${cierre.diferencia > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  Dif: ${Math.abs(cierre.diferencia).toFixed(2)}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900">
                                ${cierre.estadisticas.totalVentas.toFixed(2)}
                              </div>
                              <div className="text-gray-500">
                                {cierre.estadisticas.cantidadVentas} ventas
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center space-x-2">
                              {cierre.estado === 'cerrado' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                                  Cerrado
                                </span>
                              ) : cierre.estado === 'con_contingencia' ? (
                                <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                                  Con Contingencia
                                </span>
                              ) : (
                                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                                  {cierre.estado}
                                </span>
                              )}
                              
                              {cierre.esCierreConDiferencias && (
                                <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                  Forzado
                                </span>
                              )}
                              
                              {cierre.requiereRecuperoProximo && (
                                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                                  Recupero
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm">
                              <div className="text-gray-900">
                                {cierre.usuarioCierre?.name || 'N/A'}
                              </div>
                              <div className="text-gray-500">
                                Abrió: {cierre.usuarioApertura?.name}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Paginación */}
                <div className="bg-white px-6 py-3 border-t border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-700">
                    Mostrando {historialCierres.length} de {totalPages * itemsPerPage} resultados
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-gray-300 text-sm rounded-lg disabled:opacity-50"
                    >
                      Anterior
                    </button>
                    <span className="px-3 py-1 text-sm">
                      Página {currentPage} de {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border border-gray-300 text-sm rounded-lg disabled:opacity-50"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}