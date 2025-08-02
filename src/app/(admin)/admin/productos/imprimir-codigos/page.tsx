'use client';

import { useState, useEffect } from 'react';
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
  Settings,
  Download,
  Eye,
  MoreHorizontal
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number;
  categoria?: string;
  imagen?: string;
  activo?: boolean;
}

interface FilterPreset {
  id: string;
  name: string;
  filters: FilterState;
}

interface FilterState {
  searchTerm: string;
  selectedCategory: string;
  priceRange: { min: number; max: number };
  activeOnly: boolean;
  hasBarcode: boolean;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

const INITIAL_FILTERS: FilterState = {
  searchTerm: '',
  selectedCategory: '',
  priceRange: { min: 0, max: 10000 },
  activeOnly: true,
  hasBarcode: true,
  sortBy: 'nombre',
  sortOrder: 'asc'
};

const FILTER_PRESETS: FilterPreset[] = [
  {
    id: 'todos',
    name: 'Todos los productos',
    filters: { ...INITIAL_FILTERS, activeOnly: false, hasBarcode: false }
  },
  {
    id: 'activos-con-codigo',
    name: 'Activos con código',
    filters: INITIAL_FILTERS
  },
  {
    id: 'sin-codigo',
    name: 'Sin código de barras',
    filters: { ...INITIAL_FILTERS, hasBarcode: false }
  },
  {
    id: 'precios-altos',
    name: 'Precios > $5000',
    filters: { ...INITIAL_FILTERS, priceRange: { min: 5000, max: 50000 } }
  }
];

export default function ImprimirCodigosPage() {
  // --- Estados principales del componente ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // --- Estados para filtros avanzados ---
  const [filters, setFilters] = useState<FilterState>(INITIAL_FILTERS);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('activos-con-codigo');

  // --- Estados para paginación y vista ---
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(12);
  const [totalPages, setTotalPages] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [totalProducts, setTotalProducts] = useState(0);

  // --- Estados para UI ---
  const [isFilterPanelOpen, setIsFilterPanelOpen] = useState(false);

  // --- Efecto para cargar los productos ---
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Construye la URL de la API incluyendo todos los parámetros
        const queryParams = new URLSearchParams({
          limit: productsPerPage.toString(),
          page: currentPage.toString(),
          search: filters.searchTerm,
          sortBy: filters.sortBy,
          sortOrder: filters.sortOrder,
        });

        if (filters.selectedCategory) {
          queryParams.append('category', filters.selectedCategory);
        }

        if (filters.activeOnly) {
          queryParams.append('soloActivos', 'true');
        }

        if (filters.hasBarcode) {
          queryParams.append('conCodigoBarras', 'true');
        }

        if (filters.priceRange.min > 0) {
          queryParams.append('precioMin', filters.priceRange.min.toString());
        }

        if (filters.priceRange.max < 10000) {
          queryParams.append('precioMax', filters.priceRange.max.toString());
        }

        const response = await authenticatedFetch(`/api/admin/productos?${queryParams.toString()}`);

        if (response.ok) {
          const data = await response.json();
          setProductos(data.data || []);
          setTotalPages(data.totalPages || 1);
          setCurrentPage(data.currentPage || 1);
          setTotalProducts(data.totalProducts || 0);
          
          if (data.categories && Array.isArray(data.categories)) {
            setAvailableCategories(['', ...data.categories]);
          }

          if (data.totalProducts > 0 && data.data.length === 0) {
            setError("No hay productos que coincidan con los filtros aplicados.");
          } else if (data.totalProducts === 0) {
            setError("No hay productos disponibles.");
          }
        } else {
          const errorText = await response.text();
          throw new Error(`Error al cargar productos: ${errorText}`);
        }
      } catch (error: any) {
        console.error('Error al cargar productos:', error);
        setError(`No se pudieron cargar los productos: ${error.message || 'Inténtelo de nuevo.'}`);
      } finally {
        setIsLoading(false);
      }
    };
    
    const handler = setTimeout(() => {
      fetchProductos();
    }, 300); 

    return () => {
      clearTimeout(handler);
    };

  }, [filters, currentPage, productsPerPage]);

  // --- Funciones para manejo de filtros ---
  const applyPreset = (presetId: string) => {
    const preset = FILTER_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setFilters(preset.filters);
      setActivePreset(presetId);
      setCurrentPage(1);
    }
  };

  const clearAllFilters = () => {
    setFilters(INITIAL_FILTERS);
    setActivePreset('activos-con-codigo');
    setCurrentPage(1);
    setSelectedProducts([]);
  };

  const updateFilter = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
    setActivePreset(''); // Limpiar preset activo cuando se modifica manualmente
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

  // --- Componente de paginación avanzada ---
  const PaginationControls = () => {
    if (totalPages <= 1) return null;

    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
        range.push(i);
      }

      if (currentPage - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (currentPage + delta < totalPages - 1) {
        rangeWithDots.push('...', totalPages);
      } else if (totalPages > 1) {
        rangeWithDots.push(totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 p-4 bg-white rounded-lg border">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Mostrando</span>
          <span className="font-medium">{((currentPage - 1) * productsPerPage) + 1}</span>
          <span>-</span>
          <span className="font-medium">{Math.min(currentPage * productsPerPage, totalProducts)}</span>
          <span>de</span>
          <span className="font-medium">{totalProducts}</span>
          <span>productos</span>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setCurrentPage(1)}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Primera página"
          >
            ««
          </button>
          
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1 || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Anterior
          </button>

          <div className="flex items-center gap-1">
            {getPageNumbers().map((pageNum, index) => {
              if (pageNum === '...') {
                return (
                  <span key={`dots-${index}`} className="px-3 py-2 text-gray-400">
                    ...
                  </span>
                );
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum as number)}
                  disabled={isLoading}
                  className={`px-3 py-2 text-sm border rounded-lg ${
                    currentPage === pageNum
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            Siguiente
            <ChevronRight className="h-4 w-4" />
          </button>

          <button
            onClick={() => setCurrentPage(totalPages)}
            disabled={currentPage === totalPages || isLoading}
            className="px-3 py-2 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Última página"
          >
            »»
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
            <option value={96}>96</option>
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

        {/* Panel de Filtros Avanzados */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-4 border-b">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setIsFilterPanelOpen(!isFilterPanelOpen)}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filtros Avanzados
                  <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${isFilterPanelOpen ? 'rotate-180' : ''}`} />
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Presets:</span>
                  {FILTER_PRESETS.map(preset => (
                    <button
                      key={preset.id}
                      onClick={() => applyPreset(preset.id)}
                      className={`px-3 py-1 text-sm rounded-full border ${
                        activePreset === preset.id
                          ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                          : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {preset.name}
                    </button>
                  ))}
                </div>
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

          {/* Panel expandible de filtros */}
          {isFilterPanelOpen && (
            <div className="p-4 bg-gray-50 border-t">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Búsqueda */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Búsqueda
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={filters.searchTerm}
                      onChange={(e) => updateFilter('searchTerm', e.target.value)}
                      placeholder="Nombre, código..."
                      className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Categoría */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoría
                  </label>
                  <select
                    value={filters.selectedCategory}
                    onChange={(e) => updateFilter('selectedCategory', e.target.value)}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Todas</option>
                    {availableCategories.map(cat => (
                      cat && <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Rango de Precios */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Precio Min - Max
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={filters.priceRange.min}
                      onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, min: Number(e.target.value) })}
                      placeholder="Min"
                      className="block w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                    <input
                      type="number"
                      value={filters.priceRange.max}
                      onChange={(e) => updateFilter('priceRange', { ...filters.priceRange, max: Number(e.target.value) })}
                      placeholder="Max"
                      className="block w-full px-2 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Ordenamiento */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ordenar por
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={filters.sortBy}
                      onChange={(e) => updateFilter('sortBy', e.target.value)}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="nombre">Nombre</option>
                      <option value="precio">Precio</option>
                      <option value="categoria">Categoría</option>
                      <option value="codigoBarras">Código</option>
                    </select>
                    <button
                      onClick={() => updateFilter('sortOrder', filters.sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                      title={filters.sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}
                    >
                      {filters.sortOrder === 'asc' ? '↑' : '↓'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Checkboxes de filtros */}
              <div className="flex flex-wrap gap-4 mt-4 pt-4 border-t">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.activeOnly}
                    onChange={(e) => updateFilter('activeOnly', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Solo productos activos</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={filters.hasBarcode}
                    onChange={(e) => updateFilter('hasBarcode', e.target.checked)}
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Solo con código de barras</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Indicadores de filtros activos */}
        {(filters.searchTerm || filters.selectedCategory || filters.priceRange.min > 0 || filters.priceRange.max < 10000 || !filters.activeOnly || !filters.hasBarcode) && (
          <div className="flex flex-wrap gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-sm text-blue-700 font-medium">Filtros activos:</span>
            {filters.searchTerm && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Búsqueda: "{filters.searchTerm}"
                <button onClick={() => updateFilter('searchTerm', '')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {filters.selectedCategory && (
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                Categoría: {filters.selectedCategory}
                <button onClick={() => updateFilter('selectedCategory', '')}>
                  <X className="h-3 w-3" />
                </button>
              </span>
            )}
            {/* Agregar más indicadores según sea necesario */}
          </div>
        )}

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
                              {producto.categoria && (
                                <p className="text-xs text-gray-400 truncate mt-1">
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">{producto.categoria}</span>
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
                              {producto.categoria && (
                                <p className="text-xs text-gray-400">
                                  <span className="px-2 py-1 bg-gray-100 rounded-full">{producto.categoria}</span>
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