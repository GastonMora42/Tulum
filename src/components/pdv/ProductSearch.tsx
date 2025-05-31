// src/components/pdv/ProductSearch.tsx - VERSIÓN COMPLETAMENTE REDISEÑADA
'use client';

import { useState, useEffect, useRef } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Search, Loader, Tag, Package, X, Star, TrendingUp } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Producto } from '@/types/models/producto';

interface ProductSearchProps {
  onProductSelect: (product: Producto) => void;
  className?: string;
}

export function ProductSearch({ onProductSelect, className = '' }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Producto[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [recentlyAdded, setRecentlyAdded] = useState<Set<string>>(new Set());
  const [popularProducts, setPopularProducts] = useState<Producto[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  
  const { isOnline, searchProductosCache } = useOffline();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cargar productos populares al inicio
  useEffect(() => {
    loadPopularProducts();
    loadRecentSearches();
  }, []);

  // Cerrar resultados cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Búsqueda con debounce
  useEffect(() => {
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
  }, [searchTerm, isOnline, searchProductosCache]);

  const loadPopularProducts = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      const response = await authenticatedFetch(
        `/api/pdv/productos-disponibles?popular=true&sucursalId=${sucursalId}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setPopularProducts(Array.isArray(data) ? data.slice(0, 6) : []);
      }
    } catch (error) {
      console.error('Error cargando productos populares:', error);
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

  const handleRecentSearchClick = (term: string) => {
    setSearchTerm(term);
    inputRef.current?.focus();
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('recentSearches');
  };

  return (
    <div ref={searchRef} className={`product-search relative w-full ${className}`}>
      {/* Barra de búsqueda principal */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Buscar productos por nombre, descripción o código de barras..."
          className="w-full pl-16 pr-16 py-4 text-lg border-2 border-gray-300 rounded-2xl focus:ring-4 focus:ring-[#eeb077]/20 focus:border-[#eeb077] transition-all bg-white shadow-sm"
          aria-label="Buscar productos"
        />
        
        <div className="absolute inset-y-0 right-0 pr-6 flex items-center">
          {isLoading ? (
            <Loader className="h-6 w-6 text-gray-400 animate-spin" />
          ) : searchTerm && (
            <button
              onClick={() => {
                setSearchTerm('');
                setResults([]);
                setShowResults(false);
              }}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      {/* Panel de resultados y sugerencias */}
      {showResults && (
        <div className="absolute mt-3 bg-white border-2 border-gray-200 rounded-2xl shadow-2xl max-h-[600px] overflow-hidden w-full z-50">
          
          {/* Resultados de búsqueda */}
          {searchTerm && results.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <Search className="w-4 h-4 mr-2" />
                  Resultados para "{searchTerm}" ({results.length})
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {results.map((product) => (
                  <ProductResultItem
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

          {/* Sin resultados */}
          {searchTerm && results.length === 0 && !isLoading && (
            <div className="p-8 text-center">
              <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No se encontraron productos</h3>
              <p className="text-gray-500">Intenta con términos diferentes</p>
            </div>
          )}

          {/* Búsquedas recientes */}
          {!searchTerm && recentSearches.length > 0 && (
            <div className="border-b border-gray-100">
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Búsquedas recientes
                </h3>
                <button
                  onClick={clearRecentSearches}
                  className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                >
                  Limpiar
                </button>
              </div>
              <div className="p-4">
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => handleRecentSearchClick(term)}
                      className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Productos populares */}
          {!searchTerm && popularProducts.length > 0 && (
            <div>
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                  <Star className="w-4 h-4 mr-2" />
                  Productos populares
                </h3>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {popularProducts.map((product) => (
                  <ProductResultItem
                    key={product.id}
                    product={product}
                    onSelect={handleSelect}
                    isRecentlyAdded={recentlyAdded.has(product.id)}
                    isPopular={true}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {!searchTerm && recentSearches.length === 0 && popularProducts.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">Busca productos</h3>
              <p className="text-gray-500">Escribe el nombre, descripción o código del producto</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Componente para item de resultado
interface ProductResultItemProps {
  product: Producto;
  onSelect: (product: Producto) => void;
  isRecentlyAdded: boolean;
  searchTerm?: string;
  isPopular?: boolean;
}

function ProductResultItem({ 
  product, 
  onSelect, 
  isRecentlyAdded, 
  searchTerm,
  isPopular = false 
}: ProductResultItemProps) {
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
    <button
      onClick={() => onSelect(product)}
      className={`w-full text-left p-6 hover:bg-gray-50 border-b border-gray-100 flex items-center transition-all group ${
        isRecentlyAdded ? 'bg-green-50 border-green-200' : ''
      }`}
    >
      {/* Imagen */}
      <div className="flex-shrink-0 h-16 w-16 mr-6 bg-gray-100 rounded-xl overflow-hidden">
        {product.imagen && !imageError ? (
          <img
            src={product.imagen}
            alt={product.nombre}
            className="h-full w-full object-cover group-hover:scale-105 transition-transform"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center">
            <Package className="h-8 w-8 text-gray-500" />
          </div>
        )}
      </div>

      {/* Información */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 truncate text-lg mb-1">
              {highlightText(product.nombre, searchTerm)}
            </h4>
            {product.descripcion && (
              <p className="text-sm text-gray-500 truncate mb-2">
                {highlightText(product.descripcion, searchTerm)}
              </p>
            )}
            
            <div className="flex items-center space-x-3">
              {product.codigoBarras && (
                <span className="text-xs text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded">
                  {highlightText(product.codigoBarras, searchTerm)}
                </span>
              )}
              {product.categoria && (
                <span className="flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <Tag className="h-3 w-3 mr-1" />
                  {product.categoria.nombre}
                </span>
              )}
              {isPopular && (
                <span className="flex items-center text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  Popular
                </span>
              )}
            </div>
          </div>

          <div className="ml-6 flex flex-col items-end">
            <span className="text-xl font-bold text-[#311716] mb-2">
              ${product.precio.toFixed(2)}
            </span>
            <span className={`text-xs px-3 py-1 rounded-full font-medium ${
              stockValue > 5 
                ? 'bg-green-100 text-green-700'
                : stockValue > 0
                ? 'bg-yellow-100 text-yellow-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              Stock: {stockValue}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
}