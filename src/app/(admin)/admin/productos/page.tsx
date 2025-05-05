'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Filter, RefreshCw, AlertCircle, Printer } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';
import Image from 'next/image';

interface Producto {
  id: string;
  nombre: string;
  descripcion: string | null;
  precio: number;
  codigoBarras: string | null;
  imagen: string | null;
  stockMinimo: number;
  activo: boolean;
  categoria: {
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
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoriaId, setCategoriaId] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [imagenError, setImagenError] = useState<Record<string, boolean>>({});
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const router = useRouter();

  // Cargar productos con filtros
  const fetchProductos = async (page = 1) => {
    try {
      setIsLoading(true);
      
      // Construir query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      if (categoriaId) params.append('categoriaId', categoriaId);
      params.append('soloActivos', soloActivos.toString());
      
      const response = await authenticatedFetch(`/api/admin/productos?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar productos');
      }
      
      const data = await response.json();
      setProductos(data.data);
      setPaginationInfo(data.pagination);
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar categorías para el filtro
  const fetchCategorias = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/categorias');
      
      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }
      
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
    }
  };

  // Cargar datos iniciales
  useEffect(() => {
    fetchProductos();
    fetchCategorias();
  }, [soloActivos]);

  // Manejar búsqueda
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProductos(1);
  };

  // Cambiar estado activo/inactivo
  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      setIsDeleting(id);
      
      const response = await authenticatedFetch(`/api/admin/productos/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ activo: !currentActive })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar estado del producto');
      }
      
      // Actualizar la lista
      fetchProductos(paginationInfo.page);
    } catch (err) {
      console.error('Error al actualizar producto:', err);
      setError('Error al actualizar estado del producto');
    } finally {
      setIsDeleting(null);
    }
  };

  // Cambiar página
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= paginationInfo.totalPages) {
      fetchProductos(newPage);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
      <div className="flex justify-between items-center">
  <h1 className="text-2xl font-bold text-black">Gestión de Productos</h1>
  <div className="flex gap-3">
    <Link 
      href="/admin/productos/imprimir-codigos" 
      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
    >
      <Printer className="h-4 w-4 mr-2" />
      Imprimir Códigos
    </Link>
    <Link 
      href="/admin/productos/nuevo" 
      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
    >
      <Plus className="h-4 w-4 mr-2" />
      Nuevo Producto
    </Link>
  </div>
</div>
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-1">
                Buscar
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre, descripción o código..."
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
            </div>
            
            <div>
              <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                id="categoria"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                className="block w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(categoria => (
                  <option key={categoria.id} value={categoria.id}>
                    {categoria.nombre}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-end">
              <div className="flex items-center h-10">
                <input
                  id="soloActivos"
                  type="checkbox"
                  checked={soloActivos}
                  onChange={(e) => setSoloActivos(e.target.checked)}
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="soloActivos" className="ml-2 block text-sm text-gray-700">
                  Mostrar solo activos
                </label>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtrar
            </button>
            
            <button
              type="button"
              onClick={() => {
                setSearch('');
                setCategoriaId('');
                setSoloActivos(true);
                fetchProductos(1);
              }}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Limpiar filtros
            </button>
          </div>
        </form>
      </div>

      {error && (
          <div className="bg-red-50 border-l-4 border-red-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-black">{error}</p>
              </div>
            </div>
          </div>
        )}
        {/* Tabla de productos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <p className="mt-2 text-sm text-black">Cargando productos...</p>
            </div>
          ) : productos.length === 0 ? (
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-black">No hay productos</h3>
              <p className="mt-1 text-sm text-black">
                {search || categoriaId 
                  ? 'No se encontraron productos con los filtros aplicados.' 
                  : 'Comienza creando un nuevo producto.'}
              </p>
              <div className="mt-6">
                <Link
                  href="/admin/productos/nuevo"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <HCTable className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                        Nombre
                      </HCTh>
                      <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio
                      </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código de Barras
                      </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoría
                      </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stock Mínimo
                      </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                      </HCTh>
                    <HCTh scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                      </HCTh>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {productos.map(producto => (
                    <tr key={producto.id} className="hover:bg-gray-50">
<td className="px-6 py-4 whitespace-nowrap">
<td className="px-6 py-4 whitespace-nowrap">
  <div className="flex items-center">
    {producto.imagen ? (
      <div className="flex-shrink-0 h-10 w-10 mr-4 relative">
        {/* Usar Next.js Image para mejor manejo de imágenes externas */}
        <Image 
          src={producto.imagen}
          alt={producto.nombre}
          width={40}
          height={40}
          className="rounded-full object-cover"
          unoptimized={true} // Importante para imágenes externas como S3
          onError={() => {
            console.error(`Error cargando imagen: ${producto.imagen}`);
          }}
        />
      </div>
    ) : (
      <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-4">
        <Package className="h-6 w-6 text-gray-500" />
      </div>
    )}
    <div>
      <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
      {producto.descripcion && (
        <div className="text-sm text-gray-500 truncate max-w-xs">
          {producto.descripcion}
        </div>
      )}
    </div>
  </div>
