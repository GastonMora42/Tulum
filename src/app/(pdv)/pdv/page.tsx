// src/app/(pdv)/pdv/page.tsx - VERSIÓN CORREGIDA COMPLETA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { BarcodeScanner } from '@/components/pdv/BarcodeScanner';
import { AperturaModal } from '@/components/pdv/AperturaModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, CheckCircle, X, Package, ShoppingCart as CartIcon, 
  Search, Grid, List, Star, TrendingUp, Clock, Zap, AlertTriangle,
  Camera, Scan, Plus, Minus, Heart, Tag, Users, Building2, MapPin,
  RefreshCw, Wifi, WifiOff, Settings, BarChart3, DollarSign
} from 'lucide-react';
import { Producto } from '@/types/models/producto';

type ViewMode = 'grid' | 'list';
type SortMode = 'name' | 'price' | 'popularity' | 'recent';

export default function PDVPage() {
  // Estados principales
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'info' | 'warning'; 
    message: string; 
    id: string;
  } | null>(null);
  
  // Estados de caja y configuración
  const [hayCajaAbierta, setHayCajaAbierta] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [showAperturaModal, setShowAperturaModal] = useState(false);
  const [aperturaInfo, setAperturaInfo] = useState<{
    sugerenciaApertura: number;
    requiereRecupero: boolean;
    saldoPendiente: number;
    ultimoCierre?: any;
  } | null>(null);
  const [sucursalInfo, setSucursalInfo] = useState({
    nombre: '',
    direccion: '',
    tipo: ''
  });
  
  // Estados de productos y categorías
  const [categorias, setCategorias] = useState<any[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('name');
  const [productsPerPage] = useState(8);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreProducts, setHasMoreProducts] = useState(false);

  // Estados de UI
  const [showScanner, setShowScanner] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { addItem, items, getTotal } = useCartStore();
  const { isOnline, pendingOperations } = useOffline();

  // 🔧 FUNCIÓN CORREGIDA - Verificar estado de caja abierta
  const verificarEstadoCaja = async () => {
    try {
      setIsLoading(true);
      const sucursalId = localStorage.getItem('sucursalId');
      
      if (!sucursalId) {
        setShowSucursalModal(true);
        setIsLoading(false);
        return;
      }
      
      if (!isOnline) {
        setHayCajaAbierta(true);
        setIsLoading(false);
        return;
      }
      
      const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${encodeURIComponent(sucursalId)}`);
      
      if (response.status === 404) {
        setHayCajaAbierta(false);
      } else if (response.ok) {
        const data = await response.json();
        setHayCajaAbierta(data.cierreCaja?.estado === 'abierto');
      } else {
        setHayCajaAbierta(null);
      }
    } catch (error) {
      console.error('Error al verificar caja:', error);
      setHayCajaAbierta(null);
      showNotification('error', 'Error al verificar el estado de la caja');
    } finally {
      setIsLoading(false);
    }
  };

  // 🔧 FUNCIÓN CORREGIDA - Verificar información de apertura
  const verificarInfoApertura = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setShowSucursalModal(true);
        return;
      }

      const response = await authenticatedFetch(`/api/pdv/apertura?sucursalId=${encodeURIComponent(sucursalId)}`);
      
      if (response.ok) {
        const data = await response.json();
        setAperturaInfo(data);
        
        console.log('Información de apertura:', data);
        
        if (data.requiereRecupero) {
          showNotification('warning', 
            `Turno anterior con saldo pendiente: $${data.saldoPendiente.toFixed(2)}`
          );
        }
      }
    } catch (error) {
      console.error('Error al verificar apertura:', error);
      showNotification('error', 'Error al verificar información de apertura');
    }
  };

  // 📊 Cargar información de sucursal
  const loadSucursalInfo = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      const sucursalNombre = localStorage.getItem('sucursalNombre');
      const sucursalDireccion = localStorage.getItem('sucursalDireccion');
      const sucursalTipo = localStorage.getItem('sucursalTipo');
      
      if (sucursalId) {
        setSucursalInfo({
          nombre: sucursalNombre || 'Punto de Venta',
          direccion: sucursalDireccion || 'Dirección no especificada',
          tipo: sucursalTipo || 'punto_venta'
        });
      }
    } catch (error) {
      console.error('Error al cargar información de sucursal:', error);
    }
  };

  const loadInitialData = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setShowSucursalModal(true);
        return;
      }

      const [categoriasResp, productosResp] = await Promise.all([
        authenticatedFetch('/api/admin/categorias'),
        authenticatedFetch(`/api/pdv/productos-disponibles?sucursalId=${sucursalId}`)
      ]);

      if (categoriasResp.ok) {
        const categoriasData = await categoriasResp.json();
        setCategorias(categoriasData);
      }

      if (productosResp.ok) {
        const productosData = await productosResp.json();
        setProductos(productosData);
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
      showNotification('error', 'Error al cargar datos');
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteProducts');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  };

  // 🔧 FUNCIÓN CORREGIDA - Manejar apertura de caja
  const handleAbrirCaja = async () => {
    console.log('🎯 handleAbrirCaja llamado');
    try {
      await verificarInfoApertura();
      console.log('✅ verificarInfoApertura completado, abriendo modal');
      setShowAperturaModal(true);
    } catch (error) {
      console.error('Error al preparar apertura:', error);
      showNotification('error', 'Error al preparar apertura de caja');
    }
  };

  // Debug de estados
  useEffect(() => {
    console.log('🔍 Estado actual:', {
      hayCajaAbierta,
      isLoading,
      showAperturaModal,
      aperturaInfo: !!aperturaInfo,
      sucursalId: localStorage.getItem('sucursalId')
    });
  }, [hayCajaAbierta, isLoading, showAperturaModal, aperturaInfo]);

  // 🔧 FUNCIÓN CORREGIDA - Completar apertura
  const handleAperturaComplete = async (aperturaData: {
    montoInicial: number;
    recuperarSaldo: boolean;
  }) => {
    console.log('🎯 handleAperturaComplete LLAMADO con:', aperturaData);
    
    try {
      setIsLoading(true);
      const sucursalId = localStorage.getItem('sucursalId');
      
      console.log('📍 SucursalId obtenido:', sucursalId);
      
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      console.log('📡 Enviando solicitud de apertura...');
      
      const response = await authenticatedFetch('/api/pdv/apertura', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sucursalId,
          montoInicial: aperturaData.montoInicial,
          recuperarSaldo: aperturaData.recuperarSaldo
        })
      });
      
      console.log('📨 Response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Error del servidor' }));
        console.error('❌ Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al abrir la caja');
      }
      
      const result = await response.json();
      console.log('✅ Resultado exitoso:', result);
      
      setHayCajaAbierta(true);
      setShowAperturaModal(false);
      
      showNotification('success', result.message || '¡Caja abierta correctamente!');
      
      setTimeout(() => {
        verificarEstadoCaja();
        verificarInfoApertura();
      }, 1000);
      
    } catch (error) {
      console.error('❌ Error en handleAperturaComplete:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al abrir la caja');
    } finally {
      setIsLoading(false);
    }
  };

  const filterAndSortProducts = useCallback(() => {
    let filtered = [...productos];
    
    // Filtro por categoría
    if (activeCategory !== 'todos') {
      filtered = filtered.filter(p => p.categoriaId === activeCategory);
    }
    
    // Filtro por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.descripcion?.toLowerCase().includes(term) ||
        p.codigoBarras?.includes(term)
      );
    }
    
    // Ordenación
    filtered.sort((a, b) => {
      switch (sortMode) {
        case 'name':
          return a.nombre.localeCompare(b.nombre);
        case 'price':
          return a.precio - b.precio;
        case 'popularity':
          return (favorites.has(b.id) ? 1 : 0) - (favorites.has(a.id) ? 1 : 0);
        case 'recent':
          return Math.random() - 0.5;
        default:
          return 0;
      }
    });
    
    // Aplicar paginación
    const totalProducts = filtered.length;
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const paginatedProducts = filtered.slice(0, endIndex);
    
    setHasMoreProducts(endIndex < totalProducts);
    setFilteredProducts(paginatedProducts);
  }, [productos, activeCategory, searchTerm, sortMode, favorites, currentPage, productsPerPage]);

  const loadMoreProducts = () => {
    if (hasMoreProducts) {
      setCurrentPage(prev => prev + 1);
    }
  };

  // 🛒 Manejo de productos
  const handleProductSelect = (producto: Producto) => {
    if (!hasStock(producto)) {
      showNotification('warning', `"${producto.nombre}" sin stock disponible`);
      return;
    }
    
    addItem(producto);
    showNotification('success', `"${producto.nombre}" agregado al carrito`);
    
    // Efecto visual
    setRecentlyAdded(prev => new Set([...prev, producto.id]));
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(producto.id);
        return newSet;
      });
    }, 2000);
  };

  const hasStock = useCallback((producto: Producto): boolean => {
    return (producto.stock ?? 0) > 0;
  }, []);

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavorites(newFavorites);
    localStorage.setItem('favoriteProducts', JSON.stringify(Array.from(newFavorites)));
  };

  const handleBarcodeScanned = async (code: string) => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      const response = await authenticatedFetch(`/api/productos/barcode?code=${encodeURIComponent(code)}&sucursalId=${sucursalId}`);
      
      if (!response.ok) {
        throw new Error('Producto no encontrado');
      }
      
      const producto = await response.json();
      handleProductSelect(producto);
    } catch (error) {
      console.error('Error al buscar producto por código de barras:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al buscar producto');
    }
  };

  // 💰 Checkout
  const handleCheckout = () => {
    if (hayCajaAbierta === null) {
      showNotification('warning', 'Verificando estado de la caja...');
      verificarEstadoCaja();
      return;
    }
    
    if (hayCajaAbierta === false) {
      showNotification('error', 'No hay una caja abierta. Debe abrir la caja antes de realizar ventas.');
      return;
    }
    
    if (items.length === 0) {
      showNotification('warning', 'El carrito está vacío. Agregue productos antes de proceder.');
      return;
    }
    
    setIsCheckoutOpen(true);
  };

  const handleCheckoutComplete = (result: { success: boolean; message?: string }) => {
    if (result.message) {
      showNotification(result.success ? 'success' : 'error', result.message);
    }
    
    if (result.success) {
      setTimeout(() => verificarEstadoCaja(), 500);
    }
  };

  // 📢 Notificaciones
  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString();
    setNotification({ type, message, id });
    
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // 🎯 Efectos de inicialización
  useEffect(() => {
    loadInitialData();
    loadSucursalInfo();
    loadFavorites();
    verificarInfoApertura();
  }, []);

  useEffect(() => {
    verificarEstadoCaja();
  }, [isOnline]);

  useEffect(() => {
    filterAndSortProducts();
  }, [productos, activeCategory, searchTerm, sortMode]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategory, searchTerm, sortMode]);

  // 🔧 FUNCIÓN PARA RENDERIZAR CONTENIDO PRINCIPAL
  const renderMainContent = () => {
    // 🖥️ Pantalla de loading
    if (isLoading) {
      return (
        <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center">
            <div className="w-20 h-20 border-4 border-gray-200 border-t-[#311716] rounded-full animate-spin mx-auto mb-6"></div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Configurando PDV</h2>
            <p className="text-gray-600">Preparando el sistema de ventas...</p>
          </div>
        </div>
      );
    }

    // 🖥️ Pantalla de caja cerrada
    if (hayCajaAbierta === false) {
      return (
        <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-200 max-w-2xl w-full">
            <div className="w-24 h-24 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Clock className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Caja Cerrada</h2>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              Para comenzar a realizar ventas, necesitas abrir la caja registradora del día.
            </p>
            
            {aperturaInfo && (
              <div className="mb-8 space-y-4">
                {aperturaInfo.requiereRecupero && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
                    <div className="flex items-center justify-center mb-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 mr-2" />
                      <span className="font-semibold text-yellow-800">Recupero Requerido</span>
                    </div>
                    <p className="text-yellow-700 text-sm">
                      El turno anterior tiene un saldo pendiente de <strong>${aperturaInfo.saldoPendiente.toFixed(2)}</strong>
                    </p>
                    {aperturaInfo.ultimoCierre && (
                      <p className="text-yellow-600 text-xs mt-2">
                        Cierre del {new Date(aperturaInfo.ultimoCierre.fechaCierre).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
                
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6">
                  <div className="flex items-center justify-center mb-3">
                    <DollarSign className="w-6 h-6 text-blue-600 mr-2" />
                    <span className="font-semibold text-blue-800">Sugerencia de Apertura</span>
                  </div>
                  <p className="text-blue-700">
                    Monto recomendado: <strong>${aperturaInfo.sugerenciaApertura.toFixed(2)}</strong>
                  </p>
                  <p className="text-blue-600 text-sm mt-1">
                    {aperturaInfo.requiereRecupero 
                      ? `Incluye $${aperturaInfo.saldoPendiente.toFixed(2)} de recupero + $${(aperturaInfo.sugerenciaApertura - aperturaInfo.saldoPendiente).toFixed(2)} de cambio`
                      : 'Monto suficiente para cambio durante el día'
                    }
                  </p>
                </div>
              </div>
            )}
            
            <div className="space-y-4">
              <button
                onClick={() => {
                  console.log('🖱️ Click en Abrir Caja del Día');
                  handleAbrirCaja();
                }}
                disabled={isLoading}
                className="w-full py-4 px-8 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl hover:from-[#462625] hover:to-[#311716] transition-all font-bold text-lg flex items-center justify-center space-x-3 disabled:opacity-50 shadow-lg hover:shadow-xl"
              >
                <Zap className="w-6 h-6" />
                <span>{isLoading ? 'Preparando...' : 'Abrir Caja del Día'}</span>
              </button>
              
              <button
                onClick={() => {
                  verificarEstadoCaja();
                  verificarInfoApertura();
                }}
                className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Verificar Estado de Caja
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 🖥️ Pantalla de estado desconocido
    if (hayCajaAbierta === null) {
      return (
        <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-200 max-w-lg w-full">
            <div className="w-24 h-24 bg-gradient-to-br from-amber-500 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-8">
              <AlertTriangle className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Verificando Estado</h2>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              No se pudo verificar el estado de la caja. Esto puede deberse a problemas de conectividad.
            </p>
            
            <div className="space-y-4">
              <button
                onClick={verificarEstadoCaja}
                disabled={isLoading}
                className="w-full py-4 px-8 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 transition-all font-bold text-lg flex items-center justify-center space-x-3 disabled:opacity-50 shadow-lg"
              >
                <RefreshCw className={`w-6 h-6 ${isLoading ? 'animate-spin' : ''}`} />
                <span>{isLoading ? 'Verificando...' : 'Reintentar Verificación'}</span>
              </button>
              
              <button
                onClick={handleAbrirCaja}
                className="w-full py-3 px-6 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-all font-medium"
              >
                Abrir Nueva Caja
              </button>
            </div>
          </div>
        </div>
      );
    }

    // 🎨 INTERFAZ PRINCIPAL - CAJA ABIERTA
    return (
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* 📱 Header Superior - Información de Sucursal y Estado */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
            {/* Info de sucursal */}
            <div className="flex items-center space-x-4">
              <div className="w-14 h-14 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-2xl flex items-center justify-center">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{sucursalInfo.nombre}</h1>
                <div className="flex items-center space-x-3 text-sm text-gray-500">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{sucursalInfo.direccion}</span>
                  </div>
                  <span>•</span>
                  <div className="flex items-center space-x-1">
                    {isOnline ? (
                      <>
                        <Wifi className="w-4 h-4 text-green-500" />
                        <span className="text-green-600">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-600">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Estado y acciones rápidas */}
            <div className="flex items-center space-x-4">
              {pendingOperations > 0 && (
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-xl border border-amber-200">
                  <span className="text-sm font-medium">{pendingOperations} pendientes</span>
                </div>
              )}
              
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl border border-green-200">
                <span className="text-sm font-medium">Caja Abierta</span>
              </div>
            </div>
          </div>
        </div>

        {/* 🖥️ LAYOUT PRINCIPAL OPTIMIZADO PARA TABLET */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* 📋 PANEL IZQUIERDO - Búsqueda y Productos */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            
            {/* Barra de herramientas de productos */}
            <div className="p-6 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Package className="w-6 h-6 text-[#311716]" />
                  <h2 className="text-xl font-bold text-gray-900">Productos</h2>
                  <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-medium">
                    {filteredProducts.length}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  {/* Controles de vista */}
                  <div className="flex items-center bg-gray-200 rounded-xl p-1">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'grid' 
                          ? 'bg-white text-[#311716] shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Grid className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={`p-3 rounded-lg transition-all ${
                        viewMode === 'list' 
                          ? 'bg-white text-[#311716] shadow-sm' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <List className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Botón de scanner */}
                  <button
                    onClick={() => setShowScanner(!showScanner)}
                    className={`p-3 rounded-xl transition-all flex items-center space-x-2 ${
                      showScanner
                        ? 'bg-[#311716] text-white shadow-lg'
                        : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
                    }`}
                    title="Activar escáner de código de barras"
                  >
                    <svg 
                      className="w-7 h-7" 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path 
                        strokeLinecap="round" 
                        strokeLinejoin="round" 
                        strokeWidth={2} 
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h2M4 4h4m12 0h2M4 20h4m12 0h2" 
                      />
                    </svg>
                    <span className="hidden lg:inline text-sm font-medium">Escáner</span>
                  </button>
                </div>
              </div>
              
              {/* Búsqueda principal */}
              <ProductSearch 
                onProductSelect={handleProductSelect}
                className="mb-4"
              />
              
              {/* Categorías horizontales */}
              <div className="flex items-center space-x-3 overflow-x-auto pb-2">
                <button
                  onClick={() => setActiveCategory('todos')}
                  className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all ${
                    activeCategory === 'todos'
                      ? 'bg-[#311716] text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  Todos ({productos.length})
                </button>
                
                {categorias.map(categoria => (
                  <button
                    key={categoria.id}
                    onClick={() => setActiveCategory(categoria.id)}
                    className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all ${
                      activeCategory === categoria.id
                        ? 'bg-[#311716] text-white shadow-lg'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {categoria.nombre} ({productos.filter(p => p.categoriaId === categoria.id).length})
                  </button>
                ))}
              </div>
              
              {/* Ordenación */}
              <div className="flex items-center justify-between mt-4">
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-600 font-medium">Ordenar por:</span>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077] bg-white"
                  >
                    <option value="name">Nombre</option>
                    <option value="price">Precio</option>
                    <option value="popularity">Popularidad</option>
                    <option value="recent">Recientes</option>
                  </select>
                </div>
              </div>
            </div>
            
            {/* Scanner expandible */}
            {showScanner && (
              <div className="p-6 bg-yellow-50 border-b border-yellow-200">
                <BarcodeScanner 
                  onScan={handleBarcodeScanned}
                  onError={(error) => showNotification('error', `Error del scanner: ${error.message}`)}
                  autoStart={true}
                  className="bg-white rounded-xl"
                />
              </div>
            )}
            
            {/* Grid de productos optimizado */}
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-6">
                {filteredProducts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center py-12">
                    <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-6">
                      <Package className="w-12 h-12 text-gray-400" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-3">No se encontraron productos</h3>
                    <p className="text-gray-500 max-w-md">
                      {searchTerm || activeCategory !== 'todos' 
                        ? 'Intenta ajustar los filtros de búsqueda'
                        : 'No hay productos disponibles en este momento'
                      }
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Grid de productos */}
                    <div className={`${
                      viewMode === 'grid' 
                        ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
                        : 'space-y-4'
                    }`}>
                      {filteredProducts.map(producto => (
                        <ProductCard
                          key={producto.id}
                          producto={producto}
                          viewMode={viewMode}
                          onSelect={handleProductSelect}
                          onToggleFavorite={toggleFavorite}
                          isFavorite={favorites.has(producto.id)}
                          isRecentlyAdded={recentlyAdded.has(producto.id)}
                        />
                      ))}
                    </div>
                    
                    {/* Botón para cargar más productos */}
                    {hasMoreProducts && (
                      <div className="flex justify-center py-8">
                        <button
                          onClick={loadMoreProducts}
                          className="px-8 py-4 bg-white border-2 border-[#311716] text-[#311716] rounded-2xl hover:bg-[#311716] hover:text-white transition-all font-semibold flex items-center space-x-3 shadow-lg hover:shadow-xl"
                        >
                          <Plus className="w-5 h-5" />
                          <span>Cargar más productos</span>
                          <span className="bg-[#311716] text-white px-2 py-1 rounded-full text-xs">
                            {productsPerPage}+
                          </span>
                        </button>
                      </div>
                    )}
                    
                    {/* Indicador de total de productos */}
                    <div className="text-center py-4 border-t border-gray-200 bg-gray-50 rounded-xl">
                      <p className="text-sm text-gray-600">
                        Mostrando {filteredProducts.length} de {productos.filter(p => {
                          if (activeCategory !== 'todos' && p.categoriaId !== activeCategory) return false;
                          if (searchTerm) {
                            const term = searchTerm.toLowerCase();
                            return p.nombre.toLowerCase().includes(term) ||
                                   p.descripcion?.toLowerCase().includes(term) ||
                                   p.codigoBarras?.includes(term);
                          }
                          return true;
                        }).length} productos
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* 🔄 CARRITO CON ANCHO REDUCIDO */}
          <div className="w-80 xl:w-96 border-l border-gray-200 bg-white">
            <CartDisplay 
              onCheckout={handleCheckout} 
              className="h-full"
            />
          </div>
        </div>
      </div>
    );
  };

  // 🎨 RENDER PRINCIPAL - ESTRUCTURA CORREGIDA
  return (
    <>
      {/* 🔧 CONTENIDO PRINCIPAL */}
      {renderMainContent()}

      {/* 🔧 MODALES - SIEMPRE RENDERIZADOS */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />

      <SucursalSetupModal
        isOpen={showSucursalModal}
        onClose={(sucursalId) => {
          setShowSucursalModal(false);
          if (sucursalId) window.location.reload();
        }}
      />

      {/* 🚨 APERTURA MODAL - SIEMPRE RENDERIZADO */}
      <AperturaModal
        isOpen={showAperturaModal}
        onClose={() => {
          console.log('🔴 Cerrando AperturaModal');
          setShowAperturaModal(false);
        }}
        onComplete={handleAperturaComplete}
        aperturaInfo={aperturaInfo}
      />

      {/* 📢 NOTIFICACIONES - SIEMPRE RENDERIZADAS */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

// 🎨 COMPONENTE DE TARJETA DE PRODUCTO REDISEÑADO
interface ProductCardProps {
  producto: Producto;
  viewMode: ViewMode;
  onSelect: (producto: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  isRecentlyAdded: boolean;
}

function ProductCard({ 
  producto, 
  viewMode, 
  onSelect, 
  onToggleFavorite, 
  isFavorite,
  isRecentlyAdded 
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const stockValue = producto.stock ?? 0;
  const hasStock = stockValue > 0;

  if (viewMode === 'list') {
    return (
      <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 p-6 hover:shadow-lg transition-all duration-300 ${
        isRecentlyAdded ? 'ring-2 ring-green-400 bg-green-50' : ''
      }`}>
        <div className="flex items-center space-x-6">
          {/* Imagen */}
          <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
            {producto.imagen && !imageError ? (
              <img 
                src={producto.imagen} 
                alt={producto.nombre}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-8 w-8 text-gray-400" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate mb-2">{producto.nombre}</h3>
            {producto.descripcion && (
              <p className="text-sm text-gray-500 truncate mb-3">{producto.descripcion}</p>
            )}
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <span className="text-2xl font-bold text-[#311716]">
                  ${producto.precio.toFixed(2)}
                </span>
                
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                  stockValue > 5 
                    ? 'bg-green-100 text-green-700' 
                    : stockValue > 0 
                    ? 'bg-amber-100 text-amber-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  Stock: {stockValue}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => onToggleFavorite(producto.id)}
                  className={`p-3 rounded-xl transition-all ${
                    isFavorite 
                      ? 'text-red-500 bg-red-50 hover:bg-red-100' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={() => onSelect(producto)}
                  disabled={!hasStock}
                  className="px-6 py-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium flex items-center space-x-2 text-lg"
                >
                  <Plus className="w-5 h-5" />
                  <span>Agregar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-xl transition-all duration-300 group ${
      isRecentlyAdded ? 'ring-2 ring-green-400 bg-green-50' : ''
    }`}>
      {/* Imagen del producto */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {producto.imagen && !imageError ? (
          <img 
            src={producto.imagen} 
            alt={producto.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-16 h-16 text-gray-400" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <div className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
            stockValue > 5 
              ? 'bg-green-500' 
              : stockValue > 0 
              ? 'bg-amber-500' 
              : 'bg-red-500'
          }`}>
            {hasStock ? `${stockValue} disp.` : 'Agotado'}
          </div>
          
          <button
            onClick={() => onToggleFavorite(producto.id)}
            className={`p-2 rounded-full transition-all ${
              isFavorite 
                ? 'bg-red-500 text-white scale-110' 
                : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        {/* Overlay con botón de acción rápida */}
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
          <button
            onClick={() => onSelect(producto)}
            disabled={!hasStock}
            className="bg-white text-[#311716] px-8 py-4 rounded-2xl font-bold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-3 shadow-xl text-lg"
          >
            <Zap className="w-6 h-6" />
            <span>{hasStock ? 'Agregar al Carrito' : 'Sin Stock'}</span>
          </button>
        </div>
      </div>
      
      {/* Información del producto */}
      <div className="p-6">
        <h3 className="font-bold text-gray-900 text-lg mb-2 line-clamp-2">
          {producto.nombre}
        </h3>
        
        {producto.descripcion && (
          <p className="text-sm text-gray-500 mb-4 line-clamp-2">
            {producto.descripcion}
          </p>
        )}

        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-[#311716]">
            ${producto.precio.toFixed(2)}
          </span>

          <button
            onClick={() => onSelect(producto)}
            disabled={!hasStock}
            className="p-4 bg-[#311716] text-white rounded-2xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-6 h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

// 📢 COMPONENTE DE NOTIFICACIÓN MEJORADO
interface NotificationToastProps {
  notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    id: string;
  };
  onClose: () => void;
}

function NotificationToast({ notification, onClose }: NotificationToastProps) {
  const icons = {
    success: <CheckCircle className="w-6 h-6" />,
    error: <AlertCircle className="w-6 h-6" />,
    info: <AlertCircle className="w-6 h-6" />,
    warning: <AlertTriangle className="w-6 h-6" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200'
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md">
      <div className={`p-6 rounded-2xl border shadow-xl ${colors[notification.type]} transform transition-all duration-300 animate-in slide-in-from-right`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-4">
            {icons[notification.type]}
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">{notification.message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 flex-shrink-0 p-2 rounded-xl hover:bg-black/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}