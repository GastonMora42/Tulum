'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import apiClient from '@/lib/api/client';

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  codigoBarras?: string;
  categoriaId: string;
  categoria: {
    nombre: string;
  };
  activo: boolean;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProductosPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });

  const fetchProductos = async (page = 1) => {
    setIsLoading(true);
    try {
      // Aquí simularemos la respuesta para no depender de la API real
      // En producción usaríamos:
      // const response = await apiClient.get('/api/productos', {
      //   page: page.toString(),
      //   limit: '10',
      //   search
      // });
      
      // Simular respuesta
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockProductos: Producto[] = [
        {
          id: '1',
          nombre: 'Difusor Bambú',
          precio: 450,
          codigoBarras: '1001',
          categoriaId: 'c1',
          categoria: { nombre: 'Difusores' },
          activo: true
        },
        {
          id: '2',
          nombre: 'Vela Lavanda',
          precio: 350,
          codigoBarras: '1002',
          categoriaId: 'c2',
          categoria: { nombre: 'Velas Aromáticas' },
          activo: true
        },
        {
          id: '3',
          nombre: 'Aceite Esencial Limón',
          precio: 280,
          codigoBarras: '1003',
          categoriaId: 'c3',
          categoria: { nombre: 'Aceites Esenciales' },
          activo: true
        }
      ];
      
      setProductos(mockProductos);
      setPaginationInfo({
        page,
        limit: 10,
        total: 3,
        totalPages: 1
      });
    } catch (err) {
      console.error('Error al cargar productos:', err);
      setError('No se pudieron cargar los productos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProductos(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= paginationInfo.totalPages) {
      fetchProductos(newPage);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Productos</h1>
        <Link 
          href="/admin/productos/nuevo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Nuevo Producto
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre, descripción o código..."
            className="flex-1 p-2 border border-gray-300 rounded-md"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Tabla de productos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando productos...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Nombre
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Precio
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Código de Barras
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Categoría
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Estado
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {productos.map((producto) => (
                  <tr
                  key={producto.id}>
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="text-sm font-medium text-gray-900">{producto.nombre}</div>
  </td>
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="text-sm text-gray-900">${producto.precio.toFixed(2)}</div>
  </td>
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="text-sm text-gray-500">{producto.codigoBarras || '-'}</div>
  </td>
  <td className="px-6 py-4 whitespace-nowrap">
    <div className="text-sm text-gray-500">{producto.categoria.nombre}</div>
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
      className="text-red-600 hover:text-red-900"
      onClick={() => {
        // Implementar lógica para deshabilitar producto
        alert(`Desactivar producto: ${producto.nombre}`);
      }}
    >
      {producto.activo ? 'Desactivar' : 'Activar'}
    </button>
  </td>
</tr>
                ))}
              </tbody>
            </table>

            {/* Paginación */}
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => handlePageChange(paginationInfo.page - 1)}
                  disabled={paginationInfo.page === 1}
                  className={`relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    paginationInfo.page === 1
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Anterior
                </button>
                <button
                  onClick={() => handlePageChange(paginationInfo.page + 1)}
                  disabled={paginationInfo.page === paginationInfo.totalPages}
                  className={`ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    paginationInfo.page === paginationInfo.totalPages
                      ? 'bg-gray-100 text-gray-400'
                      : 'bg-white text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">
                      {(paginationInfo.page - 1) * paginationInfo.limit + 1}
                    </span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(
                        paginationInfo.page * paginationInfo.limit,
                        paginationInfo.total
                      )}
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
                          ? 'text-gray-300'
                          : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      <span className="sr-only">Anterior</span>
                      &lt;
                    </button>
                    {Array.from({ length: paginationInfo.totalPages }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => handlePageChange(idx + 1)}
                        className={`relative inline-flex items-center px-4 py-2 border ${
                          paginationInfo.page === idx + 1
                            ? 'z-10 bg-indigo-50 border-indigo-500 text-indigo-600'
                            : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        } text-sm font-medium`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(paginationInfo.page + 1)}
                      disabled={paginationInfo.page === paginationInfo.totalPages}
                      className={`relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium ${
                        paginationInfo.page === paginationInfo.totalPages
                          ? 'text-gray-300'
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
          </>
        )}
      </div>
    </div>
  );
}