// src/app/(pdv)/pdv/page.tsx - VERSIÓN COMPLETAMENTE REDISEÑADA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { BarcodeScanner } from '@/components/pdv/BarcodeScanner';
import { AperturaModal } from '@/components/pdv/AperturaModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, CheckCircle, X, Package, Search, 
  ArrowLeft, Grid, List, Plus, Heart, Tag, Camera,
  Building2, MapPin, Wifi, WifiOff, Zap
} from 'lucide-react';
import { Producto } from '@/types/models/producto';

type ViewMode = 'categories' | 'products' | 'scanner';

interface Categoria {
  id: string;
  nombre: string;
  imagen?: string;
  _count?: {
    productos: number;
  };
}

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
  const [aperturaInfo, setAperturaInfo] = useState<any>(null);
  const [isLoadingApertura, setIsLoadingApertura] = useState(false);
  const [sucursalInfo, setSucursalInfo] = useState({
    nombre: '',
    direccion: '',
    tipo: ''
  });
  
  // 🆕 NAVEGACIÓN LIMPIA
  const [currentView, setCurrentView] = useState<ViewMode>('categories');
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  
  // Hooks
  const { addItem, items } = useCartStore();
  const { isOnline } = useOffline();

  // 🔄 CARGAR DATOS INICIALES
  useEffect(() => {
    loadInitialData();
    loadSucursalInfo();
    loadFavorites();
  }, []);

  useEffect(() => {
    verificarEstadoCaja();
  }, [isOnline]);

  const loadInitialData = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setShowSucursalModal(true);
        return;
      }

      const response = await authenticatedFetch('/api/admin/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', 'Error al cargar datos');
    }
  };

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

  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteProducts');
    if (saved) {
      setFavorites(new Set(JSON.parse(saved)));
    }
  };

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

