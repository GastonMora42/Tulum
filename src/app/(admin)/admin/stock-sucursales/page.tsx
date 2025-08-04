'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  RefreshCw,
  Plus,
  Save,
  X,
  Upload,
  Download,
  FileText,
  BarChart3,
  Minus,
  Equal,
  FileSpreadsheet,
  Grid3X3
} from 'lucide-react';
import { useStockSucursales } from '@/hooks/useStockSucursal';
import { authenticatedFetch } from '@/hooks/useAuth';

// ====================== INTERFACES ======================
interface Producto {
  id: string;
  nombre: string;
  codigoBarras?: string;
  categoria?: {
    id: string;
    nombre: string;
  };
  stockMinimo?: number;
  precio?: number;
}

interface Categoria {
  id: string;
  nombre: string;
  imagen?: string;
}

interface Sucursal {
  id: string;
  nombre: string;
  tipo: string;
}

interface AnalisisItem {
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
  porcentajeUso: number;
  estado: 'critico' | 'bajo' | 'normal' | 'exceso';
  prioridad: number;
  tieneConfiguracion: boolean;
  requiereConfiguracion?: boolean;
  acciones: {
    necesitaReposicion: boolean;
    puedeCargar: boolean;
    cantidadSugerida: number;
    tieneExceso: boolean;
    excesoActual: number;
  };
}

interface CargaManualItem {
  productoId: string;
  codigoBarras: string;
  nombreProducto: string;
  cantidad: number;
}

// Configuración de estados simplificada
const getStatusConfig = (estado: string) => {
  const configs = {
    critico: {
      icon: AlertTriangle,
      label: 'Crítico',
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200'
    },
    bajo: {
      icon: TrendingDown,
      label: 'Bajo',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200'
    },
    normal: {
      icon: CheckCircle,
      label: 'Normal',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200'
    },
    exceso: {
      icon: TrendingUp,
      label: 'Exceso',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200'
    }
  };
  return configs[estado as keyof typeof configs] || configs.normal;
};

export default function StockSucursalesMejorado() {
  // ====================== HOOKS Y ESTADOS ======================
  const {
    loading,
    error,
    dashboardData,
    loadDashboard,
    saveConfig,
    bulkLoad,
    cargaManual,
    cargarStockRapido,
    loadHistorialCargaManual,
    refreshData,
    clearError,
    lastUpdate
  } = useStockSucursales();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>('');
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas'); // 🆕 NUEVO FILTRO
  
  // Estados de modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false); // 🆕 NUEVO MODAL
  
  // Estados de formularios
  const [configData, setConfigData] = useState({
    productoId: '',
    sucursalId: '',
    stockMaximo: 0,
    stockMinimo: 0,
    puntoReposicion: 0
  });

  const [cargaData, setCargaData] = useState({
    productoId: '',
    sucursalId: '',
    cantidad: 0,
    observaciones: '',
    modo: 'incrementar' as 'incrementar' | 'establecer' | 'decrementar'
  });

  // Estados de UI
  const [loadingAction, setLoadingAction] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [historialData, setHistorialData] = useState<any[]>([]);
  
  // 🆕 NUEVOS ESTADOS PARA EXCEL
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ====================== EFECTOS ======================
  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    if (sucursalSeleccionada) {
      loadDashboard(sucursalSeleccionada);
    } else {
      loadDashboard();
    }
  }, [sucursalSeleccionada]);

  // ====================== FUNCIONES DE CARGA ======================
  const loadInitialData = async () => {
    try {
      // Cargar sucursales
      const sucursalesResponse = await authenticatedFetch('/api/admin/ubicaciones');
      if (sucursalesResponse.ok) {
        const sucursalesData = await sucursalesResponse.json();
        setSucursales(sucursalesData.filter((s: any) => s.tipo === 'sucursal'));
        
        if (sucursalesData.length > 0) {
          setSucursalSeleccionada(sucursalesData.find((s: any) => s.tipo === 'sucursal')?.id || '');
        }
      }

      // Cargar productos
      const productosResponse = await authenticatedFetch('/api/admin/productos?limit=1000');
      if (productosResponse.ok) {
        const productosData = await productosResponse.json();
        setProductos(productosData.data || []);
      }

      // 🆕 CARGAR CATEGORÍAS
      const categoriasResponse = await authenticatedFetch('/api/admin/categorias');
      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json();
        setCategorias(categoriasData || []);
      }

      loadDashboard();
    } catch (error) {
      console.error('Error cargando datos iniciales:', error);
      showAlertMessage('Error al cargar datos iniciales', 'error');
    }
  };

  const handleRefreshData = async () => {
    try {
      await refreshData(sucursalSeleccionada);
      showAlertMessage('Datos actualizados', 'success');
    } catch (error) {
      console.error('Error actualizando datos:', error);
      showAlertMessage('Error al actualizar', 'error');
    }
  };

  // ====================== FUNCIONES DE UTILIDAD ======================
  const showAlertMessage = (message: string, type: 'success' | 'error' = 'success') => {
    setShowAlert({ show: true, message, type });
    setTimeout(() => setShowAlert({ show: false, message: '', type: 'success' }), 3000);
  };

  // 🔧 FILTRADO MEJORADO CON CATEGORÍAS
  const filteredAnalysis = dashboardData?.analisisCompleto?.filter((item) => {
    if (statusFilter === 'sin_configuracion') {
      if (item.tieneConfiguracion !== false) return false;
    } else if (statusFilter !== 'todos') {
      if (item.estado !== statusFilter) return false;
    }
    
    if (searchTerm && !item.producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    
    if (sucursalSeleccionada && item.sucursal.id !== sucursalSeleccionada) {
      return false;
    }

    // 🆕 FILTRO POR CATEGORÍA
    if (categoriaFilter !== 'todas') {
      const producto = productos.find(p => p.id === item.producto.id);
      if (!producto || producto.categoria?.id !== categoriaFilter) {
        return false;
      }
    }
    
    return true;
  }) || [];

  // ====================== FUNCIONES DE ACCIONES ======================
  const handleSaveConfig = async () => {
    if (!configData.productoId || !configData.sucursalId) {
      showAlertMessage('Seleccione producto y sucursal', 'error');
      return;
    }

    try {
      setLoadingAction(true);
      await saveConfig(configData);
      setShowConfigModal(false);
      setConfigData({
        productoId: '',
        sucursalId: '',
        stockMaximo: 0,
        stockMinimo: 0,
        puntoReposicion: 0
      });
      await refreshData(sucursalSeleccionada);
      showAlertMessage('Configuración guardada', 'success');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showAlertMessage('Error al guardar', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCarga = async () => {
    if (!cargaData.productoId || !cargaData.sucursalId || cargaData.cantidad <= 0) {
      showAlertMessage('Complete todos los campos', 'error');
      return;
    }

    try {
      setLoadingAction(true);
      
      const result = await cargaManual({
        productoId: cargaData.productoId,
        sucursalId: cargaData.sucursalId,
        cantidad: cargaData.cantidad,
        observaciones: cargaData.observaciones,
        modo: cargaData.modo
      });
      
      setShowCargaModal(false);
      setCargaData({
        productoId: '',
        sucursalId: '',
        cantidad: 0,
        observaciones: '',
        modo: 'incrementar'
      });
      
      await refreshData(sucursalSeleccionada);
      showAlertMessage(`${result.mensaje}`, 'success');
    } catch (error) {
      console.error('Error en carga:', error);
      showAlertMessage(error instanceof Error ? error.message : 'Error al cargar', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // 🆕 FUNCIONES PARA EXCEL
  const descargarPlantillaExcel = async () => {
    try {
      setLoadingAction(true);
      const params = new URLSearchParams();
      if (sucursalSeleccionada) params.append('sucursalId', sucursalSeleccionada);
      
      const response = await authenticatedFetch(`/api/admin/stock-config/excel/plantilla?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al generar plantilla');
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `plantilla_stock_${sucursalSeleccionada ? sucursales.find(s => s.id === sucursalSeleccionada)?.nombre : 'todas'}_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showAlertMessage('Plantilla descargada exitosamente', 'success');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      showAlertMessage('Error al descargar plantilla', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
        showAlertMessage('Solo se permiten archivos Excel (.xlsx, .xls)', 'error');
        return;
      }
      setExcelFile(file);
    }
  };

  const procesarArchivoExcel = async () => {
    if (!excelFile || !sucursalSeleccionada) {
      showAlertMessage('Seleccione un archivo y una sucursal', 'error');
      return;
    }

    try {
      setIsProcessingExcel(true);
      const formData = new FormData();
      formData.append('file', excelFile);
      formData.append('sucursalId', sucursalSeleccionada);
      formData.append('modo', 'establecer'); // Por defecto establecer el stock

      const response = await authenticatedFetch('/api/admin/stock-config/excel/procesar', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar archivo');
      }

      const result = await response.json();
      
      setShowExcelModal(false);
      setExcelFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await refreshData(sucursalSeleccionada);
      
      showAlertMessage(
        `Archivo procesado: ${result.resumen.itemsProcesados} productos actualizados${result.resumen.itemsErrores > 0 ? `, ${result.resumen.itemsErrores} errores` : ''}`,
        result.resumen.itemsErrores === 0 ? 'success' : 'error'
      );
    } catch (error) {
      console.error('Error procesando archivo:', error);
      showAlertMessage(error instanceof Error ? error.message : 'Error al procesar archivo', 'error');
    } finally {
      setIsProcessingExcel(false);
    }
  };

  const openConfigModal = (productoId: string, sucursalId: string) => {
    const item = filteredAnalysis.find(item => 
      item.producto.id === productoId && item.sucursal.id === sucursalId
    );
    
    if (item?.tieneConfiguracion) {
      setConfigData({
        productoId,
        sucursalId,
        stockMaximo: item.configuracion.stockMaximo,
        stockMinimo: item.configuracion.stockMinimo,
        puntoReposicion: item.configuracion.puntoReposicion
      });
    } else {
      const producto = productos.find(p => p.id === productoId);
      const stockActual = item?.stockActual || 0;
      const stockMinimo = Math.max(producto?.stockMinimo || 1, Math.ceil(stockActual * 0.2));
      const stockMaximo = Math.max(stockActual * 3, stockMinimo * 5, 50);
      const puntoReposicion = Math.ceil(stockMinimo * 1.5);
      
      setConfigData({
        productoId,
        sucursalId,
        stockMaximo,
        stockMinimo,
        puntoReposicion
      });
    }
    
    setShowConfigModal(true);
  };

  const openCargaModal = (productoId?: string, sucursalId?: string, modo: 'incrementar' | 'decrementar' | 'establecer' = 'incrementar') => {
    setCargaData({
      productoId: productoId || '',
      sucursalId: sucursalId || sucursalSeleccionada || '',
      cantidad: 0,
      observaciones: '',
      modo
    });
    setShowCargaModal(true);
  };

  const openHistorialModal = async () => {
    try {
      setLoadingAction(true);
      const historial = await loadHistorialCargaManual({
        sucursalId: sucursalSeleccionada || undefined,
        limit: 50
      });
      setHistorialData(historial.historial || []);
      setShowHistorialModal(true);
    } catch (error) {
      console.error('Error cargando historial:', error);
      showAlertMessage('Error al cargar historial', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // ====================== COMPONENTES ======================
  
  // Alert minimalista
  const Alert = () => {
    if (!showAlert.show) return null;
    
    return (
      <div className={`fixed top-4 right-4 z-50 p-3 rounded-lg shadow-lg max-w-sm ${
        showAlert.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-center justify-between">
          <span className="text-sm">{showAlert.message}</span>
          <button onClick={() => setShowAlert({ show: false, message: '', type: 'success' })}>
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Estadísticas minimalistas
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      {[
        { label: 'Críticos', value: dashboardData?.estadisticas?.criticos || 0, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Bajos', value: dashboardData?.estadisticas?.bajos || 0, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Normales', value: dashboardData?.estadisticas?.normales || 0, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Excesos', value: dashboardData?.estadisticas?.excesos || 0, color: 'text-purple-600', bg: 'bg-purple-50' },
        { label: 'Sin Config', value: dashboardData?.estadisticas?.sinConfiguracion || 0, color: 'text-blue-600', bg: 'bg-blue-50' },
        { label: 'Total', value: dashboardData?.estadisticas?.total || 0, color: 'text-gray-600', bg: 'bg-gray-50' }
      ].map((stat, index) => (
        <div key={index} className={`${stat.bg} p-3 rounded-lg border`}>
          <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
          <div className="text-xs text-gray-600">{stat.label}</div>
        </div>
      ))}
    </div>
  );

  // Fila de tabla minimalista
  const TableRow = ({ item, index }: { item: AnalisisItem, index: number }) => {
    const statusConfig = getStatusConfig(item.estado);
    const IconComponent = statusConfig.icon;
    const needsConfiguration = !item.tieneConfiguracion;
    
    return (
      <tr className={`border-b hover:bg-gray-50 ${needsConfiguration ? 'bg-yellow-50' : ''}`}>
        {/* Producto */}
        <td className="p-3">
          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 bg-gradient-to-br from-[#311716] to-[#462625] rounded-lg flex items-center justify-center text-white text-sm font-bold ${needsConfiguration ? 'ring-2 ring-yellow-400' : ''}`}>
              {item.producto.nombre.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm text-gray-900 truncate">{item.producto.nombre}</div>
              {item.producto.codigoBarras && (
                <div className="text-xs text-gray-500 font-mono">{item.producto.codigoBarras}</div>
              )}
              {needsConfiguration && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                  Sin config
                </span>
              )}
            </div>
          </div>
        </td>
        
        {/* Sucursal (solo en móvil oculto) */}
        <td className="p-3 hidden md:table-cell">
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">{item.sucursal.nombre}</span>
          </div>
        </td>
        
        {/* Stock Actual */}
        <td className="p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{item.stockActual}</div>
        </td>
        
        {/* Configuración (oculto en móvil) */}
        <td className="p-3 hidden lg:table-cell">
          <div className="text-xs space-y-1">
            <div>Máx: <span className="font-semibold">{item.configuracion.stockMaximo}</span></div>
            <div>Mín: <span className="font-semibold text-orange-600">{item.configuracion.stockMinimo}</span></div>
          </div>
        </td>
        
        {/* Estado */}
        <td className="p-3">
          <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
            <IconComponent className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </div>
        </td>
        
        {/* Utilización (oculto en móvil) */}
        <td className="p-3 hidden md:table-cell">
          <div className="w-16 bg-gray-200 rounded-full h-2">
            <div 
              className={`h-full rounded-full ${
                item.porcentajeUso <= 30 ? 'bg-red-500' :
                item.porcentajeUso <= 70 ? 'bg-yellow-500' :
                item.porcentajeUso <= 100 ? 'bg-green-500' : 'bg-purple-500'
              }`}
              style={{ width: `${Math.min(100, item.porcentajeUso)}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500 mt-1">{item.porcentajeUso}%</div>
        </td>
        
        {/* Acciones */}
        <td className="p-3">
          <div className="flex flex-col space-y-1">
            {/* Botones de carga */}
            <div className="flex space-x-1">
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'incrementar')}
                className="inline-flex items-center px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors"
                title="Incrementar stock"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'decrementar')}
                className="inline-flex items-center px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors"
                title="Decrementar stock"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'establecer')}
                className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors"
                title="Establecer stock"
              >
                <Equal className="w-3 h-3" />
              </button>
            </div>
            
            {/* Configuración */}
            <button
              onClick={() => openConfigModal(item.producto.id, item.sucursal.id)}
              className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                needsConfiguration 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800'
              }`}
            >
              <Settings className="w-3 h-3 mr-1" />
              Config
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ====================== RENDER PRINCIPAL ======================
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 text-[#eeb077] animate-spin" />
          <span className="text-lg font-medium text-gray-700">Cargando...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <Alert />
      
      <div className="max-w-7xl mx-auto space-y-4">
        
        {/* Header minimalista */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Stock por Sucursales</h1>
            <p className="text-sm text-gray-600">Gestiona el inventario en tiempo real</p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* 🆕 BOTÓN EXCEL */}
            <button
              onClick={() => setShowExcelModal(true)}
              className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1" />
              Excel
            </button>
            
            <button
              onClick={openHistorialModal}
              className="inline-flex items-center px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
            >
              <FileText className="w-4 h-4 mr-1" />
              Historial
            </button>
            
            <button
              onClick={() => openCargaModal()}
              className="inline-flex items-center px-3 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-colors"
            >
              <Plus className="w-4 h-4 mr-1" />
              Carga Manual
            </button>
            
            <button
              onClick={handleRefreshData}
              disabled={loading}
              className="inline-flex items-center px-3 py-2 bg-[#311716] text-white rounded-lg text-sm font-medium hover:bg-[#462625] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <StatsCards />

        {/* Filtros minimalistas mejorados */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Sucursal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm"
              >
                <option value="">Todas</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* 🆕 FILTRO POR CATEGORÍA */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm"
              >
                <option value="todas">Todas las categorías</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre del producto..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm"
                />
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm"
              >
                <option value="todos">Todos</option>
                <option value="critico">Críticos ({dashboardData?.estadisticas?.criticos || 0})</option>
                <option value="bajo">Bajos ({dashboardData?.estadisticas?.bajos || 0})</option>
                <option value="normal">Normales ({dashboardData?.estadisticas?.normales || 0})</option>
                <option value="exceso">Excesos ({dashboardData?.estadisticas?.excesos || 0})</option>
                <option value="sin_configuracion">Sin configuración ({dashboardData?.estadisticas?.sinConfiguracion || 0})</option>
              </select>
            </div>

            {/* Limpiar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                  setCategoriaFilter('todas');
                  setSucursalSeleccionada('');
                }}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
              >
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Tabla minimalista */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Grid3X3 className="w-5 h-5 mr-2" />
                Análisis ({filteredAnalysis.length} productos)
              </h2>
              {lastUpdate && (
                <div className="text-xs text-gray-500">
                  Actualizado: {lastUpdate.toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Sucursal</th>
                  <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase">Stock</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Config</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Uso</th>
                  <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredAnalysis.slice(0, 100).map((item, index) => (
                  <TableRow
                    key={`${item.producto.id}-${item.sucursal.id}`}
                    item={{
                      ...item,
                      estado: (
                        item.estado === "critico" ||
                        item.estado === "bajo" ||
                        item.estado === "normal" ||
                        item.estado === "exceso"
                      )
                        ? item.estado
                        : "normal"
                    }}
                    index={index}
                  />
                ))}
              </tbody>
            </table>
            {filteredAnalysis.length === 0 && (
              <div className="text-center py-8">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay productos que coincidan con los filtros</p>
              </div>
            )}
          </div>
        </div>

        {/* 🆕 MODAL DE EXCEL */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileSpreadsheet className="w-5 h-5 mr-2" />
                Gestión por Excel
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Paso 1: Descargar Plantilla</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Descarga la plantilla con todos los productos y su stock actual
                  </p>
                  <button
                    onClick={descargarPlantillaExcel}
                    disabled={loadingAction || !sucursalSeleccionada}
                    className="w-full inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    {loadingAction ? 'Generando...' : 'Descargar Plantilla'}
                  </button>
                  {!sucursalSeleccionada && (
                    <p className="text-xs text-red-600 mt-1">Selecciona una sucursal primero</p>
                  )}
                </div>

                <div className="p-4 bg-green-50 rounded-lg">
                  <h4 className="font-medium text-green-900 mb-2">Paso 2: Subir Archivo Modificado</h4>
                  <p className="text-sm text-green-700 mb-3">
                    Modifica los valores de stock y sube el archivo
                  </p>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                  />
                  
                  {excelFile && (
                    <div className="mt-2 p-2 bg-white rounded border">
                      <p className="text-sm text-gray-700">
                        <strong>Archivo seleccionado:</strong> {excelFile.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Tamaño: {(excelFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  )}
                  
                  <button
                    onClick={procesarArchivoExcel}
                    disabled={!excelFile || isProcessingExcel || !sucursalSeleccionada}
                    className="w-full mt-3 inline-flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    {isProcessingExcel ? 'Procesando...' : 'Procesar Archivo'}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => {
                    setShowExcelModal(false);
                    setExcelFile(null);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Configuración (mantener igual) */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Configurar Stock</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={configData.stockMinimo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
                  <input
                    type="number"
                    value={configData.stockMaximo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMaximo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punto de Reposición</label>
                  <input
                    type="number"
                    value={configData.puntoReposicion}
                    onChange={(e) => setConfigData(prev => ({ ...prev, puntoReposicion: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveConfig}
                  disabled={loadingAction}
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition-colors disabled:opacity-50"
                >
                  {loadingAction ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Carga */}
        {showCargaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {cargaData.modo === 'incrementar' ? '➕ Incrementar Stock' : 
                 cargaData.modo === 'decrementar' ? '➖ Decrementar Stock' : 
                 '📝 Establecer Stock'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
                  <select
                    value={cargaData.productoId}
                    onChange={(e) => setCargaData(prev => ({ ...prev, productoId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  >
                    <option value="">Seleccionar producto...</option>
                    {productos.map((producto) => (
                      <option key={producto.id} value={producto.id}>
                        {producto.nombre} {producto.codigoBarras ? `(${producto.codigoBarras})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                  <select
                    value={cargaData.sucursalId}
                    onChange={(e) => setCargaData(prev => ({ ...prev, sucursalId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  >
                    <option value="">Seleccionar sucursal...</option>
                    {sucursales.map((sucursal) => (
                      <option key={sucursal.id} value={sucursal.id}>
                        {sucursal.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Selector de modo */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modo</label>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'incrementar' }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'incrementar' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Plus className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'decrementar' }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'decrementar' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Minus className="w-4 h-4 mx-auto" />
                    </button>
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'establecer' }))}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'establecer' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Equal className="w-4 h-4 mx-auto" />
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad {cargaData.modo === 'establecer' ? '(valor final)' : '(a ajustar)'}
                  </label>
                  <input
                    type="number"
                    value={cargaData.cantidad}
                    onChange={(e) => setCargaData(prev => ({ ...prev, cantidad: Number(e.target.value) }))}
                    min="1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-center text-xl font-bold"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                  <textarea
                    value={cargaData.observaciones}
                    onChange={(e) => setCargaData(prev => ({ ...prev, observaciones: e.target.value }))}
                    placeholder="Comentarios opcionales..."
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                  ></textarea>
                </div>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  onClick={() => setShowCargaModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCarga}
                  disabled={loadingAction || !cargaData.productoId || !cargaData.sucursalId || cargaData.cantidad <= 0}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 ${
                    cargaData.modo === 'incrementar' ? 'bg-green-500 hover:bg-green-600' :
                    cargaData.modo === 'decrementar' ? 'bg-red-500 hover:bg-red-600' :
                    'bg-blue-500 hover:bg-blue-600'
                  } text-white`}
                >
                  {loadingAction ? 'Procesando...' : 
                   cargaData.modo === 'incrementar' ? 'Incrementar' :
                   cargaData.modo === 'decrementar' ? 'Decrementar' : 'Establecer'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Historial */}
        {showHistorialModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Historial de Cargas</h3>
                <button
                  onClick={() => setShowHistorialModal(false)}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="overflow-auto max-h-96">
                {historialData.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-2 text-left text-xs font-medium text-gray-500">Fecha</th>
                        <th className="p-2 text-left text-xs font-medium text-gray-500">Producto</th>
                        <th className="p-2 text-left text-xs font-medium text-gray-500">Sucursal</th>
                        <th className="p-2 text-left text-xs font-medium text-gray-500">Cantidad</th>
                        <th className="p-2 text-left text-xs font-medium text-gray-500">Usuario</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historialData.map((movimiento, index) => (
                        <tr key={movimiento.id} className="hover:bg-gray-50">
                          <td className="p-2 text-xs">
                            {new Date(movimiento.fecha).toLocaleString()}
                          </td>
                          <td className="p-2">
                            <div className="font-medium text-sm">{movimiento.producto?.nombre || 'N/A'}</div>
                            {movimiento.producto?.codigoBarras && (
                              <div className="text-xs text-gray-500">{movimiento.producto.codigoBarras}</div>
                            )}
                          </td>
                          <td className="p-2 text-sm">{movimiento.sucursal.nombre}</td>
                          <td className="p-2">
                            <span className={`font-medium ${
                              movimiento.tipoMovimiento === 'entrada' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {movimiento.tipoMovimiento === 'entrada' ? '+' : '-'}{movimiento.cantidad}
                            </span>
                            <div className="text-xs text-gray-500">Final: {movimiento.stockResultante}</div>
                          </td>
                          <td className="p-2 text-sm">{movimiento.usuario?.nombre || 'Sistema'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No hay historial disponible</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}