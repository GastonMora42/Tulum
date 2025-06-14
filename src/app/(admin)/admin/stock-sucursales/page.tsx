// src/app/(admin)/admin/stock-sucursales/page.tsx - DISEÑO PROFESIONAL RENOVADO
'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, Settings, Upload, Download, RefreshCw, 
  FileText, TrendingUp, Store, Package2, AlertTriangle,
  CheckCircle, Info, Plus, Filter, Search, ArrowUpRight,
  Activity, Target, Zap, Eye, Layers, PieChart, Globe
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import BulkStockUpload from '@/components/admin/BulkStockUpload';

// ✅ INTERFACES CORREGIDAS
interface Sucursal {
  id: string;
  nombre: string;
  tipo: string;
}

interface Producto {
  id: string;
  nombre: string;
  codigoBarras?: string;
}

interface DashboardData {
  estadisticas: {
    total: number;
    criticos: number;
    bajos: number;
    normales: number;
    excesos: number;
    necesitanReposicion: number;
    conExceso: number;
  };
  analisisCompleto: Array<{
    id: string;
    producto: {
      id: string;
      nombre: string;
      codigoBarras?: string;
    };
    sucursal: {
      id: string;
      nombre: string;
      tipo: string;
    };
    configuracion: {
      stockMaximo: number;
      stockMinimo: number;
      puntoReposicion: number;
    };
    stockActual: number;
    diferencia: number;
    diferenciaPorcentual: number;
    porcentajeUso: number;
    estado: string;
    prioridad: number;
    acciones: {
      necesitaReposicion: boolean;
      puedeCargar: boolean;
      cantidadSugerida: number;
      tieneExceso: boolean;
      excesoActual: number;
    };
  }>;
  resumenSucursales: any[];
  topDeficit: any[];
  topExceso: any[];
  ultimaActualizacion: Date;
}

interface ConfigData {
  productoId: string;
  sucursalId: string;
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
}

interface BulkData {
  sucursalId: string;
  nombre: string;
  descripcion: string;
  modo: string;
  items: Array<{
    nombreProducto: string;
    cantidad: number;
  }>;
}

interface BulkResult {
  resumen: {
    itemsProcesados: number;
    itemsErrores: number;
  };
}