const handleCategorySelect = async (categoria: Categoria) => {
  try {
    setIsLoading(true);
    const sucursalId = localStorage.getItem('sucursalId');
    
    console.log(`🔍 Cargando productos de categoría: ${categoria.nombre} (ID: ${categoria.id})`);
    
    const response = await authenticatedFetch(
      `/api/pdv/productos-disponibles?categoriaId=${categoria.id}&sucursalId=${sucursalId}`
    );
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ Productos cargados para "${categoria.nombre}":`, data.length);
      console.log('Productos:', data.map((p: { nombre: any; categoria: { nombre: any; }; }) => `${p.nombre} (Cat: ${p.categoria?.nombre})`));
      
      setProductos(data);
      setSelectedCategory(categoria);
      setCurrentView('products');
    } else {
      const errorData = await response.json();
      console.error('❌ Error del servidor:', errorData);
      showNotification('error', errorData.error || 'Error al cargar productos');
    }
  } catch (error) {
    console.error('❌ Error cargando productos:', error);
    showNotification('error', 'Error al cargar productos');
  } finally {
    setIsLoading(false);
  }
};

  const handleProductSelect = (producto: Producto) => {
    addItem(producto);
    showNotification('success', `"${producto.nombre}" agregado al carrito`);
  };

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

    // 🆕 FUNCIÓN PARA CARGAR INFO DE APERTURA
    const loadAperturaInfo = async () => {
      try {
        setIsLoadingApertura(true);
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          showNotification('error', 'No se ha configurado una sucursal');
          return;
        }
  
        const response = await authenticatedFetch(`/api/pdv/apertura?sucursalId=${encodeURIComponent(sucursalId)}`);
        
        if (response.ok) {
          const data = await response.json();
          setAperturaInfo(data);
          console.log('📊 Información de apertura cargada:', data);
        } else {
          const errorData = await response.json();
          console.error('❌ Error al cargar info de apertura:', errorData);
          showNotification('error', errorData.error || 'Error al cargar información de apertura');
        }
      } catch (error) {
        console.error('❌ Error al cargar información de apertura:', error);
        showNotification('error', 'Error al conectar con el servidor');
      } finally {
        setIsLoadingApertura(false);
      }
    };
  
    // 🔧 CORREGIR FUNCIÓN DE APERTURA
    const handleAbrirCaja = async () => {
      console.log('🚀 Iniciando proceso de apertura de caja...');
      
      // Cargar información de apertura primero
      await loadAperturaInfo();
      
      // Mostrar modal de apertura
      setShowAperturaModal(true);
    };
  
    // 🔧 CORREGIR onComplete DEL MODAL
    const handleAperturaComplete = async (data: { montoInicial: number; recuperarSaldo: boolean }) => {
      try {
        console.log('💰 Ejecutando apertura con datos:', data);
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha configurado una sucursal');
        }
  
        const response = await authenticatedFetch('/api/pdv/apertura', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            sucursalId,
            montoInicial: data.montoInicial,
            recuperarSaldo: data.recuperarSaldo
          })
        });
  
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Error al abrir la caja');
        }
  
        const result = await response.json();
        console.log('✅ Caja abierta exitosamente:', result);
        
        // Cerrar modal
        setShowAperturaModal(false);
        
        // Mostrar notificación de éxito
        showNotification('success', result.message || 'Caja abierta correctamente');
        
        // Verificar estado de caja actualizado
        setTimeout(() => {
          verificarEstadoCaja();
        }, 1000);
        
      } catch (error) {
        console.error('❌ Error en apertura de caja:', error);
        showNotification('error', error instanceof Error ? error.message : 'Error desconocido al abrir caja');
        throw error; // Re-throw para que el modal maneje el error
      }
    };  

  const handleBarcodeScanned = async (code: string) => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      const response = await authenticatedFetch(`/api/productos/barcode?code=${encodeURIComponent(code)}&sucursalId=${sucursalId}`);
      
      if (!response.ok) {
        throw new Error('Producto no encontrado');
      }
      
      const producto = await response.json();
      handleProductSelect(producto);
    } catch (error) {
      console.error('Error al buscar producto:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al buscar producto');
    }
  };

  const handleCheckout = () => {
    if (hayCajaAbierta === false) {
      showNotification('error', 'No hay una caja abierta. Debe abrir la caja antes de realizar ventas.');
      return;
    }
    
    if (items.length === 0) {
      showNotification('warning', 'El carrito está vacío.');
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

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString();
    setNotification({ type, message, id });
    
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 4000);
    }
  };

  // 🎨 RENDERIZAR CONTENIDO PRINCIPAL
  const renderMainContent = () => {
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

    if (hayCajaAbierta === false) {
      return (
        <div className="h-full flex items-center justify-center p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="text-center bg-white p-12 rounded-3xl shadow-xl border border-gray-200 max-w-2xl w-full">
            <div className="w-24 h-24 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-3xl flex items-center justify-center mx-auto mb-8">
              <Package className="w-12 h-12 text-white" />
            </div>
            
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Caja Cerrada</h2>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              Para comenzar a realizar ventas, necesitas abrir la caja registradora del día.
            </p>
            
            <button
              onClick={handleAbrirCaja} // 🔧 USAR NUEVA FUNCIÓN
              disabled={isLoadingApertura}
              className="w-full py-4 px-8 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-2xl hover:from-[#462625] hover:to-[#311716] transition-all font-bold text-lg flex items-center justify-center space-x-3 shadow-lg hover:shadow-xl disabled:opacity-50"
            >
              {isLoadingApertura ? (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                  <span>Preparando...</span>
                </>
              ) : (
                <>
                  <Zap className="w-6 h-6" />
                  <span>Abrir Caja del Día</span>
                </>
              )}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
        {/* Header Superior */}
        <div className="bg-white shadow-sm border-b border-gray-200 p-4 lg:p-6">
          <div className="flex items-center justify-between">
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

            <div className="flex items-center space-x-4">
              <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl border border-green-200">
                <span className="text-sm font-medium">Caja Abierta</span>
              </div>
            </div>
          </div>
        </div>

        {/* Layout Principal */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* Panel Principal */}
          <div className="flex-1 flex flex-col min-w-0 bg-white">
            {renderCurrentView()}
          </div>
          
          {/* Carrito */}
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

  // 🆕 RENDERIZAR VISTA ACTUAL
  const renderCurrentView = () => {
    switch (currentView) {
      case 'categories':
        return renderCategoriesView();
      case 'products':
        return renderProductsView();
      case 'scanner':
        return renderScannerView();
      default:
        return renderCategoriesView();
    }
  };

  // 🆕 VISTA DE CATEGORÍAS
  const renderCategoriesView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">¿Qué estás buscando?</h2>
        <button
          onClick={() => setCurrentView('scanner')}
          className="flex items-center space-x-2 px-4 py-2 bg-[#311716] text-white rounded-xl hover:bg-[#462625] transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span>Escáner</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
        {categorias.map((categoria) => (
          <div
            key={categoria.id}
            onClick={() => handleCategorySelect(categoria)}
            className="group cursor-pointer bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-[#eeb077] transform hover:scale-105"
          >
            <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
              {categoria.imagen ? (
                <img
                  src={categoria.imagen}
                  alt={categoria.nombre}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Package className="w-16 h-16 text-gray-400" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/70 to-transparent">
                <h3 className="text-white text-xl font-bold text-center mb-1">
                  {categoria.nombre}
                </h3>
                {categoria._count && (
                  <p className="text-white/80 text-sm text-center">
                    {categoria._count.productos} productos
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  // 🆕 VISTA DE PRODUCTOS
  const renderProductsView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('categories')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Categorías</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-2xl font-bold text-gray-900">{selectedCategory?.nombre}</h2>
        </div>
        
        <button
          onClick={() => setCurrentView('scanner')}
          className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
        >
          <Camera className="w-5 h-5" />
          <span>Escáner</span>
        </button>
      </div>

      {/* Búsqueda en productos */}
      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
          />
        </div>
      </div>

      {/* Grid de productos */}
      <div className="grid grid-cols-3 gap-6">
        {productos
          .filter(product => 
            product.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.descripcion?.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onSelect={handleProductSelect}
              onToggleFavorite={toggleFavorite}
              isFavorite={favorites.has(product.id)}
            />
          ))}
      </div>
    </div>
  );

  // 🆕 VISTA DEL ESCÁNER
  const renderScannerView = () => (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setCurrentView('categories')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Volver</span>
          </button>
          <div className="h-6 w-px bg-gray-300"></div>
          <h2 className="text-2xl font-bold text-gray-900">Escáner de Códigos</h2>
        </div>
      </div>

      <BarcodeScanner 
        onScan={handleBarcodeScanned}
        onError={(error) => showNotification('error', `Error del scanner: ${error.message}`)}
        autoStart={true}
        className="bg-white rounded-xl"
      />
    </div>
  );

  return (
    <>
      {renderMainContent()}

      {/* Modales */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />

<AperturaModal
        isOpen={showAperturaModal}
        onClose={() => setShowAperturaModal(false)}
        onComplete={handleAperturaComplete} // 🔧 USAR NUEVA FUNCIÓN
        aperturaInfo={aperturaInfo}
      />

      {/* Notificaciones */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
    </>
  );
}

// 🆕 COMPONENTE DE PRODUCTO SIMPLIFICADO
interface ProductCardProps {
  product: Producto;
  onSelect: (product: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}

function ProductCard({ product, onSelect, onToggleFavorite, isFavorite }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const stockValue = product.stock ?? 0;

  return (
    <div
      className="cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 group hover:scale-105"
    >
      {/* Imagen */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {product.imagen && !imageError ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-4 left-4 right-4 flex justify-between items-start">
          <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${
            stockValue > 5 ? 'bg-green-500' : stockValue > 0 ? 'bg-amber-500' : 'bg-red-500'
          }`}>
            {stockValue} disp.
          </span>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(product.id);
            }}
            className={`p-2 rounded-full transition-all ${
              isFavorite 
                ? 'bg-red-500 text-white scale-110' 
                : 'bg-white/90 text-gray-600 hover:bg-red-50 hover:text-red-500'
            }`}
          >
            <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        {/* Overlay con acción */}
        <div 
          onClick={() => onSelect(product)}
          className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center"
        >
          <button
            disabled={stockValue === 0}
            className="bg-white text-[#311716] px-6 py-3 rounded-xl font-bold hover:bg-gray-100 disabled:opacity-50 transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Plus className="w-4 h-4" />
            <span>Agregar</span>
          </button>
        </div>
      </div>
      
      {/* Información */}
      <div className="p-6">
        <h4 className="font-bold text-gray-900 text-lg mb-2 min-h-[3.5rem] leading-tight">
          {product.nombre}
        </h4>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-[#311716]">
            ${product.precio.toFixed(2)}
          </span>

          {product.categoria && (
            <span className="flex items-center text-xs bg-blue-100 text-blue-700 px-3 py-2 rounded-full">
              <Tag className="h-3 w-3 mr-1" />
              {product.categoria.nombre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// 📢 COMPONENTE DE NOTIFICACIÓN
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
    warning: <AlertCircle className="w-6 h-6" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200'
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md">
      <div className={`p-6 rounded-2xl border shadow-xl ${colors[notification.type]} transform transition-all duration-300`}>
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