</td>
</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        ${producto.precio.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.codigoBarras || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                          {producto.categoria.nombre}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {producto.stockMinimo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${producto.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {producto.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <Link
                          href={`/admin/productos/${producto.id}`}
                          className="text-indigo-600 hover:text-indigo-900 mr-4"
                        >
                          Editar
                        </Link>
                        <button
                          onClick={() => handleToggleActive(producto.id, producto.activo)}
                          disabled={isDeleting === producto.id}
                          className={`${isDeleting === producto.id ? 'text-gray-400 cursor-not-allowed' : producto.activo ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                        >
                          {isDeleting === producto.id 
                            ? 'Procesando...' 
                            : producto.activo 
                            ? 'Desactivar' 
                            : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </HCTable>
            </div>

            {/* Paginación */}
            {paginationInfo.totalPages > 1 && (
              <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-gray-700">
                      Mostrando <span className="font-medium">{(paginationInfo.page - 1) * paginationInfo.limit + 1}</span> a{' '}
                      <span className="font-medium">
                        {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)}
                      </span>{' '}
                      de <span className="font-medium">{paginationInfo.total}</span> resultados
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => handlePageChange(paginationInfo.page - 1)}
                        disabled={paginationInfo.page === 1}
                        className={`relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium ${
                          paginationInfo.page === 1
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Anterior</span>
                        &lt;
                      </button>
                      
                      {/* Mostrar solo un conjunto limitado de páginas */}
                      {Array.from({ length: Math.min(5, paginationInfo.totalPages) }, (_, i) => {
                        // Calcula el número de página para mostrar (centrado alrededor de la página actual)
                        let pageNum = paginationInfo.page;
                        if (paginationInfo.page <= 3) {
                          pageNum = i + 1;
                        } else if (paginationInfo.page >= paginationInfo.totalPages - 2) {
                          pageNum = paginationInfo.totalPages - 4 + i;
                        } else {
                          pageNum = paginationInfo.page - 2 + i;
                        }
                        
                        // Asegúrate de que pageNum esté dentro del rango válido
                        if (pageNum > 0 && pageNum <= paginationInfo.totalPages) {
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border ${
                                paginationInfo.page === pageNum
                                  ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              } text-sm font-medium`}
                            >
                              {pageNum}
                            </button>
                          );
                        }
                        return null;
                      })}
                      
                      <button
                        onClick={() => handlePageChange(paginationInfo.page + 1)}
                        disabled={paginationInfo.page === paginationInfo.totalPages}
                        className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                          paginationInfo.page === paginationInfo.totalPages
                            ? 'text-gray-300 cursor-not-allowed'
                            : 'text-gray-500 hover:bg-gray-50'
                        }`}
                      >
                        <span className="sr-only">Siguiente</span>
                        &gt;
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
    </ContrastEnhancer>
  );
}