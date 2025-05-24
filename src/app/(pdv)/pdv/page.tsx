// src/app/(pdv)/pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { BarcodeScanner } from '@/components/pdv/BarcodeScanner';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, CheckCircle, X, QrCode, Package, Grid, Layers, 
  ShoppingCart as CartIcon, Star, TrendingUp, Clock, Zap,
  Filter, Search, ChevronDown, ArrowRight
} from 'lucide-react';
import { Producto } from '@/types/models/producto';

export default function PDVPage() {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [hayCajaAbierta, setHayCajaAbierta] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  const [categoriasProductos, setCategoriasProductos] = useState<any[]>([]);
  const [productosPopulares, setProductosPopulares] = useState<Producto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [isMobileView, setIsMobileView] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [currentView, setCurrentView] = useState<'products' | 'cart'>('products');
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const { addItem, items, getTotal } = useCartStore();
  const { isOnline } = useOffline();
  
  // Verificar el tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth < 768;
      setIsMobileView(isMob);
      if (!isMob) setCurrentView('products');
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  // Verificar si hay caja abierta
  useEffect(() => {
    const checkCajaAbierta = async () => {
      try {
        setIsLoading(true);
        
        const sucursalId = localStorage.getItem('sucursalId');
        
        if (!sucursalId) {
          setShowSucursalModal(true);
          return;
        }
        
        if (!isOnline) {
          setHayCajaAbierta(true);
          return;
        }
        
        const response = await authenticatedFetch(`/api/pdv/cierre?sucursalId=${sucursalId}`);
        
        if (response.status === 404) {
          setHayCajaAbierta(false);
        } else if (response.ok) {
          setHayCajaAbierta(true);
        } else {
          const data = await response.json();
          throw new Error(data.error || 'Error al verificar el estado de la caja');
        }

        // Cargar categorías de productos
        const categoriasResponse = await authenticatedFetch('/api/admin/categorias');
        if (categoriasResponse.ok) {
          const categoriasData = await categoriasResponse.json();
          setCategoriasProductos(categoriasData);
        }

        // Cargar productos populares
        const popularesResponse = await authenticatedFetch(`/api/pdv/productos-disponibles?popular=true&sucursalId=${sucursalId}`);
        if (popularesResponse.ok) {
          const popularesData = await popularesResponse.json();
          setProductosPopulares(popularesData.slice(0, 12));
        }
      } catch (error) {
        console.error('Error al verificar caja:', error);
        setNotification({
          type: 'error',
          message: error instanceof Error ? error.message : 'Error al verificar el estado de la caja'
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    checkCajaAbierta();
  }, [isOnline]);

  // Función para abrir caja
  const handleAbrirCaja = async () => {
    try {
      setIsLoading(true);
      
      const sucursalId = localStorage.getItem('sucursalId');
      
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      const montoInicial = prompt('Ingrese el monto inicial de la caja:');
      
      if (montoInicial === null) return;
      
      const montoInicialNum = parseFloat(montoInicial);
      
      if (isNaN(montoInicialNum) || montoInicialNum < 0) {
        throw new Error('El monto inicial debe ser un número válido mayor o igual a cero');
      }
      
      const response = await authenticatedFetch('/api/pdv/cierre', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sucursalId,
          montoInicial: montoInicialNum
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al abrir la caja');
      }
      
      setHayCajaAbierta(true);
      setNotification({
        type: 'success',
        message: 'Caja abierta correctamente'
      });
    } catch (error) {
      console.error('Error al abrir caja:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al abrir la caja'
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar selección de producto por el escáner
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
      
      if (producto.stock <= 0) {
        setNotification({
          type: 'error',
          message: `El producto "${producto.nombre}" no tiene stock disponible`
        });
        return;
      }
      
      addItem(producto);
      
      setNotification({
        type: 'success',
        message: `"${producto.nombre}" agregado al carrito`
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 1500);
    } catch (error) {
      console.error('Error al buscar producto por código de barras:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Error al buscar producto'
      });
      
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    }
  };
  
  // Manejar selección de producto
  const handleProductSelect = (producto: Producto) => {
    addItem(producto);

    setNotification({
      type: 'success',
      message: `"${producto.nombre}" agregado al carrito`
    });
    
    setTimeout(() => {
      setNotification(null);
    }, 1500);
  };
  
  // Manejar checkout
  const handleCheckout = () => {
    if (!hayCajaAbierta) {
      setNotification({
        type: 'error',
        message: 'No hay una caja abierta. Debe abrir la caja antes de realizar ventas.'
      });
      return;
    }
    
    setIsCheckoutOpen(true);
  };
  
  // Manejar resultado del checkout
  const handleCheckoutComplete = (result: { success: boolean; message?: string }) => {
    if (result.message) {
      setNotification({
        type: result.success ? 'success' : 'error',
        message: result.message
      });
    }
    
    if (result.message) {
      setTimeout(() => {
        setNotification(null);
      }, 5000);
    }
  };
  
  // Cerrar notificación
  const handleCloseNotification = () => {
    setNotification(null);
  };
  
  // Filtrar productos por categoría
  const filteredProducts = activeCategory === 'todos' 
    ? productosPopulares
    : productosPopulares.filter(p => p.categoriaId === activeCategory);
  
  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#311716] border-t-transparent mx-auto"></div>
          <span className="mt-4 text-lg text-gray-700 font-medium block">Configurando punto de venta...</span>
        </div>
      </div>
    );
  }
  
  // Mostrar pantalla de abrir caja si no hay caja abierta
  if (hayCajaAbierta === false) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6">
        {notification && (
          <div className={`mb-6 w-full max-w-md p-4 rounded-xl shadow-sm ${
            notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            <div className="flex items-center">
              {notification.type === 'success' ? (
                <CheckCircle className="mr-3" size={20} />
              ) : (
                <AlertCircle className="mr-3" size={20} />
              )}
              <p className="font-medium">{notification.message}</p>
              <button 
                onClick={handleCloseNotification}
                className="ml-auto text-gray-500 hover:text-gray-700"
                aria-label="Cerrar notificación"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        )}
        
        <div className="text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-200 max-w-md w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-[#eeb077] to-[#9c7561] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Caja Cerrada</h2>
          <p className="text-gray-600 mb-6">Para comenzar a realizar ventas, debe abrir la caja registradora.</p>
          <button
            onClick={handleAbrirCaja}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-xl hover:from-[#462625] hover:to-[#311716] transition-all transform hover:scale-105 font-medium shadow-sm"
          >
            Abrir Caja
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col">
      {/* Notificación */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 w-full max-w-md p-4 rounded-xl shadow-lg transition-all duration-300 ${
          notification.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="mr-3 flex-shrink-0" size={20} />
            ) : (
              <AlertCircle className="mr-3 flex-shrink-0" size={20} />
            )}
            <p className="font-medium">{notification.message}</p>
            <button 
              onClick={handleCloseNotification}
              className="ml-auto text-gray-500 hover:text-gray-700 flex-shrink-0"
              aria-label="Cerrar notificación"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
      
      {/* Modal de sucursal */}
      <SucursalSetupModal
        isOpen={showSucursalModal}
        onClose={(sucursalId) => {
          setShowSucursalModal(false);
          if (sucursalId) window.location.reload();
        }}
      />

      {/* Mobile Navigation Bar */}
      {isMobileView && (
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex space-x-1">
              <button
                onClick={() => setCurrentView('products')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                  currentView === 'products' 
                    ? 'bg-[#311716] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span className="text-sm font-medium">Productos</span>
              </button>
              <button
                onClick={() => setCurrentView('cart')}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all relative ${
                  currentView === 'cart' 
                    ? 'bg-[#311716] text-white' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <CartIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Carrito</span>
                {items.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {items.length}
                  </span>
                )}
              </button>
            </div>
            
            {items.length > 0 && (
              <div className="text-right">
                <p className="text-sm text-gray-600">Total</p>
                <p className="text-lg font-bold text-[#311716]">${getTotal().toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>
      )}
      
      <div className={`flex-1 ${isMobileView ? 'block' : 'grid grid-cols-1 lg:grid-cols-3 gap-6'} p-6`}>
        {/* Área de productos */}
        <div className={`${isMobileView ? (currentView === 'products' ? 'block' : 'hidden') : 'lg:col-span-2'} flex flex-col h-full`}>
          {/* Header de productos */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Productos</h2>
                <p className="text-gray-600">Selecciona productos para agregar al carrito</p>
              </div>
              
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowScanner(!showScanner)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all ${
                    showScanner 
                      ? 'bg-[#311716] text-white' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">Escáner</span>
                </button>
                
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
                >
                  <Filter className="w-4 h-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>
            
            {/* Buscador y escáner */}
            <div className="mt-4">
              {showScanner ? (
                <div className="p-4 bg-gray-50 rounded-xl">
                  <BarcodeScanner 
                    onScan={handleBarcodeScanned}
                    onError={(error) => {
                      setNotification({
                        type: 'error',
                        message: error.message || 'Error en el escáner'
                      });
                    }}
                  />
                </div>
              ) : (
                <ProductSearch onProductSelect={handleProductSelect} />
              )}
            </div>
            
            {/* Filtros colapsables */}
            {showFilters && (
              <div className="mt-4 p-4 bg-gray-50 rounded-xl">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => setActiveCategory('todos')}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      activeCategory === 'todos' 
                        ? 'bg-[#311716] text-white shadow-sm' 
                        : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    Todos
                  </button>
                  
                  {categoriasProductos.map(categoria => (
                    <button
                      key={categoria.id}
                      onClick={() => setActiveCategory(categoria.id)}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                        activeCategory === categoria.id 
                          ? 'bg-[#311716] text-white shadow-sm' 
                          : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
                      }`}
                    >
                      {categoria.nombre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {/* Grid de productos */}
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-hidden">
            <div className="h-full overflow-y-auto">
              {filteredProducts.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                  {filteredProducts.map((producto) => (
                    <button 
                      key={producto.id}
                      className="group bg-white border border-gray-200 p-4 rounded-xl hover:shadow-md hover:border-[#eeb077] transition-all duration-200 flex flex-col items-center text-center"
                      onClick={() => handleProductSelect(producto)}
                    >
                      <div className="h-20 w-20 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl mb-3 flex items-center justify-center overflow-hidden group-hover:from-[#eeb077]/10 group-hover:to-[#9c7561]/10 transition-all">
                        {producto.imagen ? (
                          <img src={producto.imagen} alt={producto.nombre} className="h-full w-full object-cover rounded-xl" />
                        ) : (
                          <Package className="h-10 w-10 text-gray-400 group-hover:text-[#9c7561] transition-colors" />
                        )}
                      </div>
                      
                      <h3 className="font-medium text-gray-900 mb-1 group-hover:text-[#311716] transition-colors line-clamp-2 text-sm leading-tight h-8">
                        {producto.nombre}
                      </h3>
                      
                      <div className="mt-auto">
                        <p className="text-lg font-bold text-[#311716] group-hover:text-[#eeb077] transition-colors">
                          ${producto.precio.toFixed(2)}
                        </p>
                        
                        <div className="mt-2 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-1 group-hover:translate-y-0">
                          <div className="bg-[#311716] text-white text-xs rounded-full px-3 py-1 flex items-center space-x-1">
                            <Zap className="w-3 h-3" />
                            <span>Agregar</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mb-4">
                    <Package className="h-12 w-12 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No hay productos disponibles</h3>
                  <p className="text-gray-500">Intenta con otra categoría o búsqueda</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Carrito */}
        <div className={`${isMobileView ? (currentView === 'cart' ? 'block' : 'hidden') : 'block'} h-full`}>
          <CartDisplay onCheckout={handleCheckout} className="h-full" />
        </div>
      </div>
      
      {/* Modal de checkout */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />
    </div>
  );
}