export default function StockSucursalesPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Estados para modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkFileModal, setShowBulkFileModal] = useState(false);

  // Estados para configuración
  const [configData, setConfigData] = useState<ConfigData>({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });

  // Estados para carga masiva manual
  const [bulkData, setBulkData] = useState<BulkData>({
    sucursalId: '',
    nombre: '',
    descripcion: '',
    modo: 'incrementar',
    items: []
  });

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (view === 'dashboard') {
      loadDashboardData();
    }
  }, [selectedSucursal, view]);

  const loadInitialData = async () => {
    try {
      const [sucursalesRes, productosRes] = await Promise.all([
        authenticatedFetch('/api/admin/ubicaciones'),
        authenticatedFetch('/api/productos?limit=1000')
      ]);

      if (sucursalesRes.ok && productosRes.ok) {
        const sucursalesData = await sucursalesRes.json();
        const productosData = await productosRes.json();
        
        setSucursales(sucursalesData.filter((s: Sucursal) => s.tipo === 'sucursal'));
        setProductos(productosData.data || productosData);
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedSucursal) params.append('sucursalId', selectedSucursal);

      const response = await authenticatedFetch(`/api/admin/stock-config/dashboard?${params}`);
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error cargando dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigSave = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/stock-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(configData)
      });

      if (response.ok) {
        setShowConfigModal(false);
        setConfigData({
          productoId: '',
          sucursalId: '',
          stockMaximo: 0,
          stockMinimo: 0,
          puntoReposicion: 0
        });
        loadDashboardData();
        alert('Configuración guardada exitosamente');
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      alert('Error al guardar la configuración');
    }
  };

  const handleBulkLoad = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/stock-config/bulk-load', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(bulkData)
      });

      if (response.ok) {
        const result: BulkResult = await response.json();
        setShowBulkModal(false);
        setBulkData({
          sucursalId: '',
          nombre: '',
          descripcion: '',
          modo: 'incrementar',
          items: []
        });
        alert(`Carga completada: ${result.resumen.itemsProcesados} procesados, ${result.resumen.itemsErrores} errores`);
        loadDashboardData();
      } else {
        const errorData = await response.json();
        alert(`Error: ${errorData.error}`);
      }
    } catch (error) {
      console.error('Error en carga masiva:', error);
      alert('Error en la carga masiva');
    }
  };

  const getStatusConfig = (estado: string) => {
    switch (estado) {
      case 'critico': 
        return { 
          color: 'bg-gradient-to-r from-red-500 to-pink-500', 
          textColor: 'text-red-700',
          bgColor: 'bg-red-50 border-red-200',
          icon: AlertTriangle,
          label: 'Crítico'
        };
      case 'bajo': 
        return { 
          color: 'bg-gradient-to-r from-orange-500 to-yellow-500', 
          textColor: 'text-orange-700',
          bgColor: 'bg-orange-50 border-orange-200',
          icon: TrendingUp,
          label: 'Bajo'
        };
      case 'exceso': 
        return { 
          color: 'bg-gradient-to-r from-purple-500 to-indigo-500', 
          textColor: 'text-purple-700',
          bgColor: 'bg-purple-50 border-purple-200',
          icon: Package2,
          label: 'Exceso'
        };
      default: 
        return { 
          color: 'bg-gradient-to-r from-green-500 to-emerald-500', 
          textColor: 'text-green-700',
          bgColor: 'bg-green-50 border-green-200',
          icon: CheckCircle,
          label: 'Normal'
        };
    }
  };

  const filteredAnalysis = dashboardData?.analisisCompleto?.filter((item) => {
    if (statusFilter !== 'todos' && item.estado !== statusFilter) return false;
    if (searchTerm && !item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <ContrastEnhancer>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100">
        <div className="space-y-8 p-6">
          {/* Header Hero Section */}
          <div className="relative overflow-hidden bg-gradient-to-r from-[#311716] via-[#462625] to-[#9c7561] rounded-3xl shadow-2xl">
            <div className="absolute inset-0 bg-black/10"></div>
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-24 translate-x-24 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#eeb077]/20 rounded-full translate-y-16 -translate-x-16 blur-2xl"></div>
            
            <div className="relative z-10 px-8 py-12">
              <div className="flex flex-col lg:flex-row lg:justify-between lg:items-end">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                      <Layers className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <h1 className="text-4xl lg:text-5xl font-black text-white leading-tight">
                        Control de Stock
                      </h1>
                      <p className="text-xl text-white/80 font-medium">
                        Gestión Inteligente por Sucursales
                      </p>
                    </div>
                  </div>
                  <p className="text-white/70 text-lg max-w-2xl leading-relaxed">
                    Configuración avanzada de stocks máximos, alertas automáticas y gestión centralizada 
                    para optimizar el inventario en todas tus ubicaciones.
                  </p>
                  
                  {dashboardData && (
                    <div className="flex items-center space-x-4 pt-2">
                      <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        <Activity className="w-4 h-4 text-[#eeb077]" />
                        <span className="text-white font-medium">{dashboardData.estadisticas.total} productos configurados</span>
                      </div>
                      <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                        <Globe className="w-4 h-4 text-[#eeb077]" />
                        <span className="text-white font-medium">{sucursales.length} sucursales</span>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-wrap gap-3 mt-8 lg:mt-0">
                  <button
                    onClick={() => setView('dashboard')}
                    className={`group relative px-6 py-3 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                      view === 'dashboard' 
                        ? 'bg-white text-[#311716] shadow-xl' 
                        : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-5 h-5" />
                      <span>Dashboard</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowConfigModal(true)}
                    className="group relative px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <div className="flex items-center space-x-2">
                      <Settings className="w-5 h-5" />
                      <span>Configurar</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowBulkModal(true)}
                    className="group relative px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <div className="flex items-center space-x-2">
                      <Plus className="w-5 h-5" />
                      <span>Carga Manual</span>
                    </div>
                  </button>
                  
                  <button
                    onClick={() => setShowBulkFileModal(true)}
                    className="group relative px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
                  >
                    <div className="flex items-center space-x-2">
                      <Upload className="w-5 h-5" />
                      <span>Importar</span>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Filtros Modernos */}
          <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl shadow-xl p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Sucursal</label>
                <div className="relative">
                  <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={selectedSucursal}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Todas las sucursales</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Estado</label>
                <div className="relative">
                  <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                  >
                    <option value="todos">Todos los estados</option>
                    <option value="critico">Críticos</option>
                    <option value="bajo">Bajos</option>
                    <option value="normal">Normales</option>
                    <option value="exceso">Con exceso</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Buscar Productos</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Buscar productos..."
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                  />
                </div>
              </div>

              <div className="flex items-end">
                <button
                  onClick={loadDashboardData}
                  className="w-full group relative px-6 py-3 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                    <span>Actualizar</span>
                  </div>
                </button>
              </div>

              <div className="flex items-end">
                <button
                  onClick={() => {/* Función de exportar */}}
                  className="w-full group relative px-6 py-3 bg-gradient-to-r from-[#9c7561] to-[#eeb077] text-white rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
                >
                  <div className="flex items-center justify-center space-x-2">
                    <Download className="w-5 h-5" />
                    <span>Exportar</span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Estadísticas Modernizadas */}
          {dashboardData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {/* Total */}
              <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total Configurados</p>
                      <p className="text-3xl font-black text-gray-900">{dashboardData.estadisticas.total}</p>
                      <div className="flex items-center space-x-2 text-blue-600">
                        <PieChart className="w-4 h-4" />
                        <span className="text-sm font-medium">Productos activos</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                      <Package2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Críticos */}
              <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Críticos</p>
                      <p className="text-3xl font-black text-red-700">{dashboardData.estadisticas.criticos}</p>
                      <div className="flex items-center space-x-2 text-red-600">
                        <Zap className="w-4 h-4" />
                        <span className="text-sm font-medium">Acción inmediata</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-red-500 to-pink-500 rounded-2xl shadow-lg">
                      <AlertTriangle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Bajos */}
              <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-yellow-500/5"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Stock Bajo</p>
                      <p className="text-3xl font-black text-orange-700">{dashboardData.estadisticas.bajos}</p>
                      <div className="flex items-center space-x-2 text-orange-600">
                        <TrendingUp className="w-4 h-4" />
                        <span className="text-sm font-medium">Requiere atención</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-orange-500 to-yellow-500 rounded-2xl shadow-lg">
                      <TrendingUp className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Normales */}
              <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Normales</p>
                      <p className="text-3xl font-black text-green-700">{dashboardData.estadisticas.normales}</p>
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Estado óptimo</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
                      <CheckCircle className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Con Exceso */}
              <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5"></div>
                <div className="relative p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Con Exceso</p>
                      <p className="text-3xl font-black text-purple-700">{dashboardData.estadisticas.excesos}</p>
                      <div className="flex items-center space-x-2 text-purple-600">
                        <Target className="w-4 h-4" />
                        <span className="text-sm font-medium">Redistribuir</span>
                      </div>
                    </div>
                    <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg">
                      <Package2 className="w-8 h-8 text-white" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tabla Moderna */}
          {dashboardData && (
            <div className="bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
              <div className="bg-gradient-to-r from-gray-50 to-white px-8 py-6 border-b border-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900">
                      Análisis Detallado
                    </h3>
                    <p className="text-gray-600 mt-1">
                      {filteredAnalysis.length} productos • Última actualización hace 5 min
                    </p>
                  </div>
                  <button className="group flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-all duration-200">
                    <Eye className="w-4 h-4 text-gray-600" />
                    <span className="text-gray-700 font-medium">Ver todo</span>
                    <ArrowUpRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Producto
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Sucursal
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Stock Actual
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Configuración
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Estado
                      </th>
                      <th className="px-8 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                        Progreso
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAnalysis.slice(0, 50).map((item, index) => {
                      const statusConfig = getStatusConfig(item.estado);
                      const IconComponent = statusConfig.icon;
                      
                      return (
                        <tr key={`${item.producto.id}-${item.sucursal.id}`} 
                            className="hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 group">
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-[#311716] to-[#462625] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {item.producto.nombre.charAt(0)}
                              </div>
                              <div>
                                <div className="font-bold text-gray-900 text-lg group-hover:text-[#311716] transition-colors">
                                  {item.producto.nombre}
                                </div>
                                {item.producto.codigoBarras && (
                                  <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg mt-1">
                                    {item.producto.codigoBarras}
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center space-x-3">
                              <div className="p-2 bg-blue-100 rounded-xl">
                                <Store className="w-5 h-5 text-blue-600" />
                              </div>
                              <span className="font-semibold text-gray-900">{item.sucursal.nombre}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-3xl font-black text-gray-900">
                              {item.stockActual}
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2">
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600">Máx:</span>
                                <span className="font-bold text-gray-900">{item.configuracion.stockMaximo}</span>
                              </div>
                              <div className="flex items-center space-x-2 text-sm">
                                <span className="text-gray-600">Mín:</span>
                                <span className="font-bold text-orange-600">{item.configuracion.stockMinimo}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className={`inline-flex items-center px-4 py-2 rounded-2xl border-2 ${statusConfig.bgColor} ${statusConfig.textColor}`}>
                              <IconComponent className="w-5 h-5 mr-2" />
                              <span className="font-bold text-sm">{statusConfig.label}</span>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600 font-medium">Utilización</span>
                                <span className="text-sm font-bold text-gray-900">{item.porcentajeUso}%</span>
                              </div>
                              <div className="w-32 bg-gray-200 rounded-full h-3 overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-500 ${
                                    Number(item.porcentajeUso) <= 30 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                                    Number(item.porcentajeUso) <= 70 ? 'bg-gradient-to-r from-yellow-500 to-orange-500' :
                                    Number(item.porcentajeUso) <= 100 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 
                                    'bg-gradient-to-r from-purple-500 to-indigo-500'
                                  }`}
                                  style={{ width: `${Math.min(100, Number(item.porcentajeUso))}%` }}
                                ></div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loading State Moderno */}
          {loading && (
            <div className="flex items-center justify-center h-96">
              <div className="relative">
                <div className="w-20 h-20 border-4 border-[#eeb077]/20 rounded-full"></div>
                <div className="absolute top-0 left-0 w-20 h-20 border-4 border-[#eeb077] border-t-transparent rounded-full animate-spin"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <Package2 className="w-8 h-8 text-[#311716] animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {/* Modales mejorados conservando la funcionalidad original */}
          {showConfigModal && (
            <ModernConfigModal
              configData={configData}
              setConfigData={setConfigData}
              productos={productos}
              sucursales={sucursales}
              onSave={handleConfigSave}
              onClose={() => setShowConfigModal(false)}
            />
          )}

          {showBulkModal && (
            <ModernBulkModal
              bulkData={bulkData}
              setBulkData={setBulkData}
              sucursales={sucursales}
              onSave={handleBulkLoad}
              onClose={() => setShowBulkModal(false)}
            />
          )}

          {showBulkFileModal && (
            <BulkStockUpload
              sucursales={sucursales}
              onSuccess={() => {
                loadDashboardData();
              }}
              onClose={() => setShowBulkFileModal(false)}
            />
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}

// ✅ MODALES MODERNIZADOS

interface ModernConfigModalProps {
  configData: ConfigData;
  setConfigData: (data: ConfigData) => void;
  productos: Producto[];
  sucursales: Sucursal[];
  onSave: () => void;
  onClose: () => void;
}

const ModernConfigModal = ({ configData, setConfigData, productos, sucursales, onSave, onClose }: ModernConfigModalProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <div className="bg-gradient-to-r from-[#311716] to-[#462625] p-8 text-white">
        <h3 className="text-2xl font-bold mb-2">Configurar Stock por Sucursal</h3>
        <p className="text-white/80">Define los límites de stock para un producto específico</p>
      </div>
      
      <div className="p-8 space-y-6 overflow-y-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Producto</label>
            <div className="relative">
              <Package2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={configData.productoId}
                onChange={(e) => setConfigData({...configData, productoId: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                disabled={!!configData.productoId}
              >
                <option value="">Seleccionar producto</option>
                {productos.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Sucursal</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={configData.sucursalId}
                onChange={(e) => setConfigData({...configData, sucursalId: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                disabled={!!configData.sucursalId}
              >
                <option value="">Seleccionar sucursal</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Stock Máximo</label>
            <input
              type="number"
              value={configData.stockMaximo}
              onChange={(e) => setConfigData({...configData, stockMaximo: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
              min="0"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Stock Mínimo</label>
            <input
              type="number"
              value={configData.stockMinimo}
              onChange={(e) => setConfigData({...configData, stockMinimo: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
              min="0"
              placeholder="0"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Punto de Reposición</label>
            <input
              type="number"
              value={configData.puntoReposicion}
              onChange={(e) => setConfigData({...configData, puntoReposicion: parseFloat(e.target.value) || 0})}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
              min="0"
              placeholder="0"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 p-8 bg-gray-50">
        <button
          onClick={onClose}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-all duration-200"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-6 py-3 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl font-semibold hover:shadow-lg transition-all duration-200"
          disabled={!configData.productoId || !configData.sucursalId}
        >
          Guardar Configuración
        </button>
      </div>
    </div>
  </div>
);

interface ModernBulkModalProps {
  bulkData: BulkData;
  setBulkData: (data: BulkData) => void;
  sucursales: Sucursal[];
  onSave: () => void;
  onClose: () => void;
}

const ModernBulkModal = ({ bulkData, setBulkData, sucursales, onSave, onClose }: ModernBulkModalProps) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-8 text-white">
        <h3 className="text-2xl font-bold mb-2">Carga Masiva Manual</h3>
        <p className="text-white/80">Actualiza múltiples productos de forma simultánea</p>
      </div>
      
      <div className="p-8 space-y-6 overflow-y-auto max-h-[calc(90vh-200px)]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Sucursal</label>
            <div className="relative">
              <Store className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <select
                value={bulkData.sucursalId}
                onChange={(e) => setBulkData({...bulkData, sucursalId: e.target.value})}
                className="w-full pl-10 pr-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Seleccionar sucursal</option>
                {sucursales.map((s) => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Modo de Carga</label>
            <select
              value={bulkData.modo}
              onChange={(e) => setBulkData({...bulkData, modo: e.target.value})}
              className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            >
              <option value="incrementar">Incrementar stock existente</option>
              <option value="establecer">Establecer stock exacto</option>
              <option value="decrementar">Decrementar stock</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Nombre de la carga</label>
          <input
            type="text"
            value={bulkData.nombre}
            onChange={(e) => setBulkData({...bulkData, nombre: e.target.value})}
            className="w-full px-4 py-3 bg-white border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            placeholder="Ej: Reposición mensual enero 2025"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-gray-700">Items a cargar</label>
          <div className="border-2 border-gray-200 rounded-2xl p-4 bg-gray-50 space-y-3 max-h-64 overflow-y-auto">
            {bulkData.items.map((item, index) => (
              <div key={index} className="flex items-center space-x-3 bg-white p-4 rounded-2xl shadow-sm">
                <input
                  type="text"
                  value={item.nombreProducto || ''}
                  onChange={(e) => {
                    const newItems = [...bulkData.items];
                    newItems[index] = {...newItems[index], nombreProducto: e.target.value};
                    setBulkData({...bulkData, items: newItems});
                  }}
                  placeholder="Nombre del producto"
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <input
                  type="number"
                  value={item.cantidad || ''}
                  onChange={(e) => {
                    const newItems = [...bulkData.items];
                    newItems[index] = {...newItems[index], cantidad: parseFloat(e.target.value) || 0};
                    setBulkData({...bulkData, items: newItems});
                  }}
                  placeholder="Cantidad"
                  className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  min="0"
                />
                <button
                  onClick={() => {
                    const newItems = bulkData.items.filter((_, i) => i !== index);
                    setBulkData({...bulkData, items: newItems});
                  }}
                  className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
            
            <button
              onClick={() => {
                setBulkData({
                  ...bulkData, 
                  items: [...bulkData.items, { nombreProducto: '', cantidad: 0 }]
                });
              }}
              className="w-full border-2 border-dashed border-gray-300 rounded-2xl p-4 text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200"
            >
              + Agregar item
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4 p-8 bg-gray-50">
        <button
          onClick={onClose}
          className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-2xl font-semibold hover:bg-gray-100 transition-all duration-200"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl font-semibold hover:shadow-lg transition-all duration-200"
          disabled={!bulkData.sucursalId || bulkData.items.length === 0}
        >
          Cargar Stock
        </button>
      </div>
    </div>
  </div>
);