'use client';

import React, { useState, useEffect } from 'react';
import { 
  Store, 
  Filter, 
  Search, 
  ShoppingCart, 
  AlertTriangle, 
  CheckCircle, 
  AlertCircle, 
  TrendingDown, 
  TrendingUp, 
  Settings,
  Package,
  RefreshCw
} from 'lucide-react';

// Tipos
interface Producto {
  id: string;
  nombre: string;
  codigoBarras?: string;
  categoria?: {
    id: string;
    nombre: string;
  };
  stockMinimo?: number;
}

interface Sucursal {
  id: string;
  nombre: string;
}

interface ConfiguracionStock {
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
}

interface AnalisisItem {
  producto: Producto;
  sucursal: Sucursal;
  stockActual: number;
  configuracion: ConfiguracionStock;
  estado: 'critico' | 'bajo' | 'normal' | 'exceso';
  porcentajeUso: string;
  tieneConfiguracion: boolean;
}

interface DashboardData {
  estadisticas: {
    criticos: number;
    bajos: number;
    normales: number;
    excesos: number;
    sinConfiguracion: number;
  };
  analisisCompleto: AnalisisItem[];
}

// Configuración de estados
const getStatusConfig = (estado: string) => {
  const configs = {
    critico: {
      icon: AlertTriangle,
      label: 'Crítico',
      bgColor: 'bg-red-50 border-red-200',
      textColor: 'text-red-700'
    },
    bajo: {
      icon: TrendingDown,
      label: 'Bajo',
      bgColor: 'bg-yellow-50 border-yellow-200',
      textColor: 'text-yellow-700'
    },
    normal: {
      icon: CheckCircle,
      label: 'Normal',
      bgColor: 'bg-green-50 border-green-200',
      textColor: 'text-green-700'
    },
    exceso: {
      icon: TrendingUp,
      label: 'Exceso',
      bgColor: 'bg-purple-50 border-purple-200',
      textColor: 'text-purple-700'
    }
  };
  return configs[estado as keyof typeof configs] || configs.normal;
};

