// src/app/(admin)/admin/insumos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Package, Plus, Search, Filter, RefreshCw } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Insumo {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockMinimo: number;
  proveedorId: string | null;
  activo: boolean;
  proveedor?: {
    id: string;
    nombre: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function InsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [soloActivos, setSoloActivos] = useState(true);
  const [paginationInfo, setPaginationInfo] = useState<PaginationInfo>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0
  });
  const router = useRouter();

const fetchInsumos = async (page = 1) => {
    setIsLoading(true);
    try {
      // Construir query params
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '10');
      if (search) params.append('search', search);
      params.append('soloActivos', soloActivos.toString());
      
      const response = await authenticatedFetch(`/api/admin/insumos?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Error al cargar insumos');
      }
      
      const data = await response.json();
      setInsumos(data.data);
      setPaginationInfo(data.pagination);
    } catch (err) {
      console.error('Error al cargar insumos:', err);
      setError('No se pudieron cargar los insumos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchInsumos();
  }, [soloActivos]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInsumos(1);
  };

  const handleToggleActive = async (id: string, currentActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/insumos/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ activo: !currentActive })
      });
      
      if (!response.ok) {
        throw new Error('Error al actualizar insumo');
      }
      
      // Actualizar la lista
      fetchInsumos(paginationInfo.page);
    } catch (err) {
      console.error('Error al actualizar insumo:', err);
      setError('Error al actualizar insumo');
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= paginationInfo.totalPages) {
      fetchInsumos(newPage);
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Insumos</h1>
        </div>
        <Link 
          href="/admin/insumos/nuevo"
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Nuevo Insumo
        </Link>
      </div>

      {/* Búsqueda y filtros */}
      <div className="rounded-lg border bg-card shadow">
        <div className="p-4">
          <form onSubmit={handleSearch} className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="search" className="block text-sm font-medium mb-1">
                Buscar insumos
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
            
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="soloActivos"
                checked={soloActivos}
                onChange={(e) => setSoloActivos(e.target.checked)}
                className="h-4 w-4 rounded border-input accent-accent"
              />
              <label htmlFor="soloActivos" className="text-sm">
                Mostrar solo activos
              </label>
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
                  fetchInsumos(1);
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

      {/* Tabla de insumos */}
      <div className="rounded-lg border bg-card shadow">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando insumos...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center p-8">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Nombre
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Unidad de Medida
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Stock Mínimo
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Proveedor
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="whitespace-nowrap px-6 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y bg-card">
                  {insumos.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-sm text-muted-foreground">
                        No se encontraron insumos
                      </td>
                    </tr>
                  ) : (
                    insumos.map((insumo) => (
                      <tr key={insumo.id} className="hover:bg-muted/50">
                        <td className="whitespace-nowrap px-6 py-4">
                          <div className="text-sm font-medium">{insumo.nombre}</div>
                          {insumo.descripcion && (
                            <div className="text-xs text-muted-foreground">{insumo.descripcion}</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {insumo.unidadMedida}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {insumo.stockMinimo}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-sm">
                          {insumo.proveedor?.nombre || '-'}
                        </td>
                        <td className="whitespace-nowrap px-6 py-4">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            insumo.activo 
                              ? 'bg-accent/20 text-accent-foreground' 
                              : 'bg-destructive/20 text-destructive-foreground'
                          }`}>
                            {insumo.activo ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-6 py-4 text-right text-sm">
                          <Link 
                            href={`/admin/insumos/${insumo.id}`}
                            className="inline-flex items-center justify-center font-medium text-accent hover:text-accent/80 mr-3"
                          >
                            Editar
                          </Link>
                          <button 
                            className={`inline-flex items-center justify-center font-medium ${
                              insumo.activo ? 'text-destructive hover:text-destructive/80' : 'text-accent hover:text-accent/80'
                            }`}
                            onClick={() => handleToggleActive(insumo.id, insumo.activo)}
                          >
                            {insumo.activo ? 'Desactivar' : 'Activar'}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
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
                  Anterior
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
          </>
        )}
      </div>
    </div>
  );
}