// src/components/pdv/ProductSearch.tsx
'use client';

import { useState, useEffect } from 'react';
import { useOffline } from '@/hooks/useOffline';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  descripcion?: string;
  codigoBarras?: string;
  imagen?: string;
}

interface ProductSearchProps {
  onProductSelect: (product: Producto) => void;
  className?: string;
}

export function ProductSearch({ onProductSelect, className = '' }: ProductSearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<Producto[]>([]);
  const { isOnline, searchProductosCache } = useOffline();

  // Manejar búsqueda cuando el término cambia
  useEffect(() => {
    const searchProducts = async () => {
      if (!searchTerm.trim()) {
        setResults([]);
        return;
      }

      setIsLoading(true);

      try {
        // Si estamos offline, buscar en caché
        if (!isOnline) {
          const cachedResults = await searchProductosCache(searchTerm);
          setResults(cachedResults);
        } else {
          // Si estamos online, hacer petición al API
          const response = await fetch(`/api/productos?search=${encodeURIComponent(searchTerm)}`);
          if (!response.ok) throw new Error('Error al buscar productos');
          const data = await response.json();
          setResults(data.data || []);
        }
      } catch (error) {
        console.error('Error buscando productos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Debounce para evitar muchas peticiones
    const handler = setTimeout(searchProducts, 300);
    return () => clearTimeout(handler);
  }, [searchTerm, isOnline, searchProductosCache]);

  return (
    <div className={`product-search ${className}`}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar productos por nombre, código o descripción..."
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          aria-label="Buscar productos"
        />
        {isLoading && (
          <div className="absolute right-3 top-3">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-600"></div>
          </div>
        )}
      </div>

      {results.length > 0 && (
        <div className="mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto">
          {results.map((product) => (
            <button
              key={product.id}
              onClick={() => {
                onProductSelect(product);
                setSearchTerm('');
                setResults([]);
              }}
              className="w-full text-left p-3 hover:bg-gray-100 border-b border-gray-100 flex items-center"
            >
              {product.imagen && (
                <div className="flex-shrink-0 h-12 w-12 mr-3">
                  <img
                    src={product.imagen}
                    alt={product.nombre}
                    className="h-full w-full object-cover rounded"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 truncate">{product.nombre}</p>
                <p className="text-sm text-gray-500 truncate">{product.descripcion}</p>
                {product.codigoBarras && (
                  <p className="text-xs text-gray-400">Código: {product.codigoBarras}</p>
                )}
              </div>
              <div className="ml-2">
                <span className="text-lg font-bold text-indigo-700">${product.precio.toFixed(2)}</span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}