export default function StockSucursalesPage() {
  // Estados
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoria, setSelectedCategoria] = useState('');
  
  // Estados de modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showQuickLoadModal, setShowQuickLoadModal] = useState(false);
  const [configData, setConfigData] = useState({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Simular carga de datos - reemplazar con llamadas reales a la API
      const mockDashboardData: DashboardData = {
        estadisticas: {
          criticos: 15,
          bajos: 28,
          normales: 156,
          excesos: 12,
          sinConfiguracion: 8
        },
        analisisCompleto: [
          // Datos de ejemplo - reemplazar con datos reales
          {
            producto: { id: '1', nombre: 'Producto A', codigoBarras: '1234567890' },
            sucursal: { id: '1', nombre: 'Sucursal Centro' },
            stockActual: 5,
            configuracion: { stockMaximo: 100, stockMinimo: 20, puntoReposicion: 30 },
            estado: 'critico',
            porcentajeUso: '25',
            tieneConfiguracion: true
          },
          {
            producto: { id: '2', nombre: 'Producto B', codigoBarras: '0987654321' },
            sucursal: { id: '1', nombre: 'Sucursal Centro' },
            stockActual: 45,
            configuracion: { stockMaximo: 150, stockMinimo: 15, puntoReposicion: 25 },
            estado: 'normal',
            porcentajeUso: '70',
            tieneConfiguracion: false
          }
        ]
      };

      const mockProductos: Producto[] = [
        { id: '1', nombre: 'Producto A', codigoBarras: '1234567890', stockMinimo: 20 },
        { id: '2', nombre: 'Producto B', codigoBarras: '0987654321', stockMinimo: 15 }
      ];

      const mockSucursales: Sucursal[] = [
        { id: '1', nombre: 'Sucursal Centro' },
        { id: '2', nombre: 'Sucursal Norte' }
      ];

      setDashboardData(mockDashboardData);
      setProductos(mockProductos);
      setSucursales(mockSucursales);
      
    } catch (error) {
      console.error('❌ [Stock] Error al cargar datos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Componente de indicador de sistema mejorado
  const SystemStatusIndicator = () => (
    <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-md mb-6">
      <div className="flex">
        <div className="flex-shrink-0">
          <CheckCircle className="h-5 w-5 text-green-400" />
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-green-800">Sistema Mejorado Activo</h3>
          <div className="mt-2 text-sm text-green-700">
            <ul className="list-disc list-inside space-y-1">
              <li>✅ Productos con stock sin configuración ahora son visibles</li>
              <li>✅ Configuración automática creada para nuevas cargas</li>
              <li>✅ Filtro por estado de configuración disponible</li>
              <li>✅ Botones de configuración manual añadidos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de estadísticas mejorado
  const StatsCardWithConfiguration = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
      {/* Críticos */}
      <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-pink-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Críticos</p>
              <p className="text-3xl font-black text-red-700">{dashboardData?.estadisticas?.criticos || 0}</p>
              <div className="flex items-center space-x-2 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">Requieren atención</span>
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
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Bajos</p>
              <p className="text-3xl font-black text-yellow-700">{dashboardData?.estadisticas?.bajos || 0}</p>
              <div className="flex items-center space-x-2 text-yellow-600">
                <TrendingDown className="w-4 h-4" />
                <span className="text-sm font-medium">Por debajo del mínimo</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
              <TrendingDown className="w-8 h-8 text-white" />
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
              <p className="text-3xl font-black text-green-700">{dashboardData?.estadisticas?.normales || 0}</p>
              <div className="flex items-center space-x-2 text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm font-medium">Stock óptimo</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Excesos */}
      <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Excesos</p>
              <p className="text-3xl font-black text-purple-700">{dashboardData?.estadisticas?.excesos || 0}</p>
              <div className="flex items-center space-x-2 text-purple-600">
                <TrendingUp className="w-4 h-4" />
                <span className="text-sm font-medium">Sobre el máximo</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg">
              <TrendingUp className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Sin Configuración */}
      <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Sin Configuración</p>
              <p className="text-3xl font-black text-yellow-700">{dashboardData?.estadisticas?.sinConfiguracion || 0}</p>
              <div className="flex items-center space-x-2 text-yellow-600">
                <Settings className="w-4 h-4" />
                <span className="text-sm font-medium">Configuración automática</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Total de productos */}
      <div className="group relative overflow-hidden bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
        <div className="relative p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Total</p>
              <p className="text-3xl font-black text-blue-700">{dashboardData?.analisisCompleto?.length || 0}</p>
              <div className="flex items-center space-x-2 text-blue-600">
                <Package className="w-4 h-4" />
                <span className="text-sm font-medium">Productos monitoreados</span>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
              <Package className="w-8 h-8 text-white" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Componente de filtro de estado mejorado
  const StatusFilterImproved = () => (
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
          <option value="critico">🔴 Críticos ({dashboardData?.estadisticas?.criticos || 0})</option>
          <option value="bajo">🟡 Bajos ({dashboardData?.estadisticas?.bajos || 0})</option>
          <option value="normal">🟢 Normales ({dashboardData?.estadisticas?.normales || 0})</option>
          <option value="exceso">🟣 Con exceso ({dashboardData?.estadisticas?.excesos || 0})</option>
          <option value="sin_configuracion">⚙️ Sin configuración ({dashboardData?.estadisticas?.sinConfiguracion || 0})</option>
        </select>
      </div>
    </div>
  );

  // Función de filtrado mejorada
  const filteredAnalysis = dashboardData?.analisisCompleto?.filter((item) => {
    // Filtro por estado
    if (statusFilter === 'sin_configuracion') {
      if (item.tieneConfiguracion !== false) return false;
    } else if (statusFilter !== 'todos') {
      if (item.estado !== statusFilter) return false;
    }
    
    // Filtro por búsqueda
    if (searchTerm && !item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    // Filtro por categoría
    if (selectedCategoria) {
      const producto = productos.find(p => p.id === item.producto.id);
      if (!producto?.categoria || producto.categoria.id !== selectedCategoria) {
        return false;
      }
    }
    
    return true;
  }) || [];

  // Función para crear configuración manual
  const crearConfiguracionManual = async (productoId: string, sucursalId: string) => {
    try {
      console.log('🔧 [Stock] Abriendo modal de configuración manual...');
      
      // Buscar producto y sucursal para prellenar datos
      const producto = productos.find(p => p.id === productoId);
      const sucursal = sucursales.find(s => s.id === sucursalId);
      
      if (!producto || !sucursal) {
        alert('Error: No se encontró el producto o sucursal');
        return;
      }
      
      // Obtener stock actual para calcular valores sugeridos
      const itemAnalisis = filteredAnalysis.find(
        item => item.producto.id === productoId && item.sucursal.id === sucursalId
      );
      
      const stockActual = itemAnalisis?.stockActual || 0;
      
      // Calcular valores sugeridos más inteligentes
      const stockMinimo = Math.max(producto.stockMinimo || 1, Math.ceil(stockActual * 0.2));
      const stockMaximo = Math.max(stockActual * 3, stockMinimo * 5, 50);
      const puntoReposicion = Math.ceil(stockMinimo * 1.5);
      
      // Prellenar el modal de configuración
      setConfigData({
        productoId,
        sucursalId,
        stockMaximo,
        stockMinimo,
        puntoReposicion
      });
      
      setShowConfigModal(true);
      
      console.log(`🔧 [Stock] Modal abierto para ${producto.nombre} en ${sucursal.nombre}`);
      console.log(`📊 [Stock] Valores sugeridos: Min=${stockMinimo}, Max=${stockMaximo}, Repo=${puntoReposicion}`);
      
    } catch (error) {
      console.error('❌ [Stock] Error al abrir configuración manual:', error);
      alert('Error al abrir configuración manual');
    }
  };

  // Función para abrir modal de configuración con datos prellenados
  const openConfigModal = (productoId: string, sucursalId: string) => {
    crearConfiguracionManual(productoId, sucursalId);
  };

  // Función para abrir modal de carga rápida
  const openQuickLoadModal = (productoId: string, sucursalId: string) => {
    setConfigData(prev => ({ ...prev, productoId, sucursalId }));
    setShowQuickLoadModal(true);
  };

  // Componente de fila de tabla mejorado
  const ImprovedTableRow = ({ item, index }: { item: AnalisisItem, index: number }) => {
    const statusConfig = getStatusConfig(item.estado);
    const IconComponent = statusConfig.icon;
    
    // Determinar si el producto necesita configuración
    const needsConfiguration = !item.tieneConfiguracion;
    
    return (
      <tr key={`${item.producto.id}-${item.sucursal.id}`} 
          className={`hover:bg-gradient-to-r hover:from-gray-50 hover:to-white transition-all duration-200 group ${
            needsConfiguration ? 'bg-yellow-50 border-l-4 border-l-yellow-400' : ''
          }`}>
        
        {/* Columna Producto con indicador de configuración */}
        <td className="px-8 py-6">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-gradient-to-br from-[#311716] to-[#462625] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg relative">
              {item.producto.nombre.charAt(0)}
              {needsConfiguration && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-500 rounded-full flex items-center justify-center">
                  <span className="text-xs text-white">!</span>
                </div>
              )}
            </div>
            <div>
              <div className="font-bold text-gray-900 text-lg group-hover:text-[#311716] transition-colors">
                {item.producto.nombre}
                {needsConfiguration && (
                  <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    ⚙️ Necesita configuración
                  </span>
                )}
              </div>
              {item.producto.codigoBarras && (
                <div className="text-sm text-gray-500 font-mono bg-gray-100 px-2 py-1 rounded-lg mt-1">
                  {item.producto.codigoBarras}
                </div>
              )}
            </div>
          </div>
        </td>
        
        {/* Columna Sucursal */}
        <td className="px-8 py-6">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-xl">
              <Store className="w-5 h-5 text-blue-600" />
            </div>
            <span className="font-semibold text-gray-900">{item.sucursal.nombre}</span>
          </div>
        </td>
        
        {/* Columna Stock Actual con mejor visualización */}
        <td className="px-8 py-6">
          <div className="text-3xl font-black text-gray-900">
            {item.stockActual}
          </div>
          {needsConfiguration && (
            <div className="text-xs text-yellow-600 mt-1">
              Stock actual sin límites definidos
            </div>
          )}
        </td>
        
        {/* Columna Configuración con indicador de automática */}
        <td className="px-8 py-6">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Máx:</span>
              <span className={`font-bold ${needsConfiguration ? 'text-yellow-600' : 'text-gray-900'}`}>
                {item.configuracion.stockMaximo}
                {needsConfiguration && <span className="text-xs ml-1">(auto)</span>}
              </span>
            </div>
            <div className="flex items-center space-x-2 text-sm">
              <span className="text-gray-600">Mín:</span>
              <span className={`font-bold ${needsConfiguration ? 'text-yellow-600' : 'text-orange-600'}`}>
                {item.configuracion.stockMinimo}
                {needsConfiguration && <span className="text-xs ml-1">(auto)</span>}
              </span>
            </div>
            {needsConfiguration && (
              <button
                onClick={() => crearConfiguracionManual(item.producto.id, item.sucursal.id)}
                className="text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 px-2 py-1 rounded-md transition-colors"
              >
                🔧 Configurar manualmente
              </button>
            )}
          </div>
        </td>
        
        {/* Columna Estado */}
        <td className="px-8 py-6">
          <div className={`inline-flex items-center px-4 py-2 rounded-2xl border-2 ${statusConfig.bgColor} ${statusConfig.textColor}`}>
            <IconComponent className="w-5 h-5 mr-2" />
            <span className="font-bold text-sm">{statusConfig.label}</span>
            {needsConfiguration && <span className="ml-1 text-xs">(temp)</span>}
          </div>
        </td>
        
        {/* Columna Porcentaje de Uso */}
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
        
        {/* Columna Acciones con opciones adicionales */}
        <td className="px-8 py-6 text-center">
          <div className="flex flex-col space-y-2">
            <button
              onClick={() => openQuickLoadModal(item.producto.id, item.sucursal.id)}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-semibold text-sm transition-all duration-300 hover:shadow-lg hover:scale-105 active:scale-95"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Cargar Stock
            </button>
            
            {needsConfiguration && (
              <button
                onClick={() => openConfigModal(item.producto.id, item.sucursal.id)}
                className="inline-flex items-center px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded-xl font-medium text-xs transition-all duration-200"
              >
                ⚙️ Configurar
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <RefreshCw className="w-8 h-8 text-[#eeb077] animate-spin" />
          <span className="text-xl font-semibold text-gray-700">Cargando análisis de stock...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-white p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-black text-gray-900 mb-4">
            📊 Stock por Sucursales
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Monitorea y gestiona el inventario de todos tus productos across all sucursales en tiempo real
          </p>
        </div>

        {/* Indicador de sistema mejorado (solo en desarrollo) */}
        {process.env.NODE_ENV === 'development' && <SystemStatusIndicator />}

        {/* Estadísticas mejoradas */}
        <StatsCardWithConfiguration />

        {/* Filtros */}
        <div className="bg-white rounded-3xl shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">🔍 Filtros y Búsqueda</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Búsqueda */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Buscar Producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre del producto..."
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                />
              </div>
            </div>

            {/* Filtro de Estado Mejorado */}
            <StatusFilterImproved />

            {/* Categoría */}
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">Categoría</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <select
                  value={selectedCategoria}
                  onChange={(e) => setSelectedCategoria(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all duration-200"
                >
                  <option value="">Todas las categorías</option>
                  {/* Agregar opciones de categorías dinámicamente */}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Análisis */}
        <div className="bg-white rounded-3xl shadow-lg overflow-hidden">
          <div className="px-8 py-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">
                📋 Análisis Detallado ({filteredAnalysis.length} productos)
              </h2>
              <button
                onClick={loadData}
                className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl font-semibold transition-all duration-300 hover:shadow-lg hover:scale-105"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-gray-50 to-gray-100">
                <tr>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Sucursal
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Configuración
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-8 py-6 text-left text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Utilización
                  </th>
                  <th className="px-8 py-6 text-center text-sm font-bold text-gray-900 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAnalysis.slice(0, 50).map((item, index) => (
                  <ImprovedTableRow key={`${item.producto.id}-${item.sucursal.id}`} item={item} index={index} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal de Configuración */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">⚙️ Configurar Stock</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Mínimo</label>
                  <input
                    type="number"
                    value={configData.stockMinimo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Stock Máximo</label>
                  <input
                    type="number"
                    value={configData.stockMaximo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMaximo: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Punto de Reposición</label>
                  <input
                    type="number"
                    value={configData.puntoReposicion}
                    onChange={(e) => setConfigData(prev => ({ ...prev, puntoReposicion: Number(e.target.value) }))}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Aquí iría la lógica para guardar la configuración
                    console.log('Guardando configuración:', configData);
                    setShowConfigModal(false);
                    loadData(); // Recargar datos
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-all"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Carga Rápida */}
        {showQuickLoadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full mx-4">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">📦 Carga Rápida de Stock</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cantidad a Cargar</label>
                  <input
                    type="number"
                    placeholder="Ingrese la cantidad..."
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Observaciones</label>
                  <textarea
                    placeholder="Comentarios opcionales..."
                    rows={3}
                    className="w-full px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex space-x-4 mt-8">
                <button
                  onClick={() => setShowQuickLoadModal(false)}
                  className="flex-1 px-6 py-3 bg-gray-200 text-gray-800 rounded-2xl font-semibold hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    // Aquí iría la lógica para cargar stock
                    console.log('Cargando stock...');
                    setShowQuickLoadModal(false);
                    loadData(); // Recargar datos
                  }}
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-2xl font-semibold hover:shadow-lg transition-all"
                >
                  Cargar Stock
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}