'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth'; // Asegúrate de que esta ruta sea correcta
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer'; // Asegúrate de que esta ruta sea correcta
import { Loader, Package, Printer, RefreshCw, ChevronLeft, Check, AlertTriangle } from 'lucide-react';

// Definición de la interfaz del producto
interface Producto {
  id: string;
  nombre: string;
  codigoBarras: string;
  precio?: number; // El precio es opcional
}

export default function ImprimirCodigosPage() {
  // --- Estados principales del componente ---
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPrinting, setIsPrinting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // --- Estados para la paginación y el filtro ---
  const [searchTerm, setSearchTerm] = useState(''); // Término de búsqueda
  const [currentPage, setCurrentPage] = useState(1); // Página actual
  const [productsPerPage, setProductsPerPage] = useState(10); // Cantidad de productos por página
  const [totalPages, setTotalPages] = useState(0); // Total de páginas disponibles

  const router = useRouter();

  // --- Efecto para cargar los productos con paginación y filtro ---
  useEffect(() => {
    const fetchProductos = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Construye la URL de la API incluyendo los parámetros de paginación y búsqueda
        const response = await authenticatedFetch(
          `/api/admin/productos?limit=${productsPerPage}&page=${currentPage}&search=${encodeURIComponent(searchTerm)}`
        );

        if (response.ok) {
          const data = await response.json();
          // La API ya debería haber filtrado y paginado los productos
          setProductos(data.data);
          setTotalPages(data.totalPages);
          setCurrentPage(data.currentPage);
          
          // Mensajes de error específicos basados en la respuesta de la API
          if (data.totalProducts > 0 && data.data.length === 0) {
            setError("No hay productos con códigos de barras que coincidan con su búsqueda en esta página.");
          } else if (data.totalProducts === 0) {
            setError("No hay productos con códigos de barras disponibles. Asigne códigos de barras a sus productos primero.");
          }
        } else {
          // Si la respuesta no es OK, lanza un error
          throw new Error('Error al cargar productos');
        }
      } catch (error: any) {
        console.error('Error al cargar productos:', error);
        setError('No se pudieron cargar los productos. Por favor, inténtelo de nuevo.');
      } finally {
        setIsLoading(false);
      }
    };
    
    // Implementación de debounce para el campo de búsqueda:
    // Retrasa la llamada a la API hasta que el usuario deja de escribir por 300ms,
    // mejorando el rendimiento y reduciendo llamadas innecesarias al servidor.
    const handler = setTimeout(() => {
      fetchProductos();
    }, 300); 

    // Función de limpieza para cancelar el timeout si el componente se desmonta
    // o las dependencias cambian antes de que se ejecute el timeout.
    return () => {
      clearTimeout(handler);
    };

  }, [searchTerm, currentPage, productsPerPage]); // Las dependencias que disparan el useEffect

  // --- Lógica para la selección de productos ---
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prevSelected => {
      if (prevSelected.includes(productId)) {
        // Si ya está seleccionado, lo quita
        return prevSelected.filter(id => id !== productId);
      } else {
        // Si no está seleccionado, lo añade
        return [...prevSelected, productId];
      }
    });
  };

  // --- Lógica para imprimir los productos seleccionados ---
  const handlePrintSelected = async () => {
    if (selectedProducts.length === 0) {
      setError("Seleccione al menos un producto para imprimir");
      return;
    }
    
    try {
      setIsPrinting(true);
      setError(null); // Limpia cualquier error previo

      // Realiza la solicitud POST a tu API de impresión de códigos de barras
      const response = await authenticatedFetch('/api/admin/productos/print-barcodes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productIds: selectedProducts }) // Envía los IDs de los productos seleccionados
      });
      
      if (response.ok) {
        const blob = await response.blob(); // Obtiene el PDF como un Blob
        const url = URL.createObjectURL(blob); // Crea una URL para el Blob
        
        // Abre el PDF en una nueva ventana/pestaña del navegador
        const newWindow = window.open(url, '_blank');
        if (!newWindow) {
          setError("El navegador bloqueó la apertura del PDF. Por favor, permita ventanas emergentes.");
        }
        // Opcional: Puedes limpiar la selección después de la impresión si lo deseas
        // setSelectedProducts([]);
      } else {
        // Manejo de errores si la generación del PDF falla en el backend
        const errorData = await response.text();
        throw new Error(`Error al generar PDF: ${errorData}`);
      }
    } catch (error: any) {
      console.error('Error al imprimir códigos:', error);
      setError(`Error al imprimir códigos: ${error.message}`);
    } finally {
      setIsPrinting(false); // Siempre desactiva el estado de impresión al finalizar
    }
  };

  // --- Lógica para seleccionar/deseleccionar todos los productos en la página actual ---
  const handleSelectAll = () => {
    const currentProductIds = productos.map(p => p.id); // IDs de los productos en la página actual
    // Verifica si todos los productos en la página actual ya están seleccionados
    const allSelectedOnPage = currentProductIds.every(id => selectedProducts.includes(id));

    if (allSelectedOnPage) {
      // Si todos ya están seleccionados, los deselecciona de la lista global
      setSelectedProducts(prevSelected => prevSelected.filter(id => !currentProductIds.includes(id)));
    } else {
      // Si no todos están seleccionados, añade los de la página actual a la selección global
      const newSelected = new Set([...selectedProducts, ...currentProductIds]);
      setSelectedProducts(Array.from(newSelected));
    }
  };

  // --- Renderizado del componente ---
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Encabezado de la página */}
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
        
        {/* Área de visualización de errores */}
        {error && (
          <div className="bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-start">
            <AlertTriangle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        
        {/* Indicador de carga */}
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
                    setCurrentPage(1); // Reinicia a la primera página con cada nueva búsqueda
                  }}
                  className="block w-full sm:w-auto rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                />
                <div className="flex items-center gap-2">
                  <label htmlFor="productsPerPage" className="text-sm text-gray-700">Productos por página:</label>
                  <select
                    id="productsPerPage"
                    value={productsPerPage}
                    onChange={(e) => {
                      setProductsPerPage(Number(e.target.value));
                      setCurrentPage(1); // Reinicia a la primera página al cambiar el límite
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
                    {/* Texto del botón "Seleccionar todos" dinámico */}
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
                  <p className="text-gray-600 mb-2">No hay productos con códigos de barras disponibles que coincidan con su búsqueda.</p>
                  <p className="text-gray-500 text-sm">Intente ajustar su filtro de búsqueda o asigne códigos de barras a sus productos.</p>
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
                            onChange={() => {}} // El onChange vacío evita que el checkbox sea manipulado directamente
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
            
            {/* Botón para administrar productos (enlace externo) */}
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