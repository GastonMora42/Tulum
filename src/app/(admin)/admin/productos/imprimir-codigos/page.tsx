'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { Loader, Package, Printer, RefreshCw, ChevronLeft, Check, AlertTriangle } from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number;
}

export default function ImprimirCodigosPage() {
  // Estados
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Cargar productos
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const response = await authenticatedFetch('/api/admin/productos?limit=100');
        if (response.ok) {
          const data = await response.json();
          // Solo mostrar productos con códigos de barras
          const productsWithBarcodes = data.data.filter((p: Producto) => p.codigoBarras && p.codigoBarras.trim() !== '');
          setProductos(productsWithBarcodes);
          
          if (data.data.length > 0 && productsWithBarcodes.length === 0) {
            setError("No hay productos con códigos de barras disponibles. Asigne códigos de barras a sus productos primero.");
          }
        } else {
          throw new Error('Error al cargar productos');
        }
      } catch (error: any) {
        console.error('Error al cargar productos:', error);
        setError('No se pudieron cargar los productos. Por favor, inténtelo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductos();
  }, []);

  // Gestionar selección
  const toggleProductSelection = (productId: string) => {
    if (selectedProducts.includes(productId)) {
      setSelectedProducts(selectedProducts.filter(id => id !== productId));
    } else {
      setSelectedProducts([...selectedProducts, productId]);
    }
  };

  // Imprimir seleccionados
  const handlePrintSelected = async () => {
    if (selectedProducts.length === 0) {
      setError("Seleccione al menos un producto para imprimir");
      return;
    }
    
    try {
      setIsPrinting(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/admin/productos/print-barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts })
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        
        // Abrir PDF en nueva ventana
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          setError("El navegador bloqueó la apertura del PDF. Por favor, permita ventanas emergentes.");
        }
      } else {
        const errorData = await response.text();
        throw new Error(`Error al generar PDF: ${errorData}`);
      }
    } catch (error: any) {
      console.error('Error al imprimir códigos:', error);
      setError(`Error al imprimir códigos: ${error.message}`);
    } finally {
      setIsPrinting(false);
    }
  };

  // Manejar selección de todos
  const handleSelectAll = () => {
    if (selectedProducts.length === productos.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(productos.map(p => p.id));
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Printer className="h-6 w-6 text-indigo-600 mr-2" />
            <h1 className="text-2xl font-bold text-black">Impresión de Códigos de Barras</h1>
          </div>
          <button 
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </button>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <Loader className="inline-block animate-spin h-8 w-8 text-indigo-500 mb-4" />
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : (
          <>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Códigos a imprimir: {selectedProducts.length} seleccionados
                  </h2>
                  <p className="text-sm text-gray-500">
                    Seleccione los productos cuyos códigos desea imprimir
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {selectedProducts.length === productos.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
                  </button>
                  <button
                    onClick={handlePrintSelected}
                    disabled={isPrinting || selectedProducts.length === 0}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isPrinting ? (
                      <>
                        <Loader className="animate-spin h-4 w-4 mr-2" />
                        Generando PDF...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir Seleccionados
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {productos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">No hay productos con códigos de barras disponibles.</p>
                  <p className="text-gray-500 text-sm">Primero asigne códigos de barras a sus productos en la página de edición de productos.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {productos.map(producto => (
                    <div 
                      key={producto.id}
                      className={`border p-4 rounded-lg cursor-pointer transition-colors ${
                        selectedProducts.includes(producto.id) 
                          ? 'border-indigo-500 bg-indigo-50' 
                          : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                      }`}
                      onClick={() => toggleProductSelection(producto.id)}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(producto.id)}
                          onChange={() => {}}
                          className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{producto.nombre}</p>
                          <p className="text-sm text-gray-500 truncate">Código: {producto.codigoBarras}</p>
                          {producto.precio && (
                            <p className="text-sm text-indigo-600 font-semibold">${producto.precio.toFixed(2)}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => router.push('/admin/productos')}
                className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar códigos de barras
              </button>
            </div>
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}