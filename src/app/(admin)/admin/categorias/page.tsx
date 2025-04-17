'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TagIcon, Plus, Search, Edit, Trash, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Categoria {
  id: string;
  nombre: string;
}

export default function CategoriasPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchCategorias();
  }, []);

  const fetchCategorias = async () => {
    try {
      setIsLoading(true);
      const response = await authenticatedFetch('/api/admin/categorias');
      
      if (!response.ok) {
        throw new Error('Error al cargar categorías');
      }
      
      const data = await response.json();
      setCategorias(data);
    } catch (err) {
      console.error('Error al cargar categorías:', err);
      setError('No se pudieron cargar las categorías');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Filtrar categorías localmente ya que no hay endpoint de búsqueda
    if (!search.trim()) {
      fetchCategorias();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setIsDeleting(id);
      
      const response = await authenticatedFetch(`/api/admin/categorias/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar categoría');
      }
      
      // Actualizar la lista
      setCategorias(categorias.filter(cat => cat.id !== id));
    } catch (err: any) {
      console.error('Error al eliminar categoría:', err);
      setError(err.message || 'Error al eliminar categoría');
    } finally {
      setIsDeleting(null);
    }
  };

  // Filtrar categorías por búsqueda
  const filteredCategorias = search.trim() 
    ? categorias.filter(cat => 
        cat.nombre.toLowerCase().includes(search.toLowerCase())
      )
    : categorias;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Categorías</h1>
        <Link 
          href="/admin/categorias/nueva" 
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Nueva Categoría
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="bg-white p-4 rounded-lg shadow">
        <form onSubmit={handleSearch} className="sm:flex sm:items-center">
          <div className="w-full sm:max-w-xs">
            <label htmlFor="search" className="sr-only">Buscar</label>
            <div className="relative rounded-md shadow-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar categoría..."
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>
          </div>
          <button
            type="submit"
            className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Buscar
          </button>
        </form>
      </div>

      {/* Mensajes de error */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de categorías */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando categorías...</p>
          </div>
        ) : filteredCategorias.length === 0 ? (
          <div className="text-center py-10">
            <TagIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay categorías</h3>
            <p className="mt-1 text-sm text-gray-500">
              {search ? 'No se encontraron categorías para su búsqueda.' : 'Comience creando una nueva categoría.'}
            </p>
            <div className="mt-6">
              <Link
                href="/admin/categorias/nueva"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nueva Categoría
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredCategorias.map(categoria => (
                  <tr key={categoria.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <TagIcon className="h-5 w-5 text-gray-400 mr-3" />
                        <div className="text-sm font-medium text-gray-900">
                          {categoria.nombre}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link
                        href={`/admin/categorias/${categoria.id}`}
                        className="text-indigo-600 hover:text-indigo-900 mr-4"
                      >
                        <Edit className="h-5 w-5 inline mr-1" />
                        Editar
                      </Link>
                      <button
                        onClick={() => handleDelete(categoria.id)}
                        disabled={isDeleting === categoria.id}
                        className={`${isDeleting === categoria.id ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:text-red-900'}`}
                      >
                        {isDeleting === categoria.id ? (
                          <Loader2 className="h-5 w-5 inline animate-spin mr-1" />
                        ) : (
                          <Trash className="h-5 w-5 inline mr-1" />
                        )}
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}