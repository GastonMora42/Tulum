// src/app/(admin)/admin/gestion-stock-sucursales/page.tsx - CORREGIDA
import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, TrendingDown, AlertTriangle, CheckCircle, 
  Settings, Upload, Download, RefreshCw, Plus, Search,
  BarChart3, Package, Store, Filter, Eye, Edit, Trash2,
  FileSpreadsheet, Info, Target, Minus
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

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
  };
  analisisCompleto: Array<{
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
    stockActual: number;
    configuracion: {
      stockMaximo: number;
      stockMinimo: number;
      puntoReposicion: number;
    };
    diferencia: number;
    estado: string;
    porcentajeUso: number;
    acciones: {
      necesitaReposicion: boolean;
      cantidadSugerida: number;
    };
  }>;
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

const StockDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Estados para configuración
  const [configModal, setConfigModal] = useState(false);
  const [configData, setConfigData] = useState<ConfigData>({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });

  // Estados para carga masiva
  const [bulkModal, setBulkModal] = useState(false);
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
        setConfigModal(false);
        setConfigData({
          productoId: '',
          sucursalId: '',
          stockMaximo: 0,
          stockMinimo: 0,
          puntoReposicion: 0
        });
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
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
        setBulkModal(false);
        setBulkData({
          sucursalId: '',
          nombre: '',
          descripcion: '',
          modo: 'incrementar',
          items: []
        });
        alert(`Carga completada: ${result.resumen.itemsProcesados} procesados, ${result.resumen.itemsErrores} errores`);
        loadDashboardData();
      }
    } catch (error) {
      console.error('Error en carga masiva:', error);
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'critico': return 'text-red-600 bg-red-100';
      case 'bajo': return 'text-orange-600 bg-orange-100';
      case 'exceso': return 'text-purple-600 bg-purple-100';
      default: return 'text-green-600 bg-green-100';
    }
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'critico': return <AlertTriangle className="w-4 h-4" />;
      case 'bajo': return <TrendingDown className="w-4 h-4" />;
      case 'exceso': return <TrendingUp className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestión de Stock por Sucursales</h1>
          <p className="text-gray-600">Configuración de stocks máximos y gestión por ubicación</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setView('dashboard')}
            className={`px-4 py-2 rounded-lg ${view === 'dashboard' ? 'bg-blue-600 text-white' : 'bg-gray-100'}`}
          >
            <BarChart3 className="w-4 h-4 mr-2 inline" />
            Dashboard
          </button>
          <button
            onClick={() => setConfigModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <Settings className="w-4 h-4 mr-2 inline" />
            Configurar Stock
          </button>
          <button
            onClick={() => setBulkModal(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            <Upload className="w-4 h-4 mr-2 inline" />
            Carga Masiva
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
            <select
              value={selectedSucursal}
              onChange={(e) => setSelectedSucursal(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Todas las sucursales</option>
              {sucursales.map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos los estados</option>
              <option value="critico">Críticos</option>
              <option value="bajo">Bajos</option>
              <option value="normal">Normales</option>
              <option value="exceso">Con exceso</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
          </div>

          <div className="flex items-end">
            <button
              onClick={loadDashboardData}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <RefreshCw className="w-4 h-4 mr-2 inline" />
              Actualizar
            </button>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Configurados</p>
                <p className="text-2xl font-bold text-gray-900">{dashboardData.estadisticas.total}</p>
              </div>
              <Package className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Críticos</p>
                <p className="text-2xl font-bold text-red-600">{dashboardData.estadisticas.criticos}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600">Bajos</p>
                <p className="text-2xl font-bold text-orange-600">{dashboardData.estadisticas.bajos}</p>
              </div>
              <TrendingDown className="w-8 h-8 text-orange-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Normales</p>
                <p className="text-2xl font-bold text-green-600">{dashboardData.estadisticas.normales}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Con Exceso</p>
                <p className="text-2xl font-bold text-purple-600">{dashboardData.estadisticas.excesos}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Tabla de análisis de stock */}
      {dashboardData && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Análisis Detallado de Stock</h3>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Actual</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stock Máximo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Diferencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">% Uso</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {dashboardData.analisisCompleto
                  .filter(item => {
                    if (statusFilter !== 'todos' && item.estado !== statusFilter) return false;
                    if (searchTerm && !item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                    return true;
                  })
                  .slice(0, 50)
                  .map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-gray-900">{item.producto.nombre}</div>
                          {item.producto.codigoBarras && (
                            <div className="text-sm text-gray-500">{item.producto.codigoBarras}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Store className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="text-sm text-gray-900">{item.sucursal.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-gray-900">{item.stockActual}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-600">{item.configuracion.stockMaximo}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.diferencia > 0 ? (
                            <Minus className="w-4 h-4 text-red-500 mr-1" />
                          ) : (
                            <Plus className="w-4 h-4 text-green-500 mr-1" />
                          )}
                          <span className={`font-medium ${item.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {Math.abs(item.diferencia)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.estado)}`}>
                          {getStatusIcon(item.estado)}
                          <span className="ml-1">{item.estado}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                item.porcentajeUso <= 30 ? 'bg-red-500' :
                                item.porcentajeUso <= 70 ? 'bg-yellow-500' :
                                item.porcentajeUso <= 100 ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min(100, item.porcentajeUso)}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-gray-600">{item.porcentajeUso}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex space-x-2">
                          {item.acciones.necesitaReposicion && (
                            <button
                              className="text-orange-600 hover:text-orange-800"
                              title={`Reponer ${item.acciones.cantidadSugerida} unidades`}
                            >
                              <Target className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setConfigData({
                                productoId: item.producto.id,
                                sucursalId: item.sucursal.id,
                                stockMaximo: item.configuracion.stockMaximo,
                                stockMinimo: item.configuracion.stockMinimo,
                                puntoReposicion: item.configuracion.puntoReposicion
                              });
                              setConfigModal(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de Configuración */}
      {configModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Configurar Stock</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                <select
                  value={configData.productoId}
                  onChange={(e) => setConfigData({...configData, productoId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!!configData.productoId}
                >
                  <option value="">Seleccionar producto</option>
                  {productos.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                <select
                  value={configData.sucursalId}
                  onChange={(e) => setConfigData({...configData, sucursalId: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!!configData.sucursalId}
                >
                  <option value="">Seleccionar sucursal</option>
                  {sucursales.map(s => (
                    <option key={s.id} value={s.id}>{s.nombre}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
                <input
                  type="number"
                  value={configData.stockMaximo}
                  onChange={(e) => setConfigData({...configData, stockMaximo: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                <input
                  type="number"
                  value={configData.stockMinimo}
                  onChange={(e) => setConfigData({...configData, stockMinimo: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Punto de Reposición</label>
                <input
                  type="number"
                  value={configData.puntoReposicion}
                  onChange={(e) => setConfigData({...configData, puntoReposicion: parseFloat(e.target.value) || 0})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  min="0"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setConfigModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfigSave}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={!configData.productoId || !configData.sucursalId}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Carga Masiva */}
      {bulkModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-medium mb-4">Carga Masiva de Stock</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                  <select
                    value={bulkData.sucursalId}
                    onChange={(e) => setBulkData({...bulkData, sucursalId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Seleccionar sucursal</option>
                    {sucursales.map(s => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Modo de Carga</label>
                  <select
                    value={bulkData.modo}
                    onChange={(e) => setBulkData({...bulkData, modo: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="incrementar">Incrementar stock existente</option>
                    <option value="establecer">Establecer stock exacto</option>
                    <option value="decrementar">Decrementar stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la carga</label>
                <input
                  type="text"
                  value={bulkData.nombre}
                  onChange={(e) => setBulkData({...bulkData, nombre: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  placeholder="Ej: Reposición mensual enero 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                <textarea
                  value={bulkData.descripcion}
                  onChange={(e) => setBulkData({...bulkData, descripcion: e.target.value})}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows={2}
                  placeholder="Descripción opcional de la carga..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Items a cargar</label>
                <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
                  {bulkData.items.map((item, index) => (
                    <div key={index} className="flex items-center space-x-2 bg-gray-50 p-2 rounded">
                      <input
                        type="text"
                        value={item.nombreProducto || ''}
                        onChange={(e) => {
                          const newItems = [...bulkData.items];
                          newItems[index] = {...newItems[index], nombreProducto: e.target.value};
                          setBulkData({...bulkData, items: newItems});
                        }}
                        placeholder="Nombre del producto"
                        className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm"
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
                        className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
                        min="0"
                      />
                      <button
                        onClick={() => {
                          const newItems = bulkData.items.filter((_, i) => i !== index);
                          setBulkData({...bulkData, items: newItems});
                        }}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
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
                    className="w-full border-2 border-dashed border-gray-300 rounded p-2 text-gray-500 hover:border-gray-400 hover:text-gray-600"
                  >
                    <Plus className="w-4 h-4 mr-2 inline" />
                    Agregar item
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setBulkModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleBulkLoad}
                className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                disabled={!bulkData.sucursalId || bulkData.items.length === 0}
              >
                Cargar Stock
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StockDashboard;