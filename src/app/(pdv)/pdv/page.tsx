// src/app/(pdv)/pdv/page.tsx - Versión Simplificada
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { BarcodeScanner } from '@/components/pdv/BarcodeScanner';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { SucursalSetupModal } from '@/components/pdv/SucursalSetupModal';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, CheckCircle, X, QrCode, Package, Grid, 
  ShoppingCart as CartIcon, Search, ChevronDown, ArrowRight, 
  Plus, Heart, Clock, Zap, Target, Home, Scan, AlertTriangle
} from 'lucide-react';
import { Producto } from '@/types/models/producto';

// Tipo específico para las vistas
type ViewType = 'dashboard' | 'products' | 'cart' | 'scanner';

interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  action: () => void;
  color: string;
}

export default function PDVPage() {
  // Estados principales
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ 
    type: 'success' | 'error' | 'info' | 'warning'; 
    message: string; 
    id: string;
  } | null>(null);
  const [hayCajaAbierta, setHayCajaAbierta] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSucursalModal, setShowSucursalModal] = useState(false);
  
  // Estados de productos
  const [categoriasProductos, setCategoriasProductos] = useState<any[]>([]);
  const [productosPopulares, setProductosPopulares] = useState<Producto[]>([]);
  const [productosRecientes, setProductosRecientes] = useState<Producto[]>([]);
  const [productosFavoritos, setProductosFavoritos] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  
  // Estados de UI
  const [isMobileView, setIsMobileView] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // Hooks
  const { addItem, items, getTotal } = useCartStore();
  const { isOnline } = useOffline();

  // Función helper para verificar stock
  const hasStock = useCallback((producto: Producto): boolean => {
    return (producto.stock ?? 0) > 0;
  }, []);

  // Función para cambiar vistas
  const handleViewChange = useCallback((view: ViewType) => {
    setCurrentView(view);
  }, []);

  // Verificar tamaño de pantalla
  useEffect(() => {
    const checkMobile = () => {
      const isMob = window.innerWidth < 1024;
      setIsMobileView(isMob);
      if (!isMob && currentView === 'cart') {
        setCurrentView('dashboard');
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [currentView]);

  // Atajos de teclado básicos
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && items.length > 0) {
        e.preventDefault();
        handleCheckout();
      }
      
      if (e.key === 'Escape') {
        if (searchTerm) {
          setSearchTerm('');
        } else if (currentView !== 'dashboard') {
          setCurrentView('dashboard');
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [items.length, searchTerm, currentView]);
  
  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    loadFavorites();
  }, []);

  // Verificar caja abierta
  useEffect(() => {
    checkCajaAbierta();
  }, [isOnline]);

  const loadInitialData = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setShowSucursalModal(true);
        return;
      }

      const [categoriasResponse, popularesResponse, recientesResponse] = await Promise.all([
        authenticatedFetch('/api/admin/categorias'),
        authenticatedFetch(`/api/pdv/productos-disponibles?popular=true&sucursalId=${sucursalId}`),
        authenticatedFetch(`/api/pdv/productos-disponibles?recientes=true&sucursalId=${sucursalId}`)
      ]);

      if (categoriasResponse.ok) {
        const categoriasData = await categoriasResponse.json();
        setCategoriasProductos(categoriasData);
      }

      if (popularesResponse.ok) {
        const popularesData = await popularesResponse.json();
        setProductosPopulares(popularesData.slice(0, 20));
      }

      if (recientesResponse.ok) {
        const recientesData = await recientesResponse.json();
        setProductosRecientes(recientesData.slice(0, 8));
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteProducts');
    if (saved) {
      setProductosFavoritos(new Set(JSON.parse(saved)));
    }
  };

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
    } catch (error) {
      console.error('Error al verificar caja:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al verificar el estado de la caja');
    } finally {
      setIsLoading(false);
    }
  };

  const showNotification = (type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now().toString();
    setNotification({ type, message, id });
    
    if (type !== 'error') {
      setTimeout(() => setNotification(null), 3000);
    }
  };

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sucursalId, montoInicial: montoInicialNum })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al abrir la caja');
      }
      
      setHayCajaAbierta(true);
      showNotification('success', '¡Caja abierta correctamente!');
    } catch (error) {
      console.error('Error al abrir caja:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al abrir la caja');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductSelect = (producto: Producto) => {
    if (!hasStock(producto)) {
      showNotification('warning', `"${producto.nombre}" sin stock disponible`);
      return;
    }
    
    addItem(producto);
    showNotification('success', `"${producto.nombre}" agregado al carrito`);
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
      
      if (!hasStock(producto)) {
        showNotification('warning', `El producto "${producto.nombre}" no tiene stock disponible`);
        return;
      }
      
      addItem(producto);
      showNotification('success', `"${producto.nombre}" agregado al carrito`);
    } catch (error) {
      console.error('Error al buscar producto por código de barras:', error);
      showNotification('error', error instanceof Error ? error.message : 'Error al buscar producto');
    }
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(productosFavoritos);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setProductosFavoritos(newFavorites);
    localStorage.setItem('favoriteProducts', JSON.stringify(Array.from(newFavorites)));
  };

  const handleCheckout = () => {
    if (!hayCajaAbierta) {
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
  };

  // Quick Actions simplificadas
  const quickActions: QuickAction[] = [
    {
      id: 'products',
      label: 'Productos',
      icon: <Package className="w-6 h-6" />,
      action: () => setCurrentView('products'),
      color: 'from-[#311716] to-[#462625]'
    },
    {
      id: 'scanner',
      label: 'Escáner',
      icon: <QrCode className="w-6 h-6" />,
      action: () => setCurrentView('scanner'),
      color: 'from-[#9c7561] to-[#eeb077]'
    },
    {
      id: 'search',
      label: 'Buscar',
      icon: <Search className="w-6 h-6" />,
      action: () => {
        setCurrentView('products');
        setTimeout(() => searchInputRef.current?.focus(), 100);
      },
      color: 'from-[#462625] to-[#9c7561]'
    }
  ];

  // Filtrar productos
  const filteredProducts = useMemo(() => {
    let products = activeCategory === 'todos' ? productosPopulares : productosPopulares.filter(p => p.categoriaId === activeCategory);
    
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      products = products.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.descripcion?.toLowerCase().includes(term) ||
        p.codigoBarras?.includes(term)
      );
    }
    
    return products;
  }, [productosPopulares, activeCategory, searchTerm]);

  // Pantalla de carga
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-gray-200 border-t-[#311716] rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Configurando PDV</h2>
          <p className="text-gray-600">Preparando el sistema...</p>
        </div>
      </div>
    );
  }

  // Pantalla de abrir caja
  if (hayCajaAbierta === false) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="text-center bg-white p-8 rounded-2xl shadow-lg border border-gray-200 max-w-md w-full">
          <div className="w-16 h-16 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-white" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Caja Cerrada</h2>
          <p className="text-gray-600 mb-6">
            Para comenzar a realizar ventas, necesitas abrir la caja registradora.
          </p>
          
          <button
            onClick={handleAbrirCaja}
            className="w-full py-3 px-6 bg-gradient-to-r from-[#311716] to-[#462625] text-white rounded-xl hover:from-[#462625] hover:to-[#311716] transition-all font-semibold flex items-center justify-center space-x-2"
          >
            <Zap className="w-5 h-5" />
            <span>Abrir Caja</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Notificación */}
      {notification && (
        <NotificationToast
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}
      
      {/* Modal de sucursal */}
      <SucursalSetupModal
        isOpen={showSucursalModal}
        onClose={(sucursalId) => {
          setShowSucursalModal(false);
          if (sucursalId) window.location.reload();
        }}
      />

      {/* Navigation Pills para móvil */}
      {isMobileView && (
        <MobileNavigationPills
          currentView={currentView}
          onViewChange={handleViewChange}
          cartItemCount={items.length}
          cartTotal={getTotal()}
        />
      )}

      <div className="flex-1 flex overflow-hidden">
        {/* Panel principal */}
        <div className={`flex-1 flex flex-col ${isMobileView ? 'block' : ''}`}>
          {/* Dashboard View */}
          {(!isMobileView || currentView === 'dashboard') && (
            <DashboardView
              productosRecientes={productosRecientes}
              productosFavoritos={productosFavoritos}
              quickActions={quickActions}
              onProductSelect={handleProductSelect}
              onToggleFavorite={toggleFavorite}
              onViewChange={handleViewChange}
              isVisible={currentView === 'dashboard' || !isMobileView}
            />
          )}

          {/* Products View */}
          {(!isMobileView || currentView === 'products') && (
            <ProductsView
              categoriasProductos={categoriasProductos}
              filteredProducts={filteredProducts}
              activeCategory={activeCategory}
              setActiveCategory={setActiveCategory}
              viewMode={viewMode}
              setViewMode={setViewMode}
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              searchInputRef={searchInputRef as React.RefObject<HTMLInputElement>}
              onProductSelect={handleProductSelect}
              onToggleFavorite={toggleFavorite}
              productosFavoritos={productosFavoritos}
              isVisible={currentView === 'products'}
            />
          )}

          {/* Scanner View */}
          {(!isMobileView || currentView === 'scanner') && (
            <ScannerView
              onBarcodeScanned={handleBarcodeScanned}
              onProductSelect={handleProductSelect}
              productosRecientes={productosRecientes}
              isVisible={currentView === 'scanner'}
            />
          )}
        </div>

        {/* Carrito */}
        {isMobileView ? (
          currentView === 'cart' && (
            <div className="flex-1 p-4">
              <CartDisplay onCheckout={handleCheckout} className="h-full" />
            </div>
          )
        ) : (
          <div className="w-96 border-l border-gray-200 bg-white">
            <CartDisplay onCheckout={handleCheckout} className="h-full" />
          </div>
        )}
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

// Componentes simplificados

interface MobileNavigationPillsProps {
  currentView: ViewType;
  onViewChange: (view: ViewType) => void;
  cartItemCount: number;
  cartTotal: number;
}

function MobileNavigationPills({ currentView, onViewChange, cartItemCount, cartTotal }: MobileNavigationPillsProps) {
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Inicio', icon: <Home className="w-4 h-4" /> },
    { id: 'products' as ViewType, label: 'Productos', icon: <Package className="w-4 h-4" /> },
    { id: 'scanner' as ViewType, label: 'Escáner', icon: <Scan className="w-4 h-4" /> },
    { 
      id: 'cart' as ViewType, 
      label: 'Carrito', 
      icon: <CartIcon className="w-4 h-4" />,
      badge: cartItemCount > 0 ? cartItemCount : undefined
    }
  ];

  return (
    <div className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 overflow-x-auto">
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl transition-all whitespace-nowrap ${
                currentView === item.id 
                  ? 'bg-[#311716] text-white' 
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.icon}
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </div>
        
        {cartItemCount > 0 && (
          <div className="text-right ml-4">
            <div className="text-sm font-bold text-[#311716]">${cartTotal.toFixed(2)}</div>
            <div className="text-xs text-gray-500">{cartItemCount} items</div>
          </div>
        )}
      </div>
    </div>
  );
}

interface DashboardViewProps {
  productosRecientes: Producto[];
  productosFavoritos: Set<string>;
  quickActions: QuickAction[];
  onProductSelect: (producto: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  onViewChange: (view: ViewType) => void;
  isVisible: boolean;
}

function DashboardView({
  productosRecientes,
  productosFavoritos,
  quickActions,
  onProductSelect,
  onToggleFavorite,
  onViewChange,
  isVisible
}: DashboardViewProps) {
  if (!isVisible) return null;

  return (
    <div className="flex-1 p-6 overflow-y-auto">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Bienvenida */}

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {quickActions.map(action => (
            <button
              key={action.id}
              onClick={action.action}
              className={`p-8 bg-gradient-to-br ${action.color} rounded-2xl text-white hover:scale-105 transition-all shadow-lg`}
            >
              <div className="flex flex-col items-center text-center">
                <div className="p-4 bg-white/20 rounded-2xl mb-4">
                  {action.icon}
                </div>
                <span className="text-xl font-bold">{action.label}</span>
              </div>
            </button>
          ))}
        </div>

        {/* Productos Recientes */}
        {productosRecientes.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">Productos Recientes</h2>
              <button
                onClick={() => onViewChange('products')}
                className="flex items-center space-x-2 text-[#311716] hover:text-[#9c7561] font-medium"
              >
                <span>Ver todos</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {productosRecientes.slice(0, 6).map(producto => (
                <ProductCardCompact
                  key={producto.id}
                  producto={producto}
                  onSelect={onProductSelect}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={productosFavoritos.has(producto.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface ProductsViewProps {
  categoriasProductos: any[];
  filteredProducts: Producto[];
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  viewMode: 'grid' | 'list';
  setViewMode: (mode: 'grid' | 'list') => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onProductSelect: (producto: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  productosFavoritos: Set<string>;
  isVisible: boolean;
}

function ProductsView({
  categoriasProductos,
  filteredProducts,
  activeCategory,
  setActiveCategory,
  viewMode,
  setViewMode,
  searchTerm,
  setSearchTerm,
  searchInputRef,
  onProductSelect,
  onToggleFavorite,
  productosFavoritos,
  isVisible
}: ProductsViewProps) {
  if (!isVisible) return null;

  return (
    <div className="flex-1 flex flex-col p-6 overflow-hidden">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 flex-1 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Productos</h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-[#311716] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Grid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-[#311716] text-white' : 'text-gray-500 hover:bg-gray-100'}`}
              >
                <Package className="w-4 h-4" />
              </button>
            </div>
          </div>
          
          {/* Búsqueda */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar productos..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
            />
          </div>
          
          {/* Categorías */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveCategory('todos')}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${
                activeCategory === 'todos' 
                  ? 'bg-[#311716] text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Todos
            </button>
            
            {categoriasProductos.map(categoria => (
              <button
                key={categoria.id}
                onClick={() => setActiveCategory(categoria.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${
                  activeCategory === categoria.id 
                    ? 'bg-[#311716] text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {categoria.nombre}
              </button>
            ))}
          </div>
        </div>
        
        {/* Lista de productos */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredProducts.length > 0 ? (
            <div className={viewMode === 'grid' 
              ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4' 
              : 'space-y-3'
            }>
              {filteredProducts.map(producto => (
                <ProductCard
                  key={producto.id}
                  producto={producto}
                  viewMode={viewMode}
                  onSelect={onProductSelect}
                  onToggleFavorite={onToggleFavorite}
                  isFavorite={productosFavoritos.has(producto.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="w-16 h-16 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron productos' : 'No hay productos disponibles'}
              </h3>
              <p className="text-gray-500">
                {searchTerm 
                  ? 'Intenta con términos diferentes' 
                  : 'Los productos aparecerán aquí cuando estén disponibles'
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ScannerView({ onBarcodeScanned, onProductSelect, productosRecientes, isVisible }: {
  onBarcodeScanned: (code: string) => void;
  onProductSelect: (producto: Producto) => void;
  productosRecientes: Producto[];
  isVisible: boolean;
}) {
  if (!isVisible) return null;

  return (
    <div className="flex-1 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <QrCode className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Escáner de Códigos</h2>
          <p className="text-gray-600">Apunta la cámara hacia el código de barras</p>
        </div>
        
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-8">
          <BarcodeScanner 
            onScan={onBarcodeScanned}
            onError={(error) => console.error('Scanner error:', error)}
          />
        </div>
        
        {productosRecientes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Productos Recientes</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {productosRecientes.map(producto => (
                <ProductCardCompact
                  key={producto.id}
                  producto={producto}
                  onSelect={onProductSelect}
                  onToggleFavorite={() => {}}
                  isFavorite={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductCardCompact({ producto, onSelect, onToggleFavorite, isFavorite }: {
  producto: Producto;
  onSelect: (producto: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const stockValue = producto.stock ?? 0;

  return (
    <button
      onClick={() => onSelect(producto)}
      className="group bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-all hover:scale-105"
    >
      <div className="aspect-square bg-gray-50 rounded-lg mb-3 overflow-hidden relative">
        {producto.imagen && !imageError ? (
          <img 
            src={producto.imagen} 
            alt={producto.nombre}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-gray-400" />
          </div>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(producto.id);
          }}
          className={`absolute top-2 right-2 p-1.5 rounded-full ${
            isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600'
          }`}
        >
          <Heart className={`w-3 h-3 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        
        {stockValue <= 5 && stockValue > 0 && (
          <div className="absolute bottom-2 left-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full">
            Stock: {stockValue}
          </div>
        )}
        
        {stockValue === 0 && (
          <div className="absolute bottom-2 left-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
            Sin stock
          </div>
        )}
      </div>
      
      <div className="text-left">
        <h3 className="font-medium text-gray-900 text-sm truncate mb-1">{producto.nombre}</h3>
        <div className="text-lg font-bold text-[#311716]">${producto.precio.toFixed(2)}</div>
      </div>
    </button>
  );
}

function ProductCard({ producto, viewMode, onSelect, onToggleFavorite, isFavorite }: {
  producto: Producto;
  viewMode: 'grid' | 'list';
  onSelect: (producto: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
}) {
  const [imageError, setImageError] = useState(false);
  const stockValue = producto.stock ?? 0;
  
  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
            {producto.imagen && !imageError ? (
              <img 
                src={producto.imagen} 
                alt={producto.nombre}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate">{producto.nombre}</h3>
            <p className="text-sm text-gray-500 truncate">{producto.descripcion}</p>
            <div className="flex items-center space-x-2 mt-1">
              <div className="text-lg font-bold text-[#311716]">${producto.precio.toFixed(2)}</div>
              {stockValue <= 5 && (
                <span className={`text-xs px-2 py-1 rounded-full ${
                  stockValue === 0 ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'
                }`}>
                  {stockValue === 0 ? 'Sin stock' : `Stock: ${stockValue}`}
                </span>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onToggleFavorite(producto.id)}
              className={`p-2 rounded-lg ${
                isFavorite ? 'text-red-500 bg-red-50' : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
              }`}
            >
              <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={() => onSelect(producto)}
              disabled={stockValue === 0}
              className={`px-4 py-2 rounded-lg font-medium ${
                stockValue === 0
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-[#311716] text-white hover:bg-[#462625]'
              }`}
            >
              {stockValue === 0 ? 'Sin stock' : 'Agregar'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all hover:scale-105">
      <div className="aspect-square bg-gray-50 overflow-hidden relative">
        {producto.imagen && !imageError ? (
          <img 
            src={producto.imagen} 
            alt={producto.nombre}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFavorite(producto.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full ${
            isFavorite ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-600'
          }`}
        >
          <Heart className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
        
        {stockValue <= 5 && (
          <div className={`absolute top-3 left-3 text-white text-xs px-2 py-1 rounded-full ${
            stockValue === 0 ? 'bg-red-500' : 'bg-amber-500'
          }`}>
            {stockValue === 0 ? 'Sin stock' : `Stock: ${stockValue}`}
          </div>
        )}
        
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <button
            onClick={() => onSelect(producto)}
            disabled={stockValue === 0}
            className={`px-6 py-3 rounded-xl font-semibold ${
              stockValue === 0
                ? 'bg-gray-400 text-white cursor-not-allowed'
                : 'bg-white text-[#311716] hover:bg-gray-100'
            }`}
          >
            {stockValue === 0 ? 'Sin stock' : 'Agregar'}
          </button>
        </div>
      </div>
      
      <div className="p-4">
        <h3 className="font-semibold text-gray-900 mb-1 truncate">{producto.nombre}</h3>
        <div className="flex items-center justify-between">
          <div className="text-xl font-bold text-[#311716]">${producto.precio.toFixed(2)}</div>
          <button
            onClick={() => onSelect(producto)}
            disabled={stockValue === 0}
            className={`p-2 rounded-lg ${
              stockValue === 0
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-[#311716] text-white hover:bg-[#462625]'
            }`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function NotificationToast({ notification, onClose }: {
  notification: {
    type: 'success' | 'error' | 'info' | 'warning';
    message: string;
    id: string;
  };
  onClose: () => void;
}) {
  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <AlertCircle className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200'
  };

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md">
      <div className={`p-4 rounded-xl border shadow-lg ${colors[notification.type]}`}>
        <div className="flex items-start">
          <div className="flex-shrink-0 mr-3">
            {icons[notification.type]}
          </div>
          <div className="flex-1">
            <p className="font-medium">{notification.message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1 rounded-full hover:bg-black/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}