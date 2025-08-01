'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
  Search,
  Filter,
  X,
  ChevronDown,
  ArrowLeft,
  ArrowRight,
  ChevronsLeft,
  ChevronsRight,
  Grid3X3,
  List,
  ScanLine
} from 'lucide-react';

interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number;
  imagen?: string;
  categoria?: {
    id: string;
    nombre: string;
  };
}

interface Categoria {
  id: string;
  nombre: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface Filtros {
  search: string;
  categoriaId: string;
  conImagen: string;
  precioMin: string;
  precioMax: string;
}

const ITEMS_PER_PAGE_OPTIONS = [12, 24, 48, 96];
const DEFAULT_ITEMS_PER_PAGE = 24;

export default function ImprimirCodigosPage() {
  // Estados principales
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estados de paginación
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: DEFAULT_ITEMS_PER_PAGE,
    total: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPrevPage: false
  });
  
  // Estados de filtros
  const [filtros, setFiltros] = useState<Filtros>({
    search: '',
    categoriaId: '',
    conImagen: '',
    precioMin: '',
    precioMax: ''
  });
  
  // Estados de UI
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);
  const [stats, setStats] = useState<any>(null);
  
  // Atajos de teclado
  useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A para seleccionar todos
      const target = e.target as HTMLElement | null;
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === 'a' &&
        !(target && (target.closest && target.closest('input, textarea')))
      ) {
        e.preventDefault();
        selectAll();
      }
      // Escape para limpiar selección
      if (e.key === 'Escape') {
        setSelectedProducts([]);
        setError(null);
      }
      
      // Ctrl/Cmd + F para enfocar búsqueda
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Nombre o código"]') as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
          searchInput.select();
        }
      }
      
      // Ctrl/Cmd + P para imprimir (si hay selección)
      if ((e.ctrlKey || e.metaKey) && e.key === 'p' && selectedProducts.length > 0) {
        e.preventDefault();
        handlePrintSelected();
      }
    };
    
    useEffect(() => {
      window.addEventListener('keydown', handleKeyboard);
      return () => window.removeEventListener('keydown', handleKeyboard);
    }, [selectedProducts.length]); // Eliminamos selectAll y handlePrintSelected del array de dependencias para evitar el error de uso antes de declaración
    const savedFilters = localStorage.getItem('barcode-filters');
    const savedShowFilters = localStorage.getItem('barcode-show-filters');
    const savedShowStats = localStorage.getItem('barcode-show-stats');
    
    if (setViewMode) setViewMode(setViewMode as unknown as 'grid' | 'list');
    if (savedShowFilters === 'true') setShowFilters(true);
    if (savedShowStats === 'true') setShowStats(true);
    if (savedFilters) {
      try {
        const parsedFilters = JSON.parse(savedFilters);
        setFiltros(parsedFilters);
      } catch (e) {
        console.warn('Error parsing saved filters:', e);
      }
    }
  }, []);
  
  // Guardar configuración cuando cambie
  useEffect(() => {
    localStorage.setItem('barcode-view-mode', viewMode);
  }, [viewMode]);
  
  useEffect(() => {
    localStorage.setItem('barcode-show-filters', showFilters.toString());
  }, [showFilters]);
  
  useEffect(() => {
    localStorage.setItem('barcode-show-stats', showStats.toString());
  }, [showStats]);
  
  useEffect(() => {
    localStorage.setItem('barcode-filters', JSON.stringify(filtros));
  }, [filtros]);
  
  const router = useRouter();

  // Cargar categorías
  const loadCategorias = useCallback(async () => {
    try {
      const response = await authenticatedFetch('/api/admin/categorias');
      if (response.ok) {
        const data = await response.json();
        setCategorias(data);
      }
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }, []);

  // Cargar productos con filtros y paginación
  const loadProductos = useCallback(async (page: number = 1, newFiltros?: Filtros) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const currentFiltros = newFiltros || filtros;
      const params = new URLSearchParams({
        page: page.toString(),
        limit: pagination.limit.toString(),
        soloActivos: 'true',
        soloConCodigoBarras: 'true' // Solo productos con códigos de barras
      });
      
      // Aplicar filtros
      if (currentFiltros.search.trim()) {
        params.append('search', currentFiltros.search.trim());
      }
      
      if (currentFiltros.categoriaId) {
        params.append('categoriaId', currentFiltros.categoriaId);
      }
      
      // Filtros de imagen
      if (currentFiltros.conImagen === 'true') {
        params.append('conImagen', 'true');
      } else if (currentFiltros.conImagen === 'false') {
        params.append('sinImagen', 'true');
      }
      
      if (currentFiltros.precioMin) {
        params.append('precioMin', currentFiltros.precioMin);
      }
      
      if (currentFiltros.precioMax) {
        params.append('precioMax', currentFiltros.precioMax);
      }
      
      const response = await authenticatedFetch(`/api/admin/productos?${params}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      
      const data = await response.json();
      
      setProductos(data.data);
      setPagination({
        page,
        limit: pagination.limit,
        total: data.pagination.total,
        totalPages: data.pagination.totalPages,
        hasNextPage: data.pagination.hasNextPage,
        hasPrevPage: data.pagination.hasPrevPage
      });
      
      // Actualizar estadísticas si están disponibles
      if (data.stats) {
        setStats(data.stats);
      }
      
      if (data.data.length === 0 && data.pagination.total === 0) {
        setError("No hay productos con códigos de barras que coincidan con los filtros aplicados.");
      }
      
    } catch (error: any) {
      console.error('Error al cargar productos:', error);
      setError('No se pudieron cargar los productos. Por favor, inténtelo de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [filtros, pagination.limit]);

  // Efecto inicial
  useEffect(() => {
    loadCategorias();
    loadProductos(1);
  }, []);

  // Manejar cambios en filtros con debounce
  const handleFilterChange = useCallback((key: keyof Filtros, value: string) => {
    const newFiltros = { ...filtros, [key]: value };
    setFiltros(newFiltros);
    
    // Limpiar timeout anterior
    if (searchDebounce) {
      clearTimeout(searchDebounce);
    }
    
    // Crear nuevo timeout para búsqueda
    const timeout = setTimeout(() => {
      loadProductos(1, newFiltros);
    }, key === 'search' ? 500 : 100);
    
    setSearchDebounce(timeout);
  }, [filtros, searchDebounce, loadProductos]);

  // Limpiar filtros
  const clearFilters = useCallback(() => {
    const emptyFiltros = {
      search: '',
      categoriaId: '',
      conImagen: '',
      precioMin: '',
      precioMax: ''
    };
    setFiltros(emptyFiltros);
    loadProductos(1, emptyFiltros);
  }, [loadProductos]);

  // Navegación de páginas
  const goToPage = useCallback((page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      loadProductos(page);
    }
  }, [loadProductos, pagination.totalPages]);

  // Cambiar items por página
  const changeItemsPerPage = useCallback((newLimit: number) => {
    setPagination(prev => ({ ...prev, limit: newLimit }));
    loadProductos(1);
  }, [loadProductos]);

  // Gestión de selección
  const toggleProductSelection = useCallback((productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  }, []);

  const selectAllOnPage = useCallback(() => {
    const currentPageIds = productos.map(p => p.id);
    const allSelected = currentPageIds.every(id => selectedProducts.includes(id));
    
    if (allSelected) {
      setSelectedProducts(prev => prev.filter(id => !currentPageIds.includes(id)));
    } else {
      setSelectedProducts(prev => [...new Set([...prev, ...currentPageIds])]);
    }
  }, [productos, selectedProducts]);

  // Selección masiva completa
  const [isLoadingBulkSelection, setIsLoadingBulkSelection] = useState(false);
  const [bulkSelectionCount, setBulkSelectionCount] = useState(0);

  const selectAll = useCallback(async () => {
    if (selectedProducts.length === pagination.total) {
      setSelectedProducts([]);
      setBulkSelectionCount(0);
      return;
    }
    
    try {
      setIsLoadingBulkSelection(true);
      
      const params = new URLSearchParams({
        soloActivos: 'true',
        soloConCodigoBarras: 'true'
      });
      
      // Aplicar filtros actuales
      if (filtros.search.trim()) params.append('search', filtros.search.trim());
      if (filtros.categoriaId) params.append('categoriaId', filtros.categoriaId);
      if (filtros.conImagen === 'true') params.append('conImagen', 'true');
      else if (filtros.conImagen === 'false') params.append('sinImagen', 'true');
      if (filtros.precioMin) params.append('precioMin', filtros.precioMin);
      if (filtros.precioMax) params.append('precioMax', filtros.precioMax);
      
      const response = await authenticatedFetch(`/api/admin/productos/bulk-selection?${params}`);
      
      if (response.ok) {
        const data = await response.json();
        setSelectedProducts(data.ids);
        setBulkSelectionCount(data.count);
        
        if (data.limited) {
          setError('Selección limitada a 10,000 productos por rendimiento. Use filtros más específicos para seleccionar todos.');
        }
      } else {
        throw new Error('Error al obtener selección masiva');
      }
    } catch (error: any) {
      console.error('Error en selección masiva:', error);
      setError(`Error en selección masiva: ${error.message}`);
    } finally {
      setIsLoadingBulkSelection(false);
    }
  }, [selectedProducts.length, pagination.total, filtros, authenticatedFetch]);

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
        
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          setError("El navegador bloqueó la apertura del PDF. Por favor, permita ventanas emergentes.");
        }
        
        // Limpiar selección después de imprimir
        setSelectedProducts([]);
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

  // Calcular estadísticas
  const statsCalculated = useMemo(() => {
    const currentPageIds = productos.map(p => p.id);
    const selectedOnPage = currentPageIds.filter(id => selectedProducts.includes(id)).length;
    
    return {
      totalProducts: pagination.total,
      selectedTotal: selectedProducts.length,
      selectedOnPage,
      allPageSelected: currentPageIds.length > 0 && selectedOnPage === currentPageIds.length,
      // Estadísticas adicionales del servidor
      apiStats: stats
    };
  }, [productos, selectedProducts, pagination.total, stats]);

  // Renderizar panel de estadísticas
  const renderStats = () => (
    <div className={`bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-4 transition-all duration-200 ${showStats ? 'block' : 'hidden'}`}>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-blue-600">
            {stats?.totalProductos || pagination.total}
          </div>
          <div className="text-sm text-gray-600">Total productos</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-green-600">
            {stats?.conCodigoBarras || 0}
          </div>
          <div className="text-sm text-gray-600">Con código barras</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-purple-600">
            {stats?.conImagen || 0}
          </div>
          <div className="text-sm text-gray-600">Con imagen</div>
        </div>
        
        <div className="text-center">
          <div className="text-2xl font-bold text-orange-600">
            {selectedProducts.length}
          </div>
          <div className="text-sm text-gray-600">Seleccionados</div>
        </div>
      </div>
      
      {stats?.porCategoria > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="text-sm text-gray-600">
            Distribución en <span className="font-medium">{stats.porCategoria}</span> categorías
          </div>
        </div>
      )}
    </div>
  );
  const renderFilters = () => (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 mb-4 transition-all duration-200 ${showFilters ? 'block' : 'hidden'}`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Búsqueda */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Buscar producto
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              value={filtros.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              placeholder="Nombre o código de barras..."
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Categoría */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Categoría
          </label>
          <select
            value={filtros.categoriaId}
            onChange={(e) => handleFilterChange('categoriaId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todas las categorías</option>
            {categorias.map(categoria => (
              <option key={categoria.id} value={categoria.id}>
                {categoria.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Imagen */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Con imagen
          </label>
          <select
            value={filtros.conImagen}
            onChange={(e) => handleFilterChange('conImagen', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos</option>
            <option value="true">Con imagen</option>
            <option value="false">Sin imagen</option>
          </select>
        </div>

        {/* Precio mínimo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio mínimo
          </label>
          <input
            type="number"
            value={filtros.precioMin}
            onChange={(e) => handleFilterChange('precioMin', e.target.value)}
            placeholder="0"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Precio máximo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Precio máximo
          </label>
          <input
            type="number"
            value={filtros.precioMax}
            onChange={(e) => handleFilterChange('precioMax', e.target.value)}
            placeholder="999999"
            min="0"
            step="0.01"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Botones de acción */}
        <div className="flex items-end gap-2">
          <button
            onClick={clearFilters}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Limpiar filtros
          </button>
        </div>
      </div>
    </div>
  );

  // Renderizar paginación
  const renderPagination = () => {
    if (pagination.totalPages <= 1) return null;

    const getPageNumbers = () => {
      const delta = 2;
      const range = [];
      const rangeWithDots = [];

      for (let i = Math.max(2, pagination.page - delta); 
           i <= Math.min(pagination.totalPages - 1, pagination.page + delta); 
           i++) {
        range.push(i);
      }

      if (pagination.page - delta > 2) {
        rangeWithDots.push(1, '...');
      } else {
        rangeWithDots.push(1);
      }

      rangeWithDots.push(...range);

      if (pagination.page + delta < pagination.totalPages - 1) {
        rangeWithDots.push('...', pagination.totalPages);
      } else {
        rangeWithDots.push(pagination.totalPages);
      }

      return rangeWithDots;
    };

    return (
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
        {/* Información de resultados */}
        <div className="text-sm text-gray-700">
          Mostrando {Math.min((pagination.page - 1) * pagination.limit + 1, pagination.total)} a{' '}
          {Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total} productos
        </div>

        {/* Controles de paginación */}
        <div className="flex items-center gap-2">
          {/* Primera página */}
          <button
            onClick={() => goToPage(1)}
            disabled={pagination.page === 1}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>

          {/* Página anterior */}
          <button
            onClick={() => goToPage(pagination.page - 1)}
            disabled={!pagination.hasPrevPage}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>

          {/* Números de página */}
          {getPageNumbers().map((pageNum, index) => (
            <button
              key={index}
              onClick={() => typeof pageNum === 'number' ? goToPage(pageNum) : null}
              disabled={pageNum === '...'}
              className={`px-3 py-2 rounded-md border text-sm font-medium ${
                pageNum === pagination.page
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : pageNum === '...'
                  ? 'border-transparent cursor-default'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          {/* Página siguiente */}
          <button
            onClick={() => goToPage(pagination.page + 1)}
            disabled={!pagination.hasNextPage}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ArrowRight className="h-4 w-4" />
          </button>

          {/* Última página */}
          <button
            onClick={() => goToPage(pagination.totalPages)}
            disabled={pagination.page === pagination.totalPages}
            className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>

        {/* Selector de items por página */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-700">Mostrar:</span>
          <select
            value={pagination.limit}
            onChange={(e) => changeItemsPerPage(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {ITEMS_PER_PAGE_OPTIONS.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
          <span className="text-gray-700">por página</span>
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

        {/* Barra de herramientas */}
        <div className="bg-white shadow rounded-lg p-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            {/* Stats y controles de selección */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{statsCalculated.selectedTotal}</span> de{' '}
                <span className="font-medium">{statsCalculated.totalProducts}</span> seleccionados
                {statsCalculated.apiStats && (
                  <span className="text-xs text-gray-500 ml-2">
                    ({statsCalculated.apiStats.conCodigoBarras || statsCalculated.totalProducts} con código de barras)
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={selectAllOnPage}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${
                    statsCalculated.allPageSelected
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Check className="h-3 w-3 inline mr-1" />
                  {statsCalculated.allPageSelected ? 'Deseleccionar página' : 'Seleccionar página'}
                </button>
                
                <button
                  onClick={selectAll}
                  disabled={isLoadingBulkSelection}
                  className={`px-3 py-1.5 text-xs font-medium rounded border ${
                    statsCalculated.selectedTotal === pagination.total
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isLoadingBulkSelection ? (
                    <>
                      <Loader className="h-3 w-3 inline mr-1 animate-spin" />
                      Cargando...
                    </>
                  ) : statsCalculated.selectedTotal === pagination.total ? (
                    <>
                      <X className="h-3 w-3 inline mr-1" />
                      Deseleccionar todos
                    </>
                  ) : (
                    <>
                      <Check className="h-3 w-3 inline mr-1" />
                      Seleccionar todos ({pagination.total})
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => setSelectedProducts([])}
                  disabled={statsCalculated.selectedTotal === 0}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <X className="h-3 w-3 inline mr-1" />
                  Limpiar
                </button>
              </div>
            </div>

            {/* Controles de vista y filtros */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowStats(!showStats)}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  showStats
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Mostrar/ocultar estadísticas"
              >
                📊 Stats
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`inline-flex items-center px-3 py-2 border text-sm font-medium rounded-md ${
                  showFilters
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
                title="Mostrar/ocultar filtros (Ctrl+F para buscar)"
              >
                <Filter className="h-4 w-4 mr-1" />
                Filtros
                <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>

              <div className="border-l border-gray-300 pl-2 ml-2">
                <button
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded-md"
                  title={`Cambiar a vista ${viewMode === 'grid' ? 'lista' : 'cuadrícula'}`}
                >
                  {viewMode === 'grid' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                </button>
                
                <button
                  onClick={() => window.location.reload()}
                  className="p-2 text-gray-700 hover:bg-gray-50 rounded-md ml-1"
                  title="Recargar productos"
                >
                  <RefreshCw className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={handlePrintSelected}
                disabled={isPrinting || stats.selectedTotal === 0}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                title={`Imprimir códigos seleccionados (Ctrl+P) - ${stats.selectedTotal} productos`}
              >
                {isPrinting ? (
                  <>
                    <Loader className="animate-spin h-4 w-4 mr-2" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir ({stats.selectedTotal})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Estadísticas */}
        {renderStats()}

        {/* Filtros */}
        {renderFilters()}

        {/* Ayuda con atajos de teclado */}
        {(showFilters || showStats) && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600">
                <span className="font-medium">Atajos:</span> 
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs mx-1">Ctrl+A</kbd> Seleccionar todos
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs mx-1">Ctrl+F</kbd> Buscar
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs mx-1">Ctrl+P</kbd> Imprimir
                <kbd className="px-1 py-0.5 bg-gray-200 rounded text-xs mx-1">Esc</kbd> Limpiar selección
              </div>
              <button
                onClick={() => {
                  setShowFilters(false);
                  setShowStats(false);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Errores */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="ml-auto text-red-500 hover:text-red-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {/* Contenido principal */}
        {isLoading ? (
          <div className="text-center py-20 bg-white rounded-lg shadow">
            <Loader className="inline-block animate-spin h-8 w-8 text-indigo-500 mb-4" />
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : productos.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow border border-gray-200">
            <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <ScanLine className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No se encontraron productos
            </h3>
            <p className="text-gray-600 mb-4 max-w-md mx-auto">
              {Object.values(filtros).some(f => f && f.trim() !== '') 
                ? "No hay productos con códigos de barras que coincidan con los filtros aplicados." 
                : "No hay productos con códigos de barras disponibles."
              }
            </p>
            <div className="flex justify-center gap-3">
              {Object.values(filtros).some(f => f && f.trim() !== '') && (
                <button
                  onClick={clearFilters}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </button>
              )}
              <button
                onClick={() => router.push('/admin/productos')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Package className="h-4 w-4 mr-2" />
                Gestionar productos
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Grid/List de productos */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className={
                viewMode === 'grid' 
                  ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
                  : "space-y-2"
              }>
                {productos.map(producto => (
                  <div 
                    key={producto.id}
                    className={`border rounded-lg cursor-pointer transition-all duration-200 ${
                      selectedProducts.includes(producto.id) 
                        ? 'border-indigo-500 bg-indigo-50 shadow-md' 
                        : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                    } ${
                      viewMode === 'list' ? 'p-3' : 'p-4'
                    }`}
                    onClick={() => toggleProductSelection(producto.id)}
                  >
                    <div className={`flex items-center ${viewMode === 'list' ? 'space-x-3' : 'space-x-3'}`}>
                      <input
                        type="checkbox"
                        checked={selectedProducts.includes(producto.id)}
                        onChange={() => {}}
                        className="h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500 flex-shrink-0"
                      />
                      
                      {/* Imagen del producto */}
                      {viewMode === 'grid' && (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          {producto.imagen ? (
                            <img
                              src={producto.imagen}
                              alt={producto.nombre}
                              className="w-full h-full object-cover rounded-lg"
                            />
                          ) : (
                            <Package className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium text-gray-900 ${viewMode === 'list' ? 'text-sm' : ''} truncate`}>
                          {producto.nombre}
                        </p>
                        <p className={`text-gray-500 ${viewMode === 'list' ? 'text-xs' : 'text-sm'} truncate flex items-center`}>
                          <ScanLine className="h-3 w-3 mr-1 flex-shrink-0" />
                          {producto.codigoBarras}
                        </p>
                        {producto.categoria && (
                          <p className={`text-gray-400 ${viewMode === 'list' ? 'text-xs' : 'text-xs'} truncate`}>
                            {producto.categoria.nombre}
                          </p>
                        )}
                        {producto.precio && (
                          <p className={`text-indigo-600 font-semibold ${viewMode === 'list' ? 'text-sm' : 'text-sm'}`}>
                            ${producto.precio.toFixed(2)}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Paginación */}
            {renderPagination()}
          </>
        )}
      </div>
    </ContrastEnhancer>
  );
}