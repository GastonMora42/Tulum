// src/components/pdv/CompletePDV.tsx - Versión completamente rediseñada
'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ProductSearch } from '@/components/pdv/ProductSearch';
import { CartDisplay } from '@/components/pdv/CartDisplay';
import { CheckoutModal } from '@/components/pdv/CheckoutModal';
import { useCartStore } from '@/stores/cartStore';
import { useOffline } from '@/hooks/useOffline';
import { 
  Package, ShoppingCart, Search, Filter, Grid3x3, List, 
  Star, TrendingUp, Clock, AlertCircle, CheckCircle, X, 
  Zap, Heart, Tag as TagIcon, Eye, Plus, Minus, ChevronDown,
  ScanLine, Sparkles, ArrowRight, Users, BarChart3
} from 'lucide-react';
import { Producto } from '@/types/models/producto';
import { OfflineIndicator } from '../ui/OfflineIndicator';
import { authenticatedFetch } from '@/hooks/useAuth';

interface CategoryStats {
  id: string;
  nombre: string;
  productCount: number;
  totalSales: number;
  trending: boolean;
}

export function CompletePDV() {
  // Estados principales
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string; id: string } | null>(null);
  const [categories, setCategories] = useState<CategoryStats[]>([]);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [products, setProducts] = useState<Producto[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados de UI
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'name' | 'price' | 'popularity'>('name');
  const [priceFilter, setPriceFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [quickAdd, setQuickAdd] = useState<{ [key: string]: number }>({});
  const [favoriteProducts, setFavoriteProducts] = useState<Set<string>>(new Set());
  
  // Referencias
  const searchInputRef = useRef<HTMLInputElement>(null);
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  
  // Hooks
  const { addItem, items } = useCartStore();
  const { isOnline } = useOffline();

  // Cargar datos iniciales
  useEffect(() => {
    loadInitialData();
    loadFavorites();
  }, []);

  // Filtrar productos cuando cambian los criterios
  useEffect(() => {
    filterProducts();
  }, [activeCategory, products, searchTerm, sortBy, priceFilter]);

  const loadInitialData = async () => {
    try {
      setIsLoading(true);
      const sucursalId = localStorage.getItem('sucursalId');
      
      // Cargar categorías con estadísticas
      const [categoriesResp, productsResp] = await Promise.all([
        authenticatedFetch('/api/admin/categorias'),
        authenticatedFetch(`/api/pdv/productos-disponibles?sucursalId=${sucursalId}`)
      ]);
      
      const categoriesData = await categoriesResp.json();
      const productsData = await productsResp.json();
      
      // Calcular estadísticas de categorías
      const categoryStats = categoriesData.map((cat: any) => ({
        ...cat,
        productCount: productsData.filter((p: Producto) => p.categoriaId === cat.id).length,
        totalSales: Math.floor(Math.random() * 1000), // En una app real, esto vendría de analytics
        trending: Math.random() > 0.7
      }));
      
      setCategories(categoryStats);
      setProducts(productsData);
      setFilteredProducts(productsData);
    } catch (error) {
      console.error('Error loading data:', error);
      showNotification('error', 'Error al cargar los datos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem('favoriteProducts');
    if (saved) {
      setFavoriteProducts(new Set(JSON.parse(saved)));
    }
  };

  const filterProducts = useCallback(() => {
    let filtered = [...products];
    
    // Filtrar por categoría
    if (activeCategory) {
      filtered = filtered.filter(p => p.categoriaId === activeCategory);
    }
    
    // Filtrar por búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p => 
        p.nombre.toLowerCase().includes(term) ||
        p.descripcion?.toLowerCase().includes(term) ||
        p.codigoBarras?.includes(term)
      );
    }
    
    // Filtrar por precio
    if (priceFilter !== 'all') {
      const ranges = {
        low: [0, 1000],
        medium: [1000, 5000],
        high: [5000, Infinity]
      };
      const [min, max] = ranges[priceFilter];
      filtered = filtered.filter(p => p.precio >= min && p.precio < max);
    }
    
    // Ordenar
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.nombre.localeCompare(b.nombre);
        case 'price':
          return a.precio - b.precio;
        case 'popularity':
          return (favoriteProducts.has(b.id) ? 1 : 0) - (favoriteProducts.has(a.id) ? 1 : 0);
        default:
          return 0;
      }
    });
    
    setFilteredProducts(filtered);
  }, [products, activeCategory, searchTerm, sortBy, priceFilter, favoriteProducts]);

  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    const id = Date.now().toString();
    setNotification({ type, message, id });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleProductSelect = (product: Producto) => {
    addItem(product);
    showNotification('success', `"${product.nombre}" agregado al carrito`);
    
    // Efecto visual de quick add
    setQuickAdd(prev => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    setTimeout(() => {
      setQuickAdd(prev => ({ ...prev, [product.id]: Math.max(0, (prev[product.id] || 0) - 1) }));
    }, 1000);
  };

  const toggleFavorite = (productId: string) => {
    const newFavorites = new Set(favoriteProducts);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
    } else {
      newFavorites.add(productId);
    }
    setFavoriteProducts(newFavorites);
    localStorage.setItem('favoriteProducts', JSON.stringify(Array.from(newFavorites)));
  };

  const handleCheckout = () => setIsCheckoutOpen(true);

  const handleCheckoutComplete = (result: { success: boolean; message?: string }) => {
    if (result.message) {
      showNotification(result.success ? 'success' : 'error', result.message);
    }
  };

  // Memoized values para optimización
  const categoryStats = useMemo(() => {
    return categories.map(cat => ({
      ...cat,
      activeProducts: filteredProducts.filter(p => p.categoriaId === cat.id).length
    }));
  }, [categories, filteredProducts]);

  const productStats = useMemo(() => ({
    total: products.length,
    inStock: products.filter(p => (p.stock || 0) > 0).length,
    lowStock: products.filter(p => (p.stock || 0) <= 5 && (p.stock || 0) > 0).length,
    outOfStock: products.filter(p => (p.stock || 0) === 0).length
  }), [products]);

  return (
    <div className="h-full flex flex-col lg:flex-row gap-6 overflow-hidden">
      {/* Panel Principal de Productos */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header del Panel Principal */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Título y stats */}
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-xl flex items-center justify-center">
                <Package className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Catálogo de Productos</h2>
                <div className="flex items-center space-x-4 text-sm text-gray-500 mt-1">
                  <span className="flex items-center">
                    <BarChart3 className="h-4 w-4 mr-1" />
                    {filteredProducts.length} productos
                  </span>
                  <span className="flex items-center">
                    <Users className="h-4 w-4 mr-1" />
                    {productStats.inStock} disponibles
                  </span>
                  {!isOnline && (
                    <span className="flex items-center text-amber-500">
                      <AlertCircle className="h-4 w-4 mr-1" />
                      Modo offline
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Controles del panel */}
            <div className="flex items-center space-x-3">
              {/* Filtros de vista */}
              <div className="flex items-center bg-gray-100 rounded-xl p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'grid' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Grid3x3 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              {/* Filtros avanzados */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 rounded-xl transition-colors ${
                  showFilters 
                    ? 'bg-[#311716] text-white' 
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <Filter className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Barra de búsqueda mejorada */}
          <div className="mt-6">
            <ProductSearch 
              onProductSelect={handleProductSelect}
              className="w-full"
            />
          </div>

          {/* Filtros expandidos */}
          {showFilters && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Ordenar por */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Ordenar por
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                  >
                    <option value="name">Nombre</option>
                    <option value="price">Precio</option>
                    <option value="popularity">Popularidad</option>
                  </select>
                </div>

                {/* Filtro de precio */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rango de precio
                  </label>
                  <select
                    value={priceFilter}
                    onChange={(e) => setPriceFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077]"
                  >
                    <option value="all">Todos los precios</option>
                    <option value="low">$0 - $1,000</option>
                    <option value="medium">$1,000 - $5,000</option>
                    <option value="high">Más de $5,000</option>
                  </select>
                </div>

                {/* Stats rápidas */}
                <div className="flex items-end">
                  <div className="grid grid-cols-2 gap-2 w-full">
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-green-600">{productStats.inStock}</div>
                      <div className="text-xs text-gray-500">Disponibles</div>
                    </div>
                    <div className="text-center p-2 bg-white rounded-lg border border-gray-200">
                      <div className="text-lg font-bold text-amber-600">{productStats.lowStock}</div>
                      <div className="text-xs text-gray-500">Stock bajo</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Categorías horizontales mejoradas */}
        <div className="mb-6">
          <div 
            ref={categoryScrollRef}
            className="flex space-x-3 overflow-x-auto pb-2 scrollbar-hide"
          >
            <button
              onClick={() => setActiveCategory(null)}
              className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                !activeCategory 
                  ? 'bg-gradient-to-r from-[#311716] to-[#462625] text-white shadow-lg' 
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4" />
                <span>Todos</span>
                <span className="text-xs opacity-75">({products.length})</span>
              </div>
            </button>
            
            {categoryStats.map(category => (
              <button
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                className={`flex-shrink-0 px-6 py-3 rounded-xl font-medium transition-all duration-200 relative ${
                  activeCategory === category.id 
                    ? 'bg-gradient-to-r from-[#311716] to-[#462625] text-white shadow-lg' 
                    : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span>{category.nombre}</span>
                  <span className="text-xs opacity-75">({category.activeProducts})</span>
                  {category.trending && (
                    <TrendingUp className="h-3 w-3 text-green-400" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Grid/Lista de productos */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm">
              <div className="animate-spin h-12 w-12 border-4 border-[#311716] border-t-transparent rounded-full mb-4"></div>
              <p className="text-gray-600 font-medium">Cargando productos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 bg-white rounded-2xl shadow-sm">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">No se encontraron productos</h3>
              <p className="text-gray-500 text-center max-w-sm">
                Intenta ajustar los filtros o buscar con términos diferentes
              </p>
            </div>
          ) : (
            <div className={`${
              viewMode === 'grid' 
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' 
                : 'space-y-3'
            }`}>
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  viewMode={viewMode}
                  onSelect={handleProductSelect}
                  onToggleFavorite={toggleFavorite}
                  isFavorite={favoriteProducts.has(product.id)}
                  quickAddCount={quickAdd[product.id] || 0}
                  inCart={items.some(item => item.id === product.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Carrito Lateral */}
      <div className="lg:w-96 flex-shrink-0">
        <CartDisplay 
          onCheckout={handleCheckout} 
          className="h-full"
        />
      </div>

      {/* Modales y notificaciones */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onComplete={handleCheckoutComplete}
      />

      {notification && (
        <Notification
          notification={notification}
          onClose={() => setNotification(null)}
        />
      )}

      <OfflineIndicator />
    </div>
  );
}

// Componente de tarjeta de producto mejorado
interface ProductCardProps {
  product: Producto;
  viewMode: 'grid' | 'list';
  onSelect: (product: Producto) => void;
  onToggleFavorite: (productId: string) => void;
  isFavorite: boolean;
  quickAddCount: number;
  inCart: boolean;
}

function ProductCard({ 
  product, 
  viewMode, 
  onSelect, 
  onToggleFavorite, 
  isFavorite, 
  quickAddCount,
  inCart 
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (viewMode === 'list') {
    return (
      <div 
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-all duration-200 group"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center space-x-4">
          {/* Imagen */}
          <div className="w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 overflow-hidden">
            {product.imagen && !imageError ? (
              <img 
                src={product.imagen} 
                alt={product.nombre}
                className="w-full h-full object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="h-6 w-6 text-gray-400" />
              </div>
            )}
          </div>

          {/* Información */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{product.nombre}</h3>
                {product.descripcion && (
                  <p className="text-sm text-gray-500 truncate mt-1">{product.descripcion}</p>
                )}
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-lg font-bold text-[#311716]">
                    ${product.precio.toFixed(2)}
                  </span>
                  {product.stock !== undefined && (
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.stock > 5 
                        ? 'bg-green-100 text-green-700' 
                        : product.stock > 0 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      Stock: {product.stock}
                    </span>
                  )}
                </div>
              </div>

              {/* Acciones */}
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => onToggleFavorite(product.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    isFavorite 
                      ? 'text-red-500 bg-red-50' 
                      : 'text-gray-400 hover:text-red-500 hover:bg-red-50'
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                </button>
                
                <button
                  onClick={() => onSelect(product)}
                  disabled={product.stock === 0}
                  className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Agregar</span>
                  {quickAddCount > 0 && (
                    <span className="bg-[#eeb077] text-[#311716] px-2 py-0.5 rounded-full text-xs font-bold">
                      +{quickAddCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-lg transition-all duration-300 group relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge de stock */}
      {product.stock !== undefined && (
        <div className={`absolute top-3 left-3 z-10 px-2 py-1 rounded-full text-xs font-medium ${
          product.stock > 5 
            ? 'bg-green-500 text-white' 
            : product.stock > 0 
            ? 'bg-amber-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {product.stock > 0 ? `${product.stock} disp.` : 'Agotado'}
        </div>
      )}

      {/* Badge de favorito */}
      <button
        onClick={() => onToggleFavorite(product.id)}
        className={`absolute top-3 right-3 z-10 p-2 rounded-full transition-all ${
          isFavorite 
            ? 'bg-red-500 text-white scale-110' 
            : 'bg-white/80 text-gray-600 hover:bg-red-50 hover:text-red-500'
        }`}
      >
        <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
      </button>

      {/* Badge de en carrito */}
      {inCart && (
        <div className="absolute top-3 right-14 z-10 bg-[#311716] text-white px-2 py-1 rounded-full text-xs font-medium">
          En carrito
        </div>
      )}

      {/* Imagen del producto */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {product.imagen && !imageError ? (
          <img 
            src={product.imagen} 
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="h-12 w-12 text-gray-400" />
          </div>
        )}

        {/* Overlay con quick add */}
        <div className={`absolute inset-0 bg-black/20 flex items-center justify-center transition-opacity duration-200 ${
          isHovered ? 'opacity-100' : 'opacity-0'
        }`}>
          <button
            onClick={() => onSelect(product)}
            disabled={product.stock === 0}
            className="bg-white text-[#311716] px-6 py-3 rounded-xl font-semibold hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2 shadow-lg"
          >
            <Zap className="h-4 w-4" />
            <span>Quick Add</span>
            {quickAddCount > 0 && (
              <span className="bg-[#eeb077] text-[#311716] px-2 py-0.5 rounded-full text-xs font-bold">
                +{quickAddCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Información del producto */}
      <div className="p-4">
        <div className="mb-3">
          <h3 className="font-semibold text-gray-900 line-clamp-2 mb-1">
            {product.nombre}
          </h3>
          {product.descripcion && (
            <p className="text-sm text-gray-500 line-clamp-2">
              {product.descripcion}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[#311716]">
              ${product.precio.toFixed(2)}
            </span>
            {product.categoria && (
              <span className="text-xs text-gray-500 flex items-center mt-1">
                <TagIcon className="h-3 w-3 mr-1" />
                {product.categoria.nombre}
              </span>
            )}
          </div>

          <button
            onClick={() => onSelect(product)}
            disabled={product.stock === 0}
            className="p-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Componente de notificación mejorado
interface NotificationProps {
  notification: { type: 'success' | 'error' | 'info'; message: string; id: string };
  onClose: () => void;
}

function Notification({ notification, onClose }: NotificationProps) {
  const icons = {
    success: <CheckCircle className="h-5 w-5" />,
    error: <AlertCircle className="h-5 w-5" />,
    info: <AlertCircle className="h-5 w-5" />
  };

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200'
  };

  return (
    <div className="fixed top-6 right-6 z-50 max-w-md">
      <div className={`p-4 rounded-xl border shadow-lg ${colors[notification.type]} transform transition-all duration-300 animate-in slide-in-from-right`}>
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {icons[notification.type]}
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm font-medium">{notification.message}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-3 flex-shrink-0 p-1 rounded-full hover:bg-black/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}