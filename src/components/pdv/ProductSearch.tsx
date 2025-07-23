// src/components/pdv/ProductSearch.tsx - VERSIÓN MEJORADA CON 6 COLUMNAS MÁXIMO
'use client';

import { useState, useEffect, useRef } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Search, Loader, Tag, Package, X, Star, TrendingUp, ArrowLeft, Grid } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Producto } from '@/types/models/producto';

interface ProductSearchProps {
  onProductSelect: (product: Producto) => void;
  className?: string;
  maxColumns?: number; // 🆕 Prop para controlar el número máximo de columnas
}

interface Categoria {
  id: string;
  nombre: string;
  imagen?: string;
  _count?: {
    productos: number;
  };
}

export function ProductSearch({ 
  onProductSelect, 
  className = '', 
  maxColumns = 6 // 🆕 Por defecto 6 columnas máximo
}: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Producto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [popularProducts, setPopularProducts] = useState<Producto[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  // 🆕 ESTADOS PARA VISTA DE CATEGORÍAS CON IMÁGENES DE BD
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Categoria | null>(null);
  const [categoryProducts, setCategoryProducts] = useState<Producto[]>([]);
  const [viewMode, setViewMode] = useState<'categories' | 'search' | 'category-products'>('categories');
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  
  const { isOnline, searchProductosCache } = useOffline();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 🆕 IMAGEN POR DEFECTO PARA CATEGORÍAS
  const DEFAULT_CATEGORY_IMAGE = '/images/categorias/default.jpg';

  // 🆕 GENERAR CLASES DE GRID DINÁMICAS BASADAS EN maxColumns
  const getGridClasses = () => {
    const baseClasses = 'grid gap-6';
    switch (maxColumns) {
      case 6:
        return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`;
      case 5:
        return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5`;
      case 4:
        return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4`;
      case 3:
        return `${baseClasses} grid-cols-2 md:grid-cols-3`;
      default:
        return `${baseClasses} grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6`;
    }
  };

  // Cargar categorías al inicio
  useEffect(() => {
    loadCategorias();
    loadRecentSearches();
  }, []);

  // Cerrar resultados cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        if (viewMode === 'search') {
          setShowResults(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [viewMode]);

  // Búsqueda con debounce
  useEffect(() => {
    if (viewMode !== 'search') return;
    
    const searchProducts = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);
      setShowResults(true);

      try {
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha definido una sucursal');
        }

        if (!isOnline) {
          const cachedResults = await searchProductosCache(searchTerm);
          setResults(cachedResults);
        } else {
          const response = await authenticatedFetch(
            `/api/pdv/productos-disponibles?search=${encodeURIComponent(searchTerm)}&sucursalId=${sucursalId}`
          );
          
          if (!response.ok) throw new Error('Error al buscar productos');
          const data = await response.json();
          setResults(Array.isArray(data) ? data : (data.data || []));
        }
      } catch (error) {
        console.error('Error buscando productos:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    };

    const handler = setTimeout(searchProducts, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, isOnline, searchProductosCache, viewMode]);

  // 🆕 CARGAR CATEGORÍAS DESDE BD CON IMÁGENES
  const loadCategorias = async () => {
    try {
      console.log('📂 Cargando categorías desde BD...');
      const response = await authenticatedFetch('/api/admin/categorias');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Categorías cargadas:', data.length);
        setCategorias(data);
      }
    } catch (error) {
      console.error('❌ Error cargando categorías:', error);
    }
  };

  // 🆕 CARGAR PRODUCTOS DE UNA CATEGORÍA
  const loadCategoryProducts = async (categoria: Categoria) => {
    try {
      setIsLoading(true);
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      console.log(`🔍 Cargando productos de categoría: ${categoria.nombre}`);

      const response = await authenticatedFetch(
        `/api/pdv/productos-disponibles?categoriaId=${categoria.id}&sucursalId=${sucursalId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ ${data.length} productos cargados para ${categoria.nombre}`);
        setCategoryProducts(Array.isArray(data) ? data : []);
        setSelectedCategory(categoria);
        setViewMode('category-products');
      }
    } catch (error) {
      console.error('Error cargando productos de categoría:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadRecentSearches = () => {
    const saved = localStorage.getItem('recentSearches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  };

  const saveRecentSearch = (term: string) => {
    const trimmedTerm = term.trim();
    if (!trimmedTerm) return;

    const newSearches = [trimmedTerm, ...recentSearches.filter(s => s !== trimmedTerm)].slice(0, 5);
    setRecentSearches(newSearches);
    localStorage.setItem('recentSearches', JSON.stringify(newSearches));
  };

  const handleSelect = (product: Producto) => {
    onProductSelect(product);
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    
    if (searchTerm.trim()) {
      saveRecentSearch(searchTerm.trim());
    }
    
    // Efecto visual
    setRecentlyAdded(prev => new Set([...prev, product.id]));
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 2000);
  };

  // Manejar vista de búsqueda
  const handleSearchMode = () => {
    setViewMode('search');
    setShowResults(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // Volver a categorías
  const backToCategories = () => {
    setViewMode('categories');
    setSelectedCategory(null);
    setCategoryProducts([]);
    setSearchTerm('');
    setShowResults(false);
  };

  // 🆕 MANEJAR ERROR DE IMAGEN
  const handleImageError = (categoriaId: string) => {
    setImageErrors(prev => new Set([...prev, categoriaId]));
  };

  // 🆕 OBTENER IMAGEN DE CATEGORÍA
  const getCategoryImageUrl = (categoria: Categoria): string => {
    if (imageErrors.has(categoria.id)) {
      return DEFAULT_CATEGORY_IMAGE;
    }
    return categoria.imagen || DEFAULT_CATEGORY_IMAGE;
  };

  // 🆕 GENERAR CLASES DE GRID PARA CATEGORÍAS (MÁXIMO 6)
  const getCategoryGridClasses = () => {
    return 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-6';
  };

  return (
    <div ref={searchRef} className={`product-search relative w-full ${className}`}>
      
      {/* 🆕 VISTA DE CATEGORÍAS CON IMÁGENES DE BD Y GRID CONTROLADO */}
      {viewMode === 'categories' && (
        <div className="space-y-6">
          {/* Header con búsqueda rápida */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">¿Qué estás buscando?</h2>
            <button
              onClick={handleSearchMode}
              className="w-full max-w-md mx-auto flex items-center justify-center space-x-3 py-4 px-6 border-2 border-gray-300 rounded-2xl hover:border-[#eeb077] transition-colors bg-white"
            >
              <Search className="h-6 w-6 text-gray-400" />
              <span className="text-gray-500 text-lg">Buscar productos...</span>
            </button>
          </div>

          {/* 🆕 GRID DE CATEGORÍAS CONTROLADO */}
          <div className={getCategoryGridClasses()}>
            {categorias.map((categoria) => (
              <div
                key={categoria.id}
                onClick={() => loadCategoryProducts(categoria)}
                className="group cursor-pointer bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 overflow-hidden border border-gray-100 hover:border-[#eeb077] transform hover:scale-105"
              >
                <div className="aspect-square bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden relative">
                  <img
                    src={getCategoryImageUrl(categoria)}
                    alt={categoria.nombre}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={() => handleImageError(categoria.id)}
                  />
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors"></div>
                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent">
                    <h3 className="text-white text-lg font-bold text-center mb-1 leading-tight">
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

          {categorias.length === 0 && (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">No hay categorías disponibles</h3>
              <p className="text-gray-500">Agrega categorías desde el panel de administración.</p>
            </div>
          )}
        </div>
      )}

      {/* 🆕 VISTA DE PRODUCTOS DE CATEGORÍA CON GRID CONTROLADO */}
      {viewMode === 'category-products' && selectedCategory && (
        <div className="space-y-6">
          {/* Header con navegación */}
          <div className="flex items-center justify-between">
            <button
              onClick={backToCategories}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver a categorías</span>
            </button>
            
            <div className="text-center flex-1 mx-6">
              <h2 className="text-2xl font-bold text-gray-900">{selectedCategory.nombre}</h2>
              <p className="text-gray-600">{categoryProducts.length} productos disponibles</p>
            </div>

            <button
              onClick={handleSearchMode}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <Search className="w-5 h-5" />
              <span>Buscar</span>
            </button>
          </div>

          {/* 🆕 GRID DE PRODUCTOS CON MÁXIMO CONTROLADO */}
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#eeb077] border-t-transparent rounded-full"></div>
              <p className="mt-4 text-gray-600">Cargando productos...</p>
            </div>
          ) : categoryProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-medium text-gray-700 mb-2">Sin productos disponibles</h3>
              <p className="text-gray-500">Esta categoría no tiene productos en stock.</p>
            </div>
          ) : (
            <div className={getGridClasses()}>
              {categoryProducts.map((product) => (
                <ImprovedProductCard
                  key={product.id}
                  product={product}
                  onSelect={handleSelect}
                  isRecentlyAdded={recentlyAdded.has(product.id)}
                  categoryImage={selectedCategory.imagen}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISTA DE BÚSQUEDA MEJORADA */}
      {viewMode === 'search' && (
        <div className="space-y-4">
          {/* Barra de búsqueda */}
          <div className="flex items-center space-x-4">
            <button
              onClick={backToCategories}
              className="p-3 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Search className="h-6 w-6 text-gray-400" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowResults(true)}
                placeholder="Buscar productos..."
                className="w-full pl-12 pr-12 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-[#eeb077]/20 focus:border-[#eeb077] transition-all bg-white"
              />
              
              <div className="absolute inset-y-0 right-0 pr-4 flex items-center">
                {isLoading ? (
                  <Loader className="h-6 w-6 text-gray-400 animate-spin" />
                ) : searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Resultados de búsqueda */}
          {showResults && (
            <div className="bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-[600px] overflow-hidden">
              {searchTerm && results.length > 0 && (
                <div className="max-h-80 overflow-y-auto p-4">
                  <div className={getGridClasses()}>
                    {results.map((product) => (
                      <ImprovedProductCard
                        key={product.id}
                        product={product}
                        onSelect={handleSelect}
                        isRecentlyAdded={recentlyAdded.has(product.id)}
                        searchTerm={searchTerm}
                      />
                    ))}
                  </div>
                </div>
              )}

              {searchTerm && results.length === 0 && !isLoading && (
                <div className="p-8 text-center">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-700 mb-2">No se encontraron productos</h3>
                  <p className="text-gray-500">Intenta con términos diferentes</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// 🆕 COMPONENTE DE PRODUCTO MEJORADO CON TÍTULOS MÁS LEGIBLES
interface ImprovedProductCardProps {
  product: Producto;
  onSelect: (product: Producto) => void;
  isRecentlyAdded: boolean;
  searchTerm?: string;
  categoryImage?: string;
}

function ImprovedProductCard({ 
  product, 
  onSelect, 
  isRecentlyAdded, 
  searchTerm,
  categoryImage
}: ImprovedProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const stockValue = product.stock ?? 0;

  const highlightText = (text: string, highlight?: string) => {
    if (!highlight) return text;
    
    const parts = text.split(new RegExp(`(${highlight})`, 'gi'));
    return parts.map((part, index) => 
      part.toLowerCase() === highlight.toLowerCase() ? (
        <mark key={index} className="bg-yellow-200 font-semibold">{part}</mark>
      ) : part
    );
  };

  return (
    <div
      onClick={() => onSelect(product)}
      className={`cursor-pointer bg-white rounded-2xl shadow-lg hover:shadow-2xl border border-gray-100 overflow-hidden transition-all duration-300 group hover:scale-105 ${
        isRecentlyAdded ? 'ring-2 ring-green-400 bg-green-50' : ''
      }`}
    >
      {/* Imagen optimizada */}
      <div className="aspect-square bg-gray-100 overflow-hidden relative">
        {product.imagen && !imageError ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : categoryImage ? (
          <img
            src={categoryImage}
            alt={product.nombre}
            className="w-full h-full object-cover opacity-80 group-hover:scale-110 transition-transform duration-300"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="w-12 h-12 text-gray-400" />
          </div>
        )}
        
        {/* Overlay de selección */}
        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-200 flex items-center justify-center">
          <div className="bg-white text-[#311716] px-4 py-2 rounded-lg font-bold shadow-lg transform scale-95 group-hover:scale-100 transition-transform">
            Agregar al carrito
          </div>
        </div>
      </div>

      {/* 🆕 INFORMACIÓN DEL PRODUCTO MEJORADA CON TÍTULOS MÁS LEGIBLES */}
      <div className="p-4">
        {/* 🆕 TÍTULO MÁS LEGIBLE CON MEJOR ESPACIADO */}
        <h4 className="font-bold text-gray-900 text-base mb-3 leading-snug min-h-[3rem] line-clamp-2">
          {highlightText(product.nombre, searchTerm)}
        </h4>
        
        {/* Descripción opcional */}
        {product.descripcion && (
          <p className="text-sm text-gray-500 mb-3 line-clamp-2 leading-relaxed">
            {highlightText(product.descripcion, searchTerm)}
          </p>
        )}

        {/* Precio y categoría */}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-[#311716]">
            ${product.precio.toFixed(2)}
          </span>

          {product.categoria && (
            <span className="flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
              <Tag className="h-3 w-3 mr-1" />
              {product.categoria.nombre}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}