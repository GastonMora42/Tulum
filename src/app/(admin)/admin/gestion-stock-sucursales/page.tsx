// src/app/(admin)/admin/gestion-stock-sucursales/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  Settings, Plus, Edit, Trash2, Save, X, Filter, Search,
  AlertTriangle, CheckCircle, Info, Package, Store, Target,
  TrendingUp, BarChart3, Activity, Loader
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Interfaces
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

interface StockConfig {
  id: string;
  productoId: string;
  sucursalId: string;
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
  activo: boolean;
  producto: Producto;
  sucursal: Sucursal;
  usuario: {
    name: string;
    email: string;
  };
  createdAt: string;
  updatedAt: string;
  stockActual?: {
    cantidad: number;
    estado: string;
    porcentajeUso: number;
    necesitaReposicion: boolean;
  };
}

interface ConfigFormData {
  productoId: string;
  sucursalId: string;
  stockMaximo: number;
  stockMinimo: number;
  puntoReposicion: number;
}

export default function GestionStockSucursalesPage() {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState<StockConfig[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  
  // Estados de filtrado
  const [selectedSucursal, setSelectedSucursal] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  
  // Estados del modal
  const [showModal, setShowModal] = useState(false);
  const [editingConfig, setEditingConfig] = useState<StockConfig | null>(null);
  const [formData, setFormData] = useState<ConfigFormData>({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });
  
  // Estados de UI
  const [notification, setNotification] = useState<any>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [sucursalesRes, productosRes] = await Promise.all([
        authenticatedFetch('/api/admin/ubicaciones'),
        authenticatedFetch('/api/productos?limit=1000')
      ]);

      if (sucursalesRes.ok && productosRes.ok) {
        const sucursalesData = await sucursalesRes.json();
        const productosData = await productosRes.json();
        
        setSucursales(sucursalesData.filter((s: Sucursal) => s.tipo === 'sucursal'));
        setProductos(productosData.data || productosData);
        
        await loadConfigs();
      }
    } catch (error) {
      console.error('Error cargando datos:', error);
      showNotification('error', 'Error al cargar datos iniciales');
    } finally {
      setLoading(false);
    }
  };

  const loadConfigs = async (includeStats = true) => {
    try {
      const params = new URLSearchParams();
      if (selectedSucursal) params.append('sucursalId', selectedSucursal);
      if (includeStats) params.append('includeStats', 'true');

      const response = await authenticatedFetch(`/api/admin/stock-config?${params}`);
      if (response.ok) {
        const data = await response.json();
        setConfigs(data);
      }
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      showNotification('error', 'Error al cargar configuraciones');
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info', message: string, details?: string) => {
    setNotification({ type, message, details });
    setTimeout(() => setNotification(null), 5000);
  };

  const openModal = (config?: StockConfig) => {
    if (config) {
      setEditingConfig(config);
      setFormData({
        productoId: config.productoId,
        sucursalId: config.sucursalId,
        stockMaximo: config.stockMaximo,
        stockMinimo: config.stockMinimo,
        puntoReposicion: config.puntoReposicion
      });
    } else {
      setEditingConfig(null);
      setFormData({
        productoId: '',
        sucursalId: selectedSucursal || '',
        stockMaximo: 0,
        stockMinimo: 0,
        puntoReposicion: 0
      });
    }
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingConfig(null);
    setFormData({
      productoId: '',
      sucursalId: '',
      stockMaximo: 0,
      stockMinimo: 0,
      puntoReposicion: 0
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validaciones
      if (!formData.productoId || !formData.sucursalId) {
        showNotification('error', 'Debe seleccionar producto y sucursal');
        return;
      }

      if (formData.stockMinimo > formData.stockMaximo) {
        showNotification('error', 'El stock mínimo no puede ser mayor al máximo');
        return;
      }

      if (formData.puntoReposicion > formData.stockMaximo) {
        showNotification('error', 'El punto de reposición no puede ser mayor al stock máximo');
        return;
      }

      const response = await authenticatedFetch('/api/admin/stock-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        showNotification('success', 
          editingConfig ? 'Configuración actualizada exitosamente' : 'Configuración creada exitosamente'
        );
        closeModal();
        await loadConfigs();
      } else {
        const errorData = await response.json();
        showNotification('error', errorData.error || 'Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showNotification('error', 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (config: StockConfig) => {
    if (!confirm(`¿Está seguro de eliminar la configuración de "${config.producto.nombre}" para "${config.sucursal.nombre}"?`)) {
      return;
    }

    try {
      const response = await authenticatedFetch(`/api/admin/stock-config/${config.id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        showNotification('success', 'Configuración eliminada exitosamente');
        await loadConfigs();
      } else {
        showNotification('error', 'Error al eliminar configuración');
      }
    } catch (error) {
      console.error('Error eliminando configuración:', error);
      showNotification('error', 'Error al eliminar la configuración');
    }
  };

  // Filtrar configuraciones
  const filteredConfigs = configs.filter(config => {
    if (selectedSucursal && config.sucursalId !== selectedSucursal) return false;
    if (searchTerm && !config.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (statusFilter !== 'todos' && config.stockActual?.estado !== statusFilter) return false;
    return true;
  });

  const getStatusColor = (estado?: string) => {
    switch (estado) {
      case 'critico': return 'text-red-600 bg-red-100 border-red-200';
      case 'bajo': return 'text-orange-600 bg-orange-100 border-orange-200';
      case 'exceso': return 'text-purple-600 bg-purple-100 border-purple-200';
      default: return 'text-green-600 bg-green-100 border-green-200';
    }
  };

  const getStatusIcon = (estado?: string) => {
    switch (estado) {
      case 'critico': return <AlertTriangle className="w-4 h-4" />;
      case 'bajo': return <TrendingUp className="w-4 h-4" />;
      case 'exceso': return <Package className="w-4 h-4" />;
      default: return <CheckCircle className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <Loader className="h-12 w-12 animate-spin text-blue-600" />
          <span className="ml-3 text-lg">Cargando configuraciones...</span>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-4 lg:space-y-0">
          <div>
            <h1 className="text-3xl font-bold text-black">Gestión de Configuraciones de Stock</h1>
            <p className="text-black/80 mt-1">Administrar límites de stock por producto y sucursal</p>
          </div>
          
          <button
            onClick={() => openModal()}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Configuración
          </button>
        </div>

        {/* Notificaciones */}
        {notification && (
          <div className={`p-4 rounded-lg border ${
            notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' :
            notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' :
            'bg-blue-50 border-blue-200 text-blue-800'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? <CheckCircle className="w-5 h-5 mr-2" /> :
               notification.type === 'error' ? <AlertTriangle className="w-5 h-5 mr-2" /> :
               <Info className="w-5 h-5 mr-2" />}
              <div>
                <p className="font-medium">{notification.message}</p>
                {notification.details && <p className="text-sm mt-1">{notification.details}</p>}
              </div>
              <button onClick={() => setNotification(null)} className="ml-auto">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">Sucursal</label>
              <select
                value={selectedSucursal}
                onChange={(e) => {
                  setSelectedSucursal(e.target.value);
                  loadConfigs();
                }}
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
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar productos..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md bg-white text-black"
                />
              </div>
            </div>

            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{filteredConfigs.length} configuraciones</p>
                <p>{configs.filter(c => c.stockActual?.estado === 'critico').length} críticas</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de configuraciones */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-black">
              Configuraciones de Stock ({filteredConfigs.length})
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
                    Límites
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredConfigs.map((config) => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-black">{config.producto.nombre}</div>
                        {config.producto.codigoBarras && (
                          <div className="text-sm text-black/60">{config.producto.codigoBarras}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Store className="w-4 h-4 mr-2 text-black/60" />
                        <span className="text-sm text-black">{config.sucursal.nombre}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {config.stockActual ? (
                        <div>
                          <span className="text-lg font-bold text-black">
                            {config.stockActual.cantidad}
                          </span>
                          <div className="w-16 bg-gray-200 rounded-full h-2 mt-1">
                            <div 
                              className={`h-2 rounded-full ${
                                config.stockActual.porcentajeUso <= 30 ? 'bg-red-500' :
                                config.stockActual.porcentajeUso <= 70 ? 'bg-yellow-500' :
                                config.stockActual.porcentajeUso <= 100 ? 'bg-green-500' : 'bg-purple-500'
                              }`}
                              style={{ width: `${Math.min(100, config.stockActual.porcentajeUso)}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="space-y-1">
                        <div>Máx: <span className="font-medium">{config.stockMaximo}</span></div>
                        <div>Mín: <span className="font-medium">{config.stockMinimo}</span></div>
                        <div>Repo: <span className="font-medium">{config.puntoReposicion}</span></div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {config.stockActual ? (
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(config.stockActual.estado)}`}>
                          {getStatusIcon(config.stockActual.estado)}
                          <span className="ml-1 capitalize">{config.stockActual.estado}</span>
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(config)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(config)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-medium mb-4 text-black">
                {editingConfig ? 'Editar Configuración' : 'Nueva Configuración'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-black mb-1">Producto</label>
                  <select
                    value={formData.productoId}
                    onChange={(e) => setFormData({...formData, productoId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
                    disabled={!!editingConfig}
                  >
                    <option value="">Seleccionar producto</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Sucursal</label>
                  <select
                    value={formData.sucursalId}
                    onChange={(e) => setFormData({...formData, sucursalId: e.target.value})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
                    disabled={!!editingConfig}
                  >
                    <option value="">Seleccionar sucursal</option>
                    {sucursales.map((s) => (
                      <option key={s.id} value={s.id}>{s.nombre}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Stock Máximo</label>
                  <input
                    type="number"
                    value={formData.stockMaximo}
                    onChange={(e) => setFormData({...formData, stockMaximo: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formData.stockMinimo}
                    onChange={(e) => setFormData({...formData, stockMinimo: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-black mb-1">Punto de Reposición</label>
                  <input
                    type="number"
                    value={formData.puntoReposicion}
                    onChange={(e) => setFormData({...formData, puntoReposicion: parseFloat(e.target.value) || 0})}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 bg-white text-black"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-black hover:bg-gray-50"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center"
                  disabled={saving || !formData.productoId || !formData.sucursalId}
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}