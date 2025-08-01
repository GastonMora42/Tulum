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
  categoria?: string; // ¡Nuevo campo para la categoría!
}

export default function ImprimirCodigosPage() {
  // --- Estados principales del componente ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Estados para la paginación y el filtro ---
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(''); // Nuevo estado para el filtro de categoría
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]); // Para poblar el dropdown de categorías

  // --- Efecto para cargar los productos y las categorías disponibles ---
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Construye la URL de la API incluyendo todos los parámetros de paginación y filtros
        const queryParams = new URLSearchParams({
          limit: productsPerPage.toString(),
          page: currentPage.toString(),
          search: searchTerm,
        });

        if (selectedCategory) {
          queryParams.append('category', selectedCategory);
        }

        const response = await authenticatedFetch(`/api/admin/productos?${queryParams.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setProductos(data.data);
          setTotalPages(data.totalPages);
          setCurrentPage(data.currentPage);
          
          // También obtenemos las categorías disponibles si la API las devuelve
          if (data.categories && Array.isArray(data.categories)) {
            setAvailableCategories(['', ...data.categories]); // Añade una opción vacía para "Todas"
          }

          if (data.totalProducts > 0 && data.data.length === 0) {
            setError("No hay productos con códigos de barras que coincidan con su búsqueda o categoría en esta página.");
          } else if (data.totalProducts === 0) {
            setError("No hay productos con códigos de barras disponibles. Asigne códigos de barras a sus productos primero.");
          }
        } else {
          // Captura el mensaje de error del backend si está disponible
          const errorText = await response.text();
          throw new Error(`Error al cargar productos: ${errorText}`);
        }
      } catch (error: any) {
        console.error('Error al cargar productos:', error);
        // Muestra el mensaje de error al usuario
        setError(`No se pudieron cargar los productos: ${error.message || 'Inténtelo de nuevo.'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Debounce para searchTerm y selectedCategory
    const handler = setTimeout(() => {
      fetchProductos();
    }, 300); 

    return () => {
      clearTimeout(handler);
    };

  }, [searchTerm, selectedCategory, currentPage, productsPerPage]); // Dependencias del useEffect

  // --- Lógica para la selección de productos (sin cambios) ---
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prevSelected => {
      if (prevSelected.includes(productId)) {
        return prevSelected.filter(id => id !== productId);
      } else {
        return [...prevSelected, productId];
      }
    });
  };

  // --- Lógica para imprimir los productos seleccionados (sin cambios mayores) ---
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

  // --- Lógica para seleccionar/deseleccionar todos en la página actual (sin cambios) ---
  const handleSelectAll = () => {
    const currentProductIds = productos.map(p => p.id);
    const allSelectedOnPage = currentProductIds.every(id => selectedProducts.includes(id));

    if (allSelectedOnPage) {
      setSelectedProducts(prevSelected => prevSelected.filter(id => !currentProductIds.includes(id)));
    } else {
      const newSelected = new Set([...selectedProducts, ...currentProductIds]);
      setSelectedProducts(Array.from(newSelected));
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
              {/* Controles de Filtro y Productos por Página */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <input
                  type="text"
                  placeholder="Buscar por nombre o código de barras..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); 
                  }}
                  className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                />
                
                {/* Selector de Categoría */}
                <div className="flex items-center gap-2">
                  <label htmlFor="categoryFilter" className="text-sm text-gray-700">Categoría:</label>
                  <select
                    id="categoryFilter"
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setCurrentPage(1); // Reinicia a la primera página al cambiar la categoría
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  >
                    <option value="">Todas</option>
                    {availableCategories.map(cat => (
                      cat && <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Selector de Productos por Página */}
                <div className="flex items-center gap-2">
                  <label htmlFor="productsPerPage" className="text-sm text-gray-700">Productos por página:</label>
                  <select
                    id="productsPerPage"
                    value={productsPerPage}
                    onChange={(e) => {
                      setProductsPerPage(Number(e.target.value));
                      setCurrentPage(1); 
                    }}
                    className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              </div>

              {/* Sección de Resumen y Botones de Acción */}
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Códigos a imprimir: {selectedProducts.length} seleccionados
                  </h2>
                  <p className="text-sm text-gray-500">
                    Seleccione los productos cuyos códigos desea imprimir. La selección persiste entre páginas.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {productos.length > 0 && productos.every(p => selectedProducts.includes(p.id)) ? 'Deseleccionar todos en esta página' : 'Seleccionar todos en esta página'}
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
                        Imprimir Seleccionados ({selectedProducts.length})
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              {/* Mensaje cuando no hay productos */}
              {productos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">No hay productos con códigos de barras disponibles que coincidan con su búsqueda o filtro.</p>
                  <p className="text-gray-500 text-sm">Intente ajustar su filtro de búsqueda/categoría o asigne códigos de barras a sus productos.</p>
                </div>
              ) : (
                <>
                  {/* Grid de productos */}
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
                            {producto.categoria && (
                              <p className="text-xs text-gray-400 truncate">Categoría: {producto.categoria}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Controles de Paginación */}
                  {totalPages > 1 && (
                    <div className="flex justify-center mt-6 items-center space-x-4">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Anterior
                      </button>
                      <span className="text-gray-700">
                        Página {currentPage} de {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                      >
                        Siguiente
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <button
                onClick={() => router.push('/admin/productos')}
                className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Administrar productos
              </button>
            </div>
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}