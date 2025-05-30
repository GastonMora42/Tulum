// src/components/pdv/ProductSearch.tsx - VERSIÓN ACTUALIZADA
'use client';

import { useState, useEffect, useRef } from 'react';
import { useOffline } from '@/hooks/useOffline';
import { Search, Loader, Tag, Package, Camera } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Producto } from '@/types/models/producto';
import { BarcodeScanner } from './BarcodeScanner';

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
  const [showScanner, setShowScanner] = useState(false);
  const { isOnline, searchProductosCache } = useOffline();
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cerrar resultados cuando se hace clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Manejar búsqueda cuando el término cambia
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
      } finally {
        setIsLoading(false);
      }
    };

    const handler = setTimeout(searchProducts, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, isOnline, searchProductosCache]);

  // CORREGIDA: Función para manejar selección de producto
  const handleSelect = (product: Producto) => {
    onProductSelect(product);
    setSearchTerm('');
    setResults([]);
    setShowResults(false);
    
    // Guardar producto como recientemente añadido
    setRecentlyAdded(prev => new Set([...prev, product.id]));
    
    // Quitar de recientemente añadidos después de unos segundos
    setTimeout(() => {
      setRecentlyAdded(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }, 2000);
  };

  // CORREGIDA: Función para manejar escaneo de código de barras
  const handleBarcodeScan = async (barcode: string) => {
    try {
      console.log(`[PRODUCT-SEARCH] Procesando código escaneado: ${barcode}`);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // CORREGIDO: Usar endpoint específico para búsqueda por código de barras
      const response = await authenticatedFetch(
        `/api/productos/barcode?code=${encodeURIComponent(barcode)}&sucursalId=${sucursalId}`
      );
      
      if (!response.ok) {
        if (response.status === 404) {
          // Producto no encontrado
          throw new Error(`No se encontró producto con código: ${barcode}`);
        }
        throw new Error('Error al buscar producto por código de barras');
      }
      
      const producto = await response.json();
      
      // Verificar que el producto tiene stock disponible
      if (!producto.stock || producto.stock <= 0) {
        throw new Error(`El producto "${producto.nombre}" no tiene stock disponible`);
      }
      
      console.log(`[PRODUCT-SEARCH] Producto encontrado: ${producto.nombre} (Stock: ${producto.stock})`);
      
      // Seleccionar el producto encontrado
      handleSelect(producto);
      
    } catch (error) {
      console.error('[PRODUCT-SEARCH] Error al procesar código:', error);
      
      // Mostrar error al usuario
      const errorMessage = error instanceof Error ? error.message : 'Error al procesar código de barras';
      
      // Aquí podrías mostrar una notificación toast en lugar de alert
      // Por ahora uso alert para simplicidad
      setTimeout(() => {
        alert(errorMessage);
      }, 100);
    }
  };

  return (
    <div ref={searchRef} className={`product-search relative w-full ${className}`}>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={inputRef}
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos por nombre, descripción o código..."
            className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#eeb077] focus:border-[#eeb077] text-gray-900 text-base"
            aria-label="Buscar productos"
          />
          {isLoading && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <Loader className="h-5 w-5 text-gray-400 animate-spin" />
            </div>
          )}
        </div>
        
        {/* Botón para mostrar/ocultar scanner */}
        <button
          onClick={() => setShowScanner(!showScanner)}
          className={`px-4 py-3 rounded-xl border transition-colors ${
            showScanner
              ? 'bg-[#311716] text-white border-[#311716]'
              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
          }`}
          title="Activar escáner de código de barras"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>

      {/* Scanner expandible */}
      {showScanner && (
        <div className="mt-4 border border-gray-200 rounded-xl overflow-hidden">
          <BarcodeScanner 
            onScan={handleBarcodeScan}
            onError={(error) => {
              console.error('Scanner error:', error);
              alert(`Error del scanner: ${error.message}`);
            }}
            autoStart={true}
          />
        </div>
      )}

      {/* Resultados de búsqueda */}
      {showResults && results.length > 0 && (
        <div className="absolute mt-2 bg-white border border-gray-200 rounded-xl shadow-lg max-h-96 overflow-y-auto w-full z-10">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => handleSelect(product)}
              className={`w-full text-left p-4 hover:bg-gray-50 border-b border-gray-100 flex items-center transition-all ${
                recentlyAdded.has(product.id) ? 'bg-green-50' : ''
              }`}
            >
              <div className="flex-shrink-0 h-12 w-12 mr-4 bg-gray-100 rounded-lg flex items-center justify-center">
                {product.imagen ? (
                  <img
                    src={product.imagen}
                    alt={product.nombre}
                    className="h-full w-full object-cover rounded-lg"
                  />
                ) : (
                  <Package className="h-6 w-6 text-gray-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{product.nombre}</p>
                {product.descripcion && (
                  <p className="text-sm text-gray-500 truncate">{product.descripcion}</p>
                )}
                <div className="flex items-center mt-1">
                  {product.codigoBarras && (
                    <span className="text-xs text-gray-400 mr-2">#{product.codigoBarras}</span>
                  )}
                  {product.categoria && (
                    <span className="flex items-center text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">
                      <Tag className="h-3 w-3 mr-1" />
                      {product.categoria.nombre}
                    </span>
                  )}
                </div>
              </div>
              <div className="ml-4 flex flex-col items-end">
                <span className="text-lg font-bold text-[#311716]">${product.precio.toFixed(2)}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  (product.stock || 0) > 5 
                    ? 'bg-green-100 text-green-700'
                    : (product.stock || 0) > 0
                    ? 'bg-yellow-100 text-yellow-700' 
                    : 'bg-red-100 text-red-700'
                }`}>
                  Stock: {product.stock || 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}