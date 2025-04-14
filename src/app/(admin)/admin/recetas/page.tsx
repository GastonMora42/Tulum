// src/app/(admin)/admin/recetas/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Book, Plus, Search, Filter, RefreshCw } from 'lucide-react';

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items: Array<{
    id: string;
    insumoId: string;
    cantidad: number;
    insumo: {
      nombre: string;
      unidadMedida: string;
    }
  }>;
  productoRecetas?: Array<{
    id: string;
    productoId: string;
    producto: {
      nombre: string;
    }
  }>;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function RecetasPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const router = useRouter();

  const fetchRecetas = async (page = 1) => {
    setIsLoading(true);
    try {
      // Construir query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      
      const response = await fetch(`/api/admin/recetas?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar recetas');
      }
      
      const data = await response.json();
      setRecetas(data.data);
      setPaginationInfo(data.pagination);
    } catch (err) {
      console.error('Error al cargar recetas:', err);
      setError('No se pudieron cargar las recetas');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecetas();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecetas(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= paginationInfo.totalPages) {
      fetchRecetas(newPage);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Recetas</h1>
        </div>
        <Link 
          href="/admin/recetas/nueva"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nueva Receta
        </Link>
      </div>

      {/* Búsqueda y filtros */}
      <div className="rounded-lg border bg-card shadow">
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium mb-1">
                Buscar recetas
              </label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  id="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nombre o descripción..."
                  className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Filter className="mr-2 h-4 w-4" />
                Filtrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  fetchRecetas(1);
                }}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Restablecer
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Lista de recetas */}
      <div className="rounded-lg border bg-card shadow">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando recetas...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {recetas.length === 0 ? (
              <div className="col-span-full flex items-center justify-center p-8">
                <p className="text-sm text-muted-foreground">No se encontraron recetas</p>
              </div>
            ) : (
              recetas.map((receta) => (
                <div key={receta.id} className="rounded-lg border border-border hover:border-ring transition-colors p-4 hover:shadow">
                  <h3 className="text-lg font-medium mb-2">{receta.nombre}</h3>
                  
                  {receta.descripcion && (
                    <p className="text-sm text-muted-foreground mb-3">{receta.descripcion}</p>
                  )}
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-sm font-medium">Rendimiento:</span>
                    <span className="text-sm">{receta.rendimiento} unidades</span>
                  </div>
                  
                  <div className="text-sm font-medium mb-1">Ingredientes:</div>
                  <ul className="text-sm text-muted-foreground mb-4">
                    {receta.items.slice(0, 3).map((item) => (
                      <li key={item.id} className="mb-1">
                        {item.insumo.nombre}: {item.cantidad} {item.insumo.unidadMedida}
                      </li>
                    ))}
                    {receta.items.length > 3 && (
                      <li className="text-xs text-muted-foreground">
                        +{receta.items.length - 3} más...
                      </li>
                    )}
                  </ul>
                  
                  {receta.productoRecetas && receta.productoRecetas.length > 0 && (
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Productos asociados:</div>
                      <p className="text-sm text-muted-foreground">
                        {receta.productoRecetas.map(pr => pr.producto.nombre).join(', ')}
                      </p>
                    </div>
                  )}
                  
                  <div className="flex justify-end">
                    <Link 
                      href={`/admin/recetas/${receta.id}`}
                      className="text-sm font-medium text-accent"
                    >
                      Ver detalles
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
        
        {/* Paginación */}
        {!isLoading && !error && recetas.length > 0 && (
          <div className="flex items-center justify-between border-t bg-card px-4 py-3">
            <div className="text-sm text-muted-foreground">
              Mostrando <span className="font-medium">{Math.min(1, paginationInfo.total)}</span> a <span className="font-medium">
                {Math.min(paginationInfo.page * paginationInfo.limit, paginationInfo.total)}
              </span> de <span className="font-medium">{paginationInfo.total}</span> resultados
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(paginationInfo.page - 1)}
                disabled={paginationInfo.page === 1}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-muted"
              >
                Anteriores
              </button>
              <div className="text-sm">
                Página {paginationInfo.page} de {paginationInfo.totalPages}
              </div>
              <button
                onClick={() => handlePageChange(paginationInfo.page + 1)}
                disabled={paginationInfo.page === paginationInfo.totalPages}
                className="inline-flex items-center justify-center rounded-md border px-3 py-2 text-sm disabled:opacity-50 disabled:pointer-events-none hover:bg-muted"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}