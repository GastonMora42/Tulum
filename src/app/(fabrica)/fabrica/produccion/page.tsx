// src/app/(fabrica)/fabrica/produccion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { Package, ChevronRight, Filter, Calendar, SearchIcon } from 'lucide-react';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCTable, HCTh, HCTd, HCSelect } from '@/components/ui/HighContrastComponents';

interface Produccion {
  id: string;
  recetaId: string;
  cantidad: number;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  receta: {
    nombre: string;
  };
  usuario: {
    name: string;
  };
}

export default function ProduccionesPage() {
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const router = useRouter();
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    const fetchProducciones = async () => {
      try {
        setIsLoading(true);
        
        // Construir URL con filtros
        let url = '/api/fabrica/produccion';
        if (filtroEstado) {
          url += `?estado=${filtroEstado}`;
        }
        
        const response = await authenticatedFetch(url);
        
        if (!response.ok) {
          throw new Error('Error al cargar producciones');
        }
        
        const data = await response.json();
        setProducciones(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las producciones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProducciones();
  }, [filtroEstado]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-black';
      case 'en_proceso':
        return 'bg-blue-100 text-black';
      case 'finalizada':
        return 'bg-green-100 text-black';
      case 'con_contingencia':
        return 'bg-red-100 text-black';
      default:
        return 'bg-gray-100 text-black';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Gestión de Producción</h1>
          {hasPermission('produccion:crear') && (
            <Link 
              href="/fabrica/produccion/nueva" 
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Nueva Producción
            </Link>
          )}
        </div>
        
        {/* Filtros */}
        <div className="bg-white p-4 rounded-md shadow">
          <div className="flex flex-wrap gap-4 items-center">
            <div>
              <label htmlFor="estado" className="block text-sm font-medium text-black mb-1">
                Estado
              </label>
              <HCSelect
                id="estado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="">Todos</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_proceso">En proceso</option>
                <option value="finalizada">Finalizada</option>
                <option value="con_contingencia">Con contingencia</option>
              </HCSelect>
            </div>
          </div>
        </div>
        
        {/* Lista de producciones */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-lg text-black">Cargando producciones...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
            </div>
          ) : producciones.length === 0 ? (
            <div className="text-center py-10">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-black">No hay producciones</h3>
              <p className="mt-1 text-sm text-black">
                No se encontraron producciones con los filtros seleccionados.
              </p>
            </div>
          ) : (
            <HCTable>
              <thead>
                <tr>
                  <HCTh>ID</HCTh>
                  <HCTh>Receta</HCTh>
                  <HCTh>Cantidad</HCTh>
                  <HCTh>Estado</HCTh>
                  <HCTh>Fecha inicio</HCTh>
                  <HCTh>Fecha fin</HCTh>
                  <HCTh>Acciones</HCTh>
                </tr>
              </thead>
              <tbody>
                {producciones.map((produccion) => (
                  <tr key={produccion.id} className="hover:bg-gray-50">
                    <HCTd>{produccion.id.slice(-6)}</HCTd>
                    <HCTd>
                      <div className="text-sm font-medium text-black">
                        {produccion.receta.nombre}
                      </div>
                    </HCTd>
                    <HCTd>{produccion.cantidad}</HCTd>
                    <HCTd>
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(produccion.estado)}`}>
                        {produccion.estado === 'pendiente' ? 'Pendiente' : 
                        produccion.estado === 'en_proceso' ? 'En proceso' : 
                        produccion.estado === 'finalizada' ? 'Finalizada' : 
                        'Con contingencia'}
                      </span>
                    </HCTd>
                    <HCTd>{formatDate(produccion.fechaInicio)}</HCTd>
                    <HCTd>{formatDate(produccion.fechaFin)}</HCTd>
                    <HCTd>
                      <Link
                        href={`/fabrica/produccion/${produccion.id}`}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Ver detalles
                      </Link>
                    </HCTd>
                  </tr>
                ))}
              </tbody>
            </HCTable>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}