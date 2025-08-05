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
  Grid3X3,
  Clock,
  Loader2,
  Info,
  Zap
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
    lastUpdate,
    descargarPlantillaExcel,
    procesarArchivoExcel,
    validarArchivoPrevio,
    config
  } = useStockSucursales();

  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Sucursal[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState<string>('');
  
  // Estados de filtros
  const [statusFilter, setStatusFilter] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriaFilter, setCategoriaFilter] = useState('todas');
  
  // Estados de modales
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showCargaModal, setShowCargaModal] = useState(false);
  const [showHistorialModal, setShowHistorialModal] = useState(false);
  const [showExcelModal, setShowExcelModal] = useState(false);
  
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

  // Estados de UI y Excel
  const [loadingAction, setLoadingAction] = useState(false);
  const [showAlert, setShowAlert] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
  const [historialData, setHistorialData] = useState<any[]>([]);
  
  // 🆕 ESTADOS PARA EXCEL MEJORADOS
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [modoExcel, setModoExcel] = useState<'incrementar' | 'establecer' | 'decrementar'>('establecer');
  const [excelValidation, setExcelValidation] = useState<{valido: boolean; errores: string[]; advertencias: string[]} | null>(null);
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
        const sucursalesFiltradas = sucursalesData.filter((s: any) => s.tipo === 'sucursal');
        setSucursales(sucursalesFiltradas);
        
        if (sucursalesFiltradas.length > 0) {
          setSucursalSeleccionada(sucursalesFiltradas[0].id);
        }
      }

      // Cargar productos
      const productosResponse = await authenticatedFetch('/api/admin/productos?limit=1000');
      if (productosResponse.ok) {
        const productosData = await productosResponse.json();
        setProductos(productosData.data || []);
      }

      // Cargar categorías
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
    setTimeout(() => setShowAlert({ show: false, message: '', type: 'success' }), 5000);
  };

  // Filtrado mejorado con categorías
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
      showAlertMessage('Configuración guardada exitosamente', 'success');
    } catch (error) {
      console.error('Error guardando configuración:', error);
      showAlertMessage('Error al guardar configuración', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCarga = async () => {
    if (!cargaData.productoId || !cargaData.sucursalId || cargaData.cantidad <= 0) {
      showAlertMessage('Complete todos los campos correctamente', 'error');
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
      showAlertMessage(result.mensaje, 'success');
    } catch (error) {
      console.error('Error en carga:', error);
      showAlertMessage(error instanceof Error ? error.message : 'Error al cargar stock', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  // 🆕 FUNCIONES PARA EXCEL MEJORADAS
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log(`[UI] Archivo seleccionado: ${file.name} (${(file.size / 1024).toFixed(1)}KB)`);
      
      // Validar archivo antes de establecerlo
      const validation = validarArchivoPrevio(file);
      setExcelValidation(validation);
      
      if (validation.valido) {
        setExcelFile(file);
      } else {
        setExcelFile(null);
        showAlertMessage(validation.errores[0], 'error');
      }
    }
  };

  const handleDescargarPlantilla = async () => {
    if (!sucursalSeleccionada) {
      showAlertMessage('Seleccione una sucursal primero', 'error');
      return;
    }

    try {
      setLoadingAction(true);
      await descargarPlantillaExcel(sucursalSeleccionada);
      showAlertMessage('Plantilla descargada exitosamente', 'success');
    } catch (error) {
      console.error('Error descargando plantilla:', error);
      showAlertMessage(error instanceof Error ? error.message : 'Error al descargar plantilla', 'error');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleProcesarExcel = async () => {
    if (!excelFile || !sucursalSeleccionada) {
      showAlertMessage('Seleccione un archivo y una sucursal', 'error');
      return;
    }

    try {
      setIsProcessingExcel(true);
      
      const result = await procesarArchivoExcel(excelFile, sucursalSeleccionada, modoExcel);
      
      // Cerrar modal y limpiar
      setShowExcelModal(false);
      setExcelFile(null);
      setExcelValidation(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      await refreshData(sucursalSeleccionada);
      
      // Mensaje de éxito más detallado
      const tiempoProcesamiento = result.resumen.tiempoProcesamiento || 'N/A';
      const mensaje = result.resumen.itemsErrores === 0 
        ? `✅ ¡Éxito! ${result.resumen.itemsProcesados} productos actualizados en ${tiempoProcesamiento}s`
        : `⚠️ Procesado: ${result.resumen.itemsProcesados} exitosos, ${result.resumen.itemsErrores} errores (${result.resumen.porcentajeExito}% éxito)`;
      
      showAlertMessage(mensaje, result.resumen.itemsErrores === 0 ? 'success' : 'error');
      
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
  
  // Alert mejorado con más información
  const Alert = () => {
    if (!showAlert.show) return null;
    
    return (
      <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-md ${
        showAlert.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
      }`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-2">
            {showAlert.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
            )}
            <span className="text-sm leading-5">{showAlert.message}</span>
          </div>
          <button 
            onClick={() => setShowAlert({ show: false, message: '', type: 'success' })}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  // Estadísticas mejoradas con más información
  const StatsCards = () => (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
      {[
        { 
          label: 'Críticos', 
          value: dashboardData?.estadisticas?.criticos || 0, 
          color: 'text-red-600', 
          bg: 'bg-red-50',
          border: 'border-red-200',
          icon: AlertTriangle
        },
        { 
          label: 'Bajos', 
          value: dashboardData?.estadisticas?.bajos || 0, 
          color: 'text-yellow-600', 
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          icon: TrendingDown
        },
        { 
          label: 'Normales', 
          value: dashboardData?.estadisticas?.normales || 0, 
          color: 'text-green-600', 
          bg: 'bg-green-50',
          border: 'border-green-200',
          icon: CheckCircle
        },
        { 
          label: 'Excesos', 
          value: dashboardData?.estadisticas?.excesos || 0, 
          color: 'text-purple-600', 
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          icon: TrendingUp
        },
        { 
          label: 'Sin Config', 
          value: dashboardData?.estadisticas?.sinConfiguracion || 0, 
          color: 'text-blue-600', 
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          icon: Settings
        },
        { 
          label: 'Total', 
          value: dashboardData?.estadisticas?.total || 0, 
          color: 'text-gray-600', 
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          icon: Package
        }
      ].map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className={`${stat.bg} ${stat.border} p-3 rounded-lg border transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between mb-1">
              <div className={`text-2xl font-bold ${stat.color}`}>{stat.value}</div>
              <IconComponent className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-xs text-gray-600">{stat.label}</div>
          </div>
        );
      })}
    </div>
  );

  // Fila de tabla mejorada
  const TableRow = ({ item, index }: { item: AnalisisItem, index: number }) => {
    const statusConfig = getStatusConfig(item.estado);
    const IconComponent = statusConfig.icon;
    const needsConfiguration = !item.tieneConfiguracion;
    
    return (
      <tr className={`border-b hover:bg-gray-50 transition-colors ${needsConfiguration ? 'bg-yellow-50' : ''}`}>
        {/* Producto */}
        <td className="p-3">
          <div className="flex items-center space-x-3">
            <div className={`w-10 h-10 bg-gradient-to-br from-[#311716] to-[#462625] rounded-lg flex items-center justify-center text-white text-sm font-bold shadow-sm ${needsConfiguration ? 'ring-2 ring-yellow-400' : ''}`}>
              {item.producto.nombre.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-medium text-sm text-gray-900 truncate">{item.producto.nombre}</div>
              {item.producto.codigoBarras && (
                <div className="text-xs text-gray-500 font-mono">{item.producto.codigoBarras}</div>
              )}
              {needsConfiguration && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 mt-1">
                  <Settings className="w-3 h-3 mr-1" />
                  Requiere configuración
                </span>
              )}
            </div>
          </div>
        </td>
        
        {/* Sucursal */}
        <td className="p-3 hidden md:table-cell">
          <div className="flex items-center space-x-2">
            <Store className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">{item.sucursal.nombre}</span>
          </div>
        </td>
        
        {/* Stock Actual */}
        <td className="p-3 text-center">
          <div className="text-lg font-bold text-gray-900">{item.stockActual}</div>
          {item.diferencia !== 0 && (
            <div className={`text-xs ${item.diferencia > 0 ? 'text-red-600' : 'text-green-600'}`}>
              {item.diferencia > 0 ? `Faltan ${item.diferencia}` : `Sobran ${Math.abs(item.diferencia)}`}
            </div>
          )}
        </td>
        
        {/* Configuración */}
        <td className="p-3 hidden lg:table-cell">
          <div className="text-xs space-y-1">
            <div className="flex justify-between">
              <span>Máx:</span> 
              <span className="font-semibold text-blue-600">{item.configuracion.stockMaximo}</span>
            </div>
            <div className="flex justify-between">
              <span>Mín:</span> 
              <span className="font-semibold text-orange-600">{item.configuracion.stockMinimo}</span>
            </div>
            <div className="flex justify-between">
              <span>Repo:</span> 
              <span className="font-semibold text-purple-600">{item.configuracion.puntoReposicion}</span>
            </div>
          </div>
        </td>
        
        {/* Estado */}
        <td className="p-3">
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color} border ${statusConfig.borderColor}`}>
            <IconComponent className="w-3 h-3 mr-1" />
            {statusConfig.label}
          </div>
        </td>
        
        {/* Utilización */}
        <td className="p-3 hidden md:table-cell">
          <div className="w-20">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-gray-500">{item.porcentajeUso}%</span>
              <span className="text-xs text-gray-400">{item.configuracion.stockMaximo}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-full rounded-full transition-all ${
                  item.porcentajeUso <= 30 ? 'bg-red-500' :
                  item.porcentajeUso <= 70 ? 'bg-yellow-500' :
                  item.porcentajeUso <= 100 ? 'bg-green-500' : 'bg-purple-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(5, item.porcentajeUso))}%` }}
              ></div>
            </div>
          </div>
        </td>
        
        {/* Acciones */}
        <td className="p-3">
          <div className="flex flex-col space-y-2">
            {/* Botones de carga */}
            <div className="flex space-x-1">
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'incrementar')}
                className="inline-flex items-center px-2 py-1 bg-green-500 text-white rounded text-xs font-medium hover:bg-green-600 transition-colors shadow-sm"
                title="Incrementar stock"
              >
                <Plus className="w-3 h-3" />
              </button>
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'decrementar')}
                className="inline-flex items-center px-2 py-1 bg-red-500 text-white rounded text-xs font-medium hover:bg-red-600 transition-colors shadow-sm"
                title="Decrementar stock"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                onClick={() => openCargaModal(item.producto.id, item.sucursal.id, 'establecer')}
                className="inline-flex items-center px-2 py-1 bg-blue-500 text-white rounded text-xs font-medium hover:bg-blue-600 transition-colors shadow-sm"
                title="Establecer stock"
              >
                <Equal className="w-3 h-3" />
              </button>
            </div>
            
            {/* Configuración */}
            <button
              onClick={() => openConfigModal(item.producto.id, item.sucursal.id)}
              className={`inline-flex items-center px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm ${
                needsConfiguration 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-800 border border-yellow-300' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-300'
              }`}
            >
              <Settings className="w-3 h-3 mr-1" />
              {needsConfiguration ? 'Configurar' : 'Editar'}
            </button>
          </div>
        </td>
      </tr>
    );
  };

  // ====================== RENDER PRINCIPAL ======================
  if (loading && !dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="w-8 h-8 text-[#eeb077] animate-spin" />
          <span className="text-lg font-medium text-gray-700">Cargando datos de stock...</span>
          <div className="text-sm text-gray-500">Esto puede tardar unos segundos</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-2 md:p-4">
      <Alert />
      
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header mejorado */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 flex items-center">
              <Zap className="w-8 h-8 mr-3 text-[#eeb077]" />
              Stock por Sucursales
            </h1>
            <p className="text-gray-600 mt-1">Gestiona el inventario en tiempo real con herramientas avanzadas</p>
            {lastUpdate && (
              <div className="flex items-center mt-2 text-sm text-gray-500">
                <Clock className="w-4 h-4 mr-1" />
                Última actualización: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
          
          <div className="flex flex-wrap gap-2">
            {/* Botón Excel mejorado */}
            <button
              onClick={() => setShowExcelModal(true)}
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-all shadow-sm hover:shadow-md"
            >
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Gestión Excel
            </button>
            
            <button
              onClick={openHistorialModal}
              disabled={loadingAction}
              className="inline-flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <FileText className="w-4 h-4 mr-2" />
              Historial
            </button>
            
            <button
              onClick={() => openCargaModal()}
              className="inline-flex items-center px-4 py-2 bg-green-500 text-white rounded-lg text-sm font-medium hover:bg-green-600 transition-all shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4 mr-2" />
              Carga Manual
            </button>
            
            <button
              onClick={handleRefreshData}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 bg-[#311716] text-white rounded-lg text-sm font-medium hover:bg-[#462625] transition-all shadow-sm hover:shadow-md disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
          </div>
        </div>

        {/* Estadísticas */}
        <StatsCards />

        {/* Filtros mejorados */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
          <div className="flex items-center mb-4">
            <Filter className="w-5 h-5 text-gray-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900">Filtros</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Sucursal */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sucursal</label>
              <select
                value={sucursalSeleccionada}
                onChange={(e) => setSucursalSeleccionada(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm shadow-sm"
              >
                <option value="">Todas las sucursales</option>
                {sucursales.map((sucursal) => (
                  <option key={sucursal.id} value={sucursal.id}>
                    {sucursal.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Categoría</label>
              <select
                value={categoriaFilter}
                onChange={(e) => setCategoriaFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm shadow-sm"
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
              <label className="block text-sm font-medium text-gray-700 mb-2">Buscar producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Nombre del producto..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm shadow-sm"
                />
              </div>
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent text-sm shadow-sm"
              >
                <option value="todos">Todos los estados</option>
                <option value="critico">🔴 Críticos ({dashboardData?.estadisticas?.criticos || 0})</option>
                <option value="bajo">🟡 Bajos ({dashboardData?.estadisticas?.bajos || 0})</option>
                <option value="normal">🟢 Normales ({dashboardData?.estadisticas?.normales || 0})</option>
                <option value="exceso">🟣 Excesos ({dashboardData?.estadisticas?.excesos || 0})</option>
                <option value="sin_configuracion">⚙️ Sin configuración ({dashboardData?.estadisticas?.sinConfiguracion || 0})</option>
              </select>
            </div>

            {/* Limpiar filtros */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">&nbsp;</label>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('todos');
                  setCategoriaFilter('todas');
                  setSucursalSeleccionada('');
                }}
                className="w-full px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors border border-gray-300"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        </div>

        {/* Tabla mejorada */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Grid3X3 className="w-6 h-6 mr-2" />
                Análisis de Stock
                <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {filteredAnalysis.length} productos
                </span>
              </h2>
              {error && (
                <div className="flex items-center text-red-600 text-sm">
                  <AlertTriangle className="w-4 h-4 mr-1" />
                  {error}
                </div>
              )}
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Sucursal</th>
                  <th className="p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Configuración</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="p-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Utilización</th>
                  <th className="p-4 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
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
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron productos</h3>
                <p className="text-gray-500">Ajusta los filtros para ver más resultados</p>
              </div>
            )}
            
            {filteredAnalysis.length >= 100 && (
              <div className="p-4 bg-yellow-50 border-t border-yellow-200">
                <div className="flex items-center justify-center text-yellow-800 text-sm">
                  <Info className="w-4 h-4 mr-2" />
                  Mostrando los primeros 100 resultados. Use filtros para refinar la búsqueda.
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 🆕 MODAL DE EXCEL MEJORADO */}
        {showExcelModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <FileSpreadsheet className="w-6 h-6 mr-2 text-green-600" />
                  Gestión Masiva por Excel
                  {isProcessingExcel && <span className="ml-2 text-blue-600 text-sm">(Procesando...)</span>}
                </h3>
                <button 
                  onClick={() => {
                    if (!isProcessingExcel) {
                      setShowExcelModal(false);
                      setExcelFile(null);
                      setExcelValidation(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isProcessingExcel}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              {/* Indicador de progreso */}
              {isProcessingExcel && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center mb-3">
                    <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                    <span className="text-sm font-medium text-blue-800">Procesando archivo Excel...</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-3">
                    <div className="bg-blue-600 h-3 rounded-full animate-pulse" style={{ width: '65%' }}></div>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 space-y-1">
                    <p>• Validando estructura del archivo</p>
                    <p>• Procesando productos en lotes</p>
                    <p>• Actualizando stock en base de datos</p>
                    <p className="font-medium">Esto puede tardar hasta {config?.timeouts?.excel ? Math.round(config.timeouts.excel / 1000) : 45} segundos</p>
                  </div>
                </div>
              )}
              
              <div className="space-y-6">
                {/* PASO 1: DESCARGAR PLANTILLA */}
                <div className="p-5 bg-blue-50 rounded-xl border border-blue-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <Download className="w-5 h-5 mr-2" />
                        Paso 1: Descargar Plantilla
                      </h4>
                      <p className="text-sm text-blue-700 mb-2">
                        Descarga la plantilla con todos los productos y su stock actual
                      </p>
                      <div className="text-xs text-blue-600 space-y-1">
                        <p>• Incluye hasta {config?.limits?.maxRows || 200} productos más utilizados</p>
                        <p>• Stock actual de la sucursal seleccionada</p>
                        <p>• Plantilla pre-configurada para editar fácilmente</p>
                      </div>
                    </div>
                    {!sucursalSeleccionada && (
                      <span className="text-xs bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full">
                        Seleccione sucursal
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={handleDescargarPlantilla}
                    disabled={loadingAction || !sucursalSeleccionada || isProcessingExcel}
                    className="w-full inline-flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    {loadingAction ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generando plantilla...
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 mr-2" />
                        Descargar Plantilla Excel
                      </>
                    )}
                  </button>
                  
                  {!sucursalSeleccionada && (
                    <p className="text-xs text-red-600 mt-2 flex items-center">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Primero seleccione una sucursal en los filtros de arriba
                    </p>
                  )}
                </div>

                {/* PASO 2: SUBIR ARCHIVO */}
                <div className="p-5 bg-green-50 rounded-xl border border-green-200">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-semibold text-green-900 mb-2 flex items-center">
                        <Upload className="w-5 h-5 mr-2" />
                        Paso 2: Subir Archivo Modificado
                      </h4>
                      <p className="text-sm text-green-700 mb-2">
                        Modifica los valores de "Nuevo Stock" y sube el archivo
                      </p>
                      <div className="text-xs text-green-600 space-y-1">
                        <p>• Solo modifique la columna "Nuevo Stock"</p>
                        <p>• Use números enteros positivos (ej: 0, 10, 25)</p>
                        <p>• Máximo {config?.limits?.maxFileSize ? Math.round(config.limits.maxFileSize / 1024 / 1024) : 5}MB y {config?.limits?.maxRows || 200} filas</p>
                      </div>
                    </div>
                    <div className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      Límites: {config?.limits?.maxFileSize ? Math.round(config.limits.maxFileSize / 1024 / 1024) : 5}MB, {config?.limits?.maxRows || 200} filas
                    </div>
                  </div>
                  
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept=".xlsx,.xls"
                    onChange={handleFileSelect}
                    disabled={isProcessingExcel}
                    className="w-full text-sm text-gray-500 file:mr-4 file:py-3 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-green-100 file:text-green-700 hover:file:bg-green-200 disabled:opacity-50 transition-all"
                  />
                  
                  {/* Validación del archivo */}
                  {excelValidation && (
                    <div className="mt-3 p-3 rounded-lg border">
                      {excelValidation.valido ? (
                        <div className="bg-green-50 border-green-200">
                          <div className="flex items-center text-green-800 mb-2">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Archivo válido</span>
                          </div>
                          {excelValidation.advertencias.length > 0 && (
                            <div className="text-xs text-green-700 space-y-1">
                              {excelValidation.advertencias.map((adv, i) => (
                                <p key={i}>⚠️ {adv}</p>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="bg-red-50 border-red-200">
                          <div className="flex items-center text-red-800 mb-2">
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            <span className="font-medium">Archivo inválido</span>
                          </div>
                          <div className="text-xs text-red-700 space-y-1">
                            {excelValidation.errores.map((error, i) => (
                              <p key={i}>❌ {error}</p>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  {excelFile && excelValidation?.valido && (
                    <div className="mt-4 p-4 bg-white rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-sm font-medium text-gray-700 flex items-center">
                            <FileSpreadsheet className="w-4 h-4 mr-2 text-green-600" />
                            {excelFile.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            Tamaño: {(excelFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                        {!isProcessingExcel && (
                          <button
                            onClick={() => {
                              setExcelFile(null);
                              setExcelValidation(null);
                              if (fileInputRef.current) fileInputRef.current.value = '';
                            }}
                            className="text-red-500 hover:text-red-700 p-1 rounded"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      
                      {/* Modo de procesamiento */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Modo de actualización:</label>
                        <select 
                          value={modoExcel} 
                          onChange={(e) => setModoExcel(e.target.value as any)}
                          disabled={isProcessingExcel}
                          className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 disabled:opacity-50 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        >
                          <option value="establecer">📝 Establecer stock (reemplazar valores actuales)</option>
                          <option value="incrementar">➕ Incrementar stock (sumar a valores actuales)</option>
                          <option value="decrementar">➖ Decrementar stock (restar de valores actuales)</option>
                        </select>
                      </div>
                      
                      <button
                        onClick={handleProcesarExcel}
                        disabled={isProcessingExcel || !sucursalSeleccionada}
                        className="w-full inline-flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isProcessingExcel ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Procesando... (puede tardar hasta {config?.timeouts?.excel ? Math.round(config.timeouts.excel / 1000) : 45}s)
                          </>
                        ) : (
                          <>
                            <Upload className="w-4 h-4 mr-2" />
                            Procesar Archivo Excel
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {/* INSTRUCCIONES DETALLADAS */}
                <div className="p-5 bg-yellow-50 rounded-xl border border-yellow-200">
                  <h4 className="font-semibold text-yellow-900 mb-3 flex items-center">
                    <Info className="w-5 h-5 mr-2" />
                    Instrucciones Detalladas
                  </h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm text-yellow-800">
                    <div>
                      <h5 className="font-medium mb-2">✅ Lo que SÍ debe hacer:</h5>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Modificar solo la columna "Nuevo Stock"</li>
                        <li>Usar números enteros positivos</li>
                        <li>Guardar como archivo Excel (.xlsx)</li>
                        <li>Verificar los datos antes de subir</li>
                      </ul>
                    </div>
                    <div>
                      <h5 className="font-medium mb-2">❌ Lo que NO debe hacer:</h5>
                      <ul className="space-y-1 list-disc list-inside">
                        <li>Modificar ID, Código de Barras, Nombre</li>
                        <li>Dejar celdas vacías en "Nuevo Stock"</li>
                        <li>Usar números negativos o decimales</li>
                        <li>Cambiar el formato del archivo</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* LIMITACIONES TÉCNICAS */}
                <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <h4 className="font-medium text-gray-700 mb-3 text-sm flex items-center">
                    <AlertCircle className="w-4 h-4 mr-2" />
                    Limitaciones Técnicas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Tamaño máximo:</div>
                      <div>{config?.limits?.maxFileSize ? Math.round(config.limits.maxFileSize / 1024 / 1024) : 5}MB por archivo</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Filas recomendadas:</div>
                      <div>Máximo {config?.limits?.maxRows || 200} productos</div>
                    </div>
                    <div className="bg-white p-3 rounded-lg">
                      <div className="font-medium text-gray-700 mb-1">Tiempo límite:</div>
                      <div>{config?.timeouts?.excel ? Math.round(config.timeouts.excel / 1000) : 45} segundos máximo</div>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end mt-6 pt-4 border-t border-gray-200">
                <button
                  onClick={() => {
                    if (!isProcessingExcel) {
                      setShowExcelModal(false);
                      setExcelFile(null);
                      setExcelValidation(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }
                  }}
                  disabled={isProcessingExcel}
                  className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  {isProcessingExcel ? 'Procesando...' : 'Cerrar'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Configuración */}
        {showConfigModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Settings className="w-5 h-5 mr-2" />
                Configurar Stock
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
                  <input
                    type="number"
                    value={configData.stockMinimo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMinimo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Máximo</label>
                  <input
                    type="number"
                    value={configData.stockMaximo}
                    onChange={(e) => setConfigData(prev => ({ ...prev, stockMaximo: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                    min="0"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Punto de Reposición</label>
                  <input
                    type="number"
                    value={configData.puntoReposicion}
                    onChange={(e) => setConfigData(prev => ({ ...prev, puntoReposicion: Number(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent"
                    min="0"
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

        {/* Modal de Carga Manual */}
        {showCargaModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                {cargaData.modo === 'incrementar' ? <Plus className="w-5 h-5 mr-2 text-green-600" /> : 
                 cargaData.modo === 'decrementar' ? <Minus className="w-5 h-5 mr-2 text-red-600" /> : 
                 <Equal className="w-5 h-5 mr-2 text-blue-600" />}
                {cargaData.modo === 'incrementar' ? 'Incrementar Stock' : 
                 cargaData.modo === 'decrementar' ? 'Decrementar Stock' : 
                 'Establecer Stock'}
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">Modo de operación</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'incrementar' }))}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'incrementar' 
                          ? 'bg-green-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Sumar
                    </button>
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'decrementar' }))}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'decrementar' 
                          ? 'bg-red-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Minus className="w-4 h-4 mr-1" />
                      Restar
                    </button>
                    <button
                      onClick={() => setCargaData(prev => ({ ...prev, modo: 'establecer' }))}
                      className={`flex items-center justify-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        cargaData.modo === 'establecer' 
                          ? 'bg-blue-500 text-white' 
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      <Equal className="w-4 h-4 mr-1" />
                      Fijar
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
                    min="0"
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-transparent resize-none"
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
                  disabled={loadingAction || !cargaData.productoId || !cargaData.sucursalId || cargaData.cantidad < 0}
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
            <div className="bg-white rounded-xl p-6 max-w-6xl w-full max-h-[80vh] overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Historial de Movimientos de Stock
                </h3>
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
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Producto</th>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Sucursal</th>
                        <th className="p-3 text-center text-xs font-medium text-gray-500 uppercase">Movimiento</th>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="p-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {historialData.map((movimiento, index) => (
                        <tr key={movimiento.id} className="hover:bg-gray-50">
                          <td className="p-3 text-xs">
                            {new Date(movimiento.fecha).toLocaleString()}
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-sm">{movimiento.producto?.nombre || 'N/A'}</div>
                            {movimiento.producto?.codigoBarras && (
                              <div className="text-xs text-gray-500 font-mono">{movimiento.producto.codigoBarras}</div>
                            )}
                          </td>
                          <td className="p-3 text-sm">{movimiento.sucursal.nombre}</td>
                          <td className="p-3 text-center">
                            <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              movimiento.tipoMovimiento === 'entrada' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {movimiento.tipoMovimiento === 'entrada' ? (
                                <Plus className="w-3 h-3 mr-1" />
                              ) : (
                                <Minus className="w-3 h-3 mr-1" />
                              )}
                              {movimiento.tipoMovimiento === 'entrada' ? '+' : '-'}{movimiento.cantidad}
                            </div>
                            <div className="text-xs text-gray-500 mt-1">Final: {movimiento.stockResultante}</div>
                          </td>
                          <td className="p-3 text-sm">{movimiento.usuario?.nombre || 'Sistema'}</td>
                          <td className="p-3 text-xs text-gray-600">{movimiento.motivo}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="text-center py-12">
                    <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Sin historial</h3>
                    <p className="text-gray-500">No hay movimientos registrados para esta sucursal</p>
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