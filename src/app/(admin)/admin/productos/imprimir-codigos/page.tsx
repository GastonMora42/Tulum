'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth'; 
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer'; 
import { 
  Loader, 
  Package, 
  Printer, 
  RefreshCw, 
  ChevronLeft, 
  Check, 
  AlertTriangle,
  Filter,
  X,
  Search,
  Grid,
  List,
  ChevronRight,
  ChevronDown,
  Settings
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number;
  categoria?: {
    nombre: string;
  };
  imagen?: string;
  activo?: boolean;
}

interface FilterState {
  searchTerm: string;
  selectedCategory: string;
  activeOnly: boolean;
}

const INITIAL_FILTERS: FilterState = {
  searchTerm: '',
  selectedCategory: '',
  activeOnly: true
};

export default function ImprimirCodigosPage() {
  // --- Estados principales del componente ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Estados para filtros simplificados ---
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // --- Estados para paginación ---
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);

  // --- Estados para UI ---
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // --- Función para cargar categorías ---
  const fetchCategorias = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/admin/categorias');
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setAvailableCategories(['', ...data.map(cat => cat.nombre || cat.id)]);
        }
      }
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  }, []);

  // --- Efecto para cargar categorías ---
  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);
  const fetchProductos = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Construye la URL de la API incluyendo todos los parámetros
      const queryParams = new URLSearchParams({
        limit: productsPerPage.toString(),
        page: currentPage.toString(),
      });

      // Solo agregar parámetros no vacíos
      if (filters.searchTerm && filters.searchTerm.trim()) {
        queryParams.append('search', filters.searchTerm.trim());
      }

      if (filters.selectedCategory) {
        queryParams.append('categoriaId', filters.selectedCategory);
      }

      if (filters.activeOnly) {
        queryParams.append('soloActivos', 'true');
      }

      const response = await authenticatedFetch(`/api/admin/productos?${queryParams.toString()}`);

      if (response.ok) {
        const data = await response.json();
        
        // Manejar diferentes estructuras de respuesta de la API
        if (data.data && Array.isArray(data.data)) {
          // Nueva estructura con paginación
          setProductos(data.data.filter((p: { codigoBarras: any; }) => p.codigoBarras)); // Solo productos con código
          setTotalPages(data.pagination?.totalPages || Math.ceil((data.pagination?.total || 0) / productsPerPage));
          setTotalProducts(data.pagination?.total || 0);
        } else if (Array.isArray(data)) {
          // Estructura antigua (array directo)
          const productosConCodigo = data.filter(p => p.codigoBarras);
          setProductos(productosConCodigo);
          setTotalPages(Math.ceil(productosConCodigo.length / productsPerPage));
          setTotalProducts(productosConCodigo.length);
        } else {
          setProductos([]);
          setTotalPages(1);
          setTotalProducts(0);
        }

      } else {
        const errorText = await response.text();
        throw new Error(`Error al cargar productos: ${errorText}`);
      }
    } catch (error: any) {
      console.error('Error al cargar productos:', error);
      setError(`No se pudieron cargar los productos: ${error.message || 'Inténtelo de nuevo.'}`);
      setProductos([]);
      setTotalPages(1);
      setTotalProducts(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage, productsPerPage]);

  // --- Efecto para cargar los productos ---
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchProductos();
    }, 300); 

    return () => {
      clearTimeout(handler);
    };
  }, [fetchProductos]);

  // --- Funciones para manejo de filtros simplificadas ---
  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setCurrentPage(1);
    setSelectedProducts([]);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

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

  // --- Lógica para imprimir (sin cambios) ---
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

  // --- Componente de paginación simplificada ---
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const startItem = (currentPage - 1) * productsPerPage + 1;
    const endItem = Math.min(currentPage * productsPerPage, totalProducts);

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-white rounded-lg border">
        <div className="text-sm text-gray-600">
          Mostrando <span className="font-medium">{startItem}</span> - <span className="font-medium">{endItem}</span> de <span className="font-medium">{totalProducts}</span> productos
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <span className="px-3 py-2 text-sm text-gray-700">
            Página {currentPage} de {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Por página:</label>
          <select
            value={productsPerPage}
            onChange={(e) => {
              setProductsPerPage(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="px-2 py-1 border rounded text-sm"
          >
            <option value={6}>6</option>
            <option value={12}>12</option>
            <option value={24}>24</option>
            <option value={48}>48</option>
          </select>
        </div>
      </div>
    );
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
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

        {/* Panel de Filtros Simplificado */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={filters.searchTerm}
                  onChange={(e) => updateFilter('searchTerm', e.target.value)}
                  placeholder="Buscar por nombre o código..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <select
                value={filters.selectedCategory}
                onChange={(e) => updateFilter('selectedCategory', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="">Todas las categorías</option>
                {availableCategories.map(cat => (
                  cat && <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={filters.activeOnly}
                  onChange={(e) => updateFilter('activeOnly', e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">Solo activos</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center border rounded-lg">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-indigo-100 text-indigo-600' : 'text-gray-400'}`}
                >
                  <List className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={clearAllFilters}
                className="inline-flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Limpiar
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <Loader className="inline-block animate-spin h-8 w-8 text-indigo-500 mb-4" />
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : (
          <>
            {/* Controles de Selección y Estadísticas */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
                <div>
                  <h2 className="text-lg font-medium text-gray-900">
                    Códigos a imprimir: {selectedProducts.length} seleccionados
                  </h2>
                  <p className="text-sm text-gray-500">
                    {totalProducts} productos encontrados • Página {currentPage} de {totalPages}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={handleSelectAll}
                    className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Check className="h-4 w-4 mr-1" />
                    {productos.length > 0 && productos.every(p => selectedProducts.includes(p.id)) 
                      ? 'Deseleccionar página' 
                      : 'Seleccionar página'}
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
              
              {/* Grid o Lista de productos */}
              {productos.length === 0 ? (
                <div className="text-center py-10 bg-gray-50 rounded-lg border border-gray-200">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-600 mb-2">No hay productos que coincidan con los filtros aplicados.</p>
                  <p className="text-gray-500 text-sm">Intente ajustar los filtros o limpiarlos para ver más productos.</p>
                </div>
              ) : (
                <>
                  {viewMode === 'grid' ? (
                    // Vista de Grid
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {productos.map(producto => (
                        <div 
                          key={producto.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedProducts.includes(producto.id) 
                              ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleProductSelection(producto.id)}
                        >
                          <div className="flex items-start space-x-3">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(producto.id)}
                              onChange={() => {}}
                              className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 mt-1"
                            />
                            <div className="flex-1 min-w-0">
                              {producto.imagen && (
                                <img 
                                  src={producto.imagen} 
                                  alt={producto.nombre}
                                  className="w-full h-24 object-cover rounded mb-3"
                                />
                              )}
                              <p className="font-medium text-gray-900 truncate">{producto.nombre}</p>
                              <p className="text-sm text-gray-500 truncate">Código: {producto.codigoBarras}</p>
                              {producto.precio && (
                                <p className="text-sm text-indigo-600 font-semibold">${producto.precio.toFixed(2)}</p>
                              )}
                              {producto.categoria?.nombre && (
                                <p className="text-xs text-gray-400 truncate mt-1">
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">{producto.categoria.nombre}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    // Vista de Lista
                    <div className="space-y-2">
                      {productos.map(producto => (
                        <div 
                          key={producto.id}
                          className={`border rounded-lg p-4 cursor-pointer transition-all ${
                            selectedProducts.includes(producto.id) 
                              ? 'border-indigo-500 bg-indigo-50' 
                              : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                          }`}
                          onClick={() => toggleProductSelection(producto.id)}
                        >
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(producto.id)}
                              onChange={() => {}}
                              className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                            />
                            {producto.imagen && (
                              <img 
                                src={producto.imagen} 
                                alt={producto.nombre}
                                className="w-16 h-16 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">{producto.nombre}</p>
                              <p className="text-sm text-gray-500">Código: {producto.codigoBarras}</p>
                            </div>
                            <div className="text-right">
                              {producto.precio && (
                                <p className="text-lg text-indigo-600 font-semibold">${producto.precio.toFixed(2)}</p>
                              )}
                              {producto.categoria?.nombre && (
                                <p className="text-xs text-gray-400">
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">{producto.categoria.nombre}</span>
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Paginación */}
                  <PaginationControls />
                </>
              )}
            </div>
            
            {/* Footer con enlaces adicionales */}
            <div className="flex justify-between items-center mt-6">
              <div className="text-sm text-gray-500">
                <span>Total seleccionados: </span>
                <span className="font-medium text-indigo-600">{selectedProducts.length}</span>
                <span> productos</span>
              </div>
              
              <button
                onClick={() => router.push('/admin/productos')}
                className="text-indigo-600 hover:text-indigo-900 text-sm flex items-center"
              >
                <Settings className="h-4 w-4 mr-1" />
                Administrar productos
              </button>
            </div>
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}