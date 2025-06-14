// src/app/(admin)/admin/stock-sucursales/page.tsx
'use client';

import { useState, useEffect, JSXElementConstructor, ReactElement, ReactNode, ReactPortal, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, JSXElementConstructor, Key, ReactElement, ReactNode, ReactPortal, Key } from 'react';
import { 
  BarChart3, Settings, Upload, Download, RefreshCw, 
  FileText, TrendingUp, Store, Package2, AlertTriangle,
  CheckCircle, Info, Plus, Filter
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import BulkStockUpload from '@/components/admin/BulkStockUpload';

export default function StockSucursalesPage() {
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [view, setView] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');

  // Estados para modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showBulkFileModal, setShowBulkFileModal] = useState(false);

  // Estados para configuración
  const [configData, setConfigData] = useState({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });

  // Estados para carga masiva manual
  const [bulkData, setBulkData] = useState({
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
        
        setSucursales(sucursalesData.filter((s: { tipo: string; }) => s.tipo === 'sucursal'));
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
        body: JSON.stringify(bulkData)
      });

      if (response.ok) {
        const result = await response.json();
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

  const getStatusColor = (estado: any) => {
    switch (estado) {
      case 'critico': return 'text-red-600 bg-red-100 border-red-200';
      case 'bajo': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'exceso': return 'text-purple-600 bg-purple-100 border-purple-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getStatusIcon = (estado: any) => {
    switch (estado) {
      case 'critico': return <AlertTriangle className="w-4 h-4" />;
      case 'bajo': return <TrendingUp className="w-4 h-4" />;
      case 'exceso': return <Package2 className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  const filteredAnalysis = dashboardData?.analisisCompleto?.filter((item: { estado: string; producto: { nombre: string; }; }) => {
    if (statusFilter !== 'todos' && item.estado !== statusFilter) return false;
    if (searchTerm && !item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    return true;
  }) || [];

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-black">Gestión de Stock por Sucursales</h1>
            <p className="text-black/80 mt-1">Configuración de stocks máximos y gestión centralizada</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-2 rounded-lg flex items-center ${
                view === 'dashboard' 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white text-black border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard
            </button>
            
            <button
              onClick={() => setShowConfigModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
            >
              <Settings className="w-4 h-4 mr-2" />
              Configurar Stock
            </button>
            
            <button
              onClick={() => setShowBulkModal(true)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Carga Manual
            </button>
            
            <button
              onClick={() => setShowBulkFileModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Carga desde Archivo
            </button>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Sucursal</label>
              <select
                value={selectedSucursal}
                onChange={(e) => setSelectedSucursal(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map(s => (
                  <option key={s.id} value={s.id}>{s.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-black mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
              >
                <option value="todos">Todos los estados</option>
                <option value="critico">Críticos</option>
                <option value="bajo">Bajos</option>
                <option value="normal">Normales</option>
                <option value="exceso">Con exceso</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-black mb-1">Buscar</label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar productos..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={loadDashboardData}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {dashboardData && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-black/60">Total Configurados</p>
                  <p className="text-2xl font-bold text-black">{dashboardData.estadisticas.total}</p>
                </div>
                <Package2 className="w-8 h-8 text-blue-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-red-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600">Críticos</p>
                  <p className="text-2xl font-bold text-red-600">{dashboardData.estadisticas.criticos}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-orange-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-orange-600">Bajos</p>
                  <p className="text-2xl font-bold text-orange-600">{dashboardData.estadisticas.bajos}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-orange-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600">Normales</p>
                  <p className="text-2xl font-bold text-green-600">{dashboardData.estadisticas.normales}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-sm border border-purple-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600">Con Exceso</p>
                  <p className="text-2xl font-bold text-purple-600">{dashboardData.estadisticas.excesos}</p>
                </div>
                <Package2 className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        )}

        {/* Tabla de análisis */}
        {dashboardData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-black">
                Análisis Detallado ({filteredAnalysis.length} productos)
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Sucursal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Stock Actual
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Stock Máximo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Diferencia
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      % Uso
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAnalysis.slice(0, 50).map((item: { producto: { id: any; nombre: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; codigoBarras: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; sucursal: { id: any; nombre: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; stockActual: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; configuracion: { stockMaximo: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }; diferencia: number; estado: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; porcentajeUso: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
                    <tr key={`${item.producto.id}-${item.sucursal.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="font-medium text-black">{item.producto.nombre}</div>
                          {item.producto.codigoBarras && (
                            <div className="text-sm text-black/60">{item.producto.codigoBarras}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Store className="w-4 h-4 mr-2 text-black/60" />
                          <span className="text-sm text-black">{item.sucursal.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-lg font-bold text-black">{item.stockActual}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-black/60">{item.configuracion.stockMaximo}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`font-medium ${item.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {item.diferencia > 0 ? '-' : '+'}
                          {Math.abs(item.diferencia)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(item.estado)}`}>
                          {getStatusIcon(item.estado)}
                          <span className="ml-1 capitalize">{item.estado}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div 
                              className={`h-2 rounded-full ${
                                Number(item.porcentajeUso) <= 30 ? 'bg-red-500' :
                                Number(item.porcentajeUso) <= 70 ? 'bg-yellow-500' :
                                Number(item.porcentajeUso) <= 100 ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min(100, Number(item.porcentajeUso))}%` }}
                            ></div>
                          </div>
                          <span className="text-sm text-black/60">{item.porcentajeUso}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        )}

        {/* Modales */}
        {showConfigModal && (
          <ConfigModal
            configData={configData}
            setConfigData={setConfigData}
            productos={productos}
            sucursales={sucursales}
            onSave={handleConfigSave}
            onClose={() => setShowConfigModal(false)}
          />
        )}

        {showBulkModal && (
          <BulkModal
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
            onSuccess={(result: { resumen: { itemsProcesados: any; itemsErrores: any; }; }) => {
              alert(`Carga completada: ${result.resumen.itemsProcesados} procesados, ${result.resumen.itemsErrores} errores`);
              loadDashboardData();
            }}
            onClose={() => setShowBulkFileModal(false)}
          />
        )}
      </div>
    </ContrastEnhancer>
  );
}

// Componente Modal de Configuración
const ConfigModal = ({ configData, setConfigData, productos, sucursales, onSave, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-md">
      <h3 className="text-lg font-medium mb-4 text-black">Configurar Stock por Sucursal</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-black mb-1">Producto</label>
          <select
            value={configData.productoId}
            onChange={(e) => setConfigData({...configData, productoId: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            disabled={!!configData.productoId}
          >
            <option value="">Seleccionar producto</option>
            {productos.map((p: { id: Key | readonly string[] | null | undefined; nombre: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
              <option key={p.id} value={p.id}>{p.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Sucursal</label>
          <select
            value={configData.sucursalId}
            onChange={(e) => setConfigData({...configData, sucursalId: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            disabled={!!configData.sucursalId}
          >
            <option value="">Seleccionar sucursal</option>
            {sucursales.map((s: { id: Key | readonly string[] | null | undefined; nombre: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
              <option key={s.id} value={s.id}>{s.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Stock Máximo</label>
          <input
            type="number"
            value={configData.stockMaximo}
            onChange={(e) => setConfigData({...configData, stockMaximo: parseFloat(e.target.value) || 0})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Stock Mínimo</label>
          <input
            type="number"
            value={configData.stockMinimo}
            onChange={(e) => setConfigData({...configData, stockMinimo: parseFloat(e.target.value) || 0})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            min="0"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Punto de Reposición</label>
          <input
            type="number"
            value={configData.puntoReposicion}
            onChange={(e) => setConfigData({...configData, puntoReposicion: parseFloat(e.target.value) || 0})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            min="0"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          disabled={!configData.productoId || !configData.sucursalId}
        >
          Guardar
        </button>
      </div>
    </div>
  </div>
);

// Componente Modal de Carga Masiva Manual
const BulkModal = ({ bulkData, setBulkData, sucursales, onSave, onClose }) => (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
      <h3 className="text-lg font-medium mb-4 text-black">Carga Masiva Manual</h3>
      
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-black mb-1">Sucursal</label>
            <select
              value={bulkData.sucursalId}
              onChange={(e) => setBulkData({...bulkData, sucursalId: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            >
              <option value="">Seleccionar sucursal</option>
              {sucursales.map((s: { id: Key | readonly string[] | null | undefined; nombre: string | number | bigint | boolean | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | ReactPortal | Promise<string | number | bigint | boolean | ReactPortal | ReactElement<unknown, string | JSXElementConstructor<any>> | Iterable<ReactNode> | null | undefined> | null | undefined; }) => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-black mb-1">Modo de Carga</label>
            <select
              value={bulkData.modo}
              onChange={(e) => setBulkData({...bulkData, modo: e.target.value})}
              className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            >
              <option value="incrementar">Incrementar stock existente</option>
              <option value="establecer">Establecer stock exacto</option>
              <option value="decrementar">Decrementar stock</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Nombre de la carga</label>
          <input
            type="text"
            value={bulkData.nombre}
            onChange={(e) => setBulkData({...bulkData, nombre: e.target.value})}
            className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
            placeholder="Ej: Reposición mensual enero 2025"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-black mb-1">Items a cargar</label>
          <div className="border border-gray-300 rounded-md p-3 space-y-2 max-h-40 overflow-y-auto">
            {bulkData.items.map((item: { nombreProducto: any; cantidad: any; }, index: Key | null | undefined) => (
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
                  className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
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
                  className="w-20 border border-gray-300 rounded px-2 py-1 text-sm bg-white text-black"
                  min="0"
                />
                <button
                  onClick={() => {
                    const newItems = bulkData.items.filter((_: any, i: any) => i !== index);
                    setBulkData({...bulkData, items: newItems});
                  }}
                  className="text-red-600 hover:text-red-800"
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
              className="w-full border-2 border-dashed border-gray-300 rounded p-2 text-black/60 hover:border-gray-400 hover:text-black"
            >
              + Agregar item
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          onClick={onSave}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          disabled={!bulkData.sucursalId || bulkData.items.length === 0}
        >
          Cargar Stock
        </button>
      </div>
    </div>
  </div>
);