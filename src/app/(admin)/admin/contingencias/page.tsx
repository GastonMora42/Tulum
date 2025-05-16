// src/app/(admin)/admin/contingencias/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCSelect, HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

interface Contingencia {
  conciliacionId: any;
  ubicacion: any;
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  usuario: {
    name: string;
  };
}

export default function ContingenciasPage() {
  const [contingencias, setContingencias] = useState<Contingencia[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<string>('');
  const [filtroOrigen, setFiltroOrigen] = useState<string>('');
  const router = useRouter();
  const [ubicaciones, setUbicaciones] = useState<{id: string; nombre: string}[]>([]);
  const [filtroUbicacion, setFiltroUbicacion] = useState<string>('');

  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/ubicaciones');
        if (response.ok) {
          const data = await response.json();
          setUbicaciones(data);
        }
      } catch (error) {
        console.error('Error al cargar ubicaciones:', error);
      }
    };
    
    fetchUbicaciones();
  }, []);

  useEffect(() => {
    const fetchContingencias = async () => {
      try {
        setIsLoading(true);
        
    // Construir query params
    const params = new URLSearchParams();
    if (filtroEstado) params.append('estado', filtroEstado);
    if (filtroOrigen) params.append('origen', filtroOrigen);
    if (filtroUbicacion) params.append('ubicacionId', filtroUbicacion);
    
    const response = await authenticatedFetch(`/api/contingencias?${params.toString()}`);
    
        if (!response.ok) {
          throw new Error('Error al cargar contingencias');
        }
        
        const data = await response.json();
        setContingencias(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las contingencias');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContingencias();
  }, [filtroEstado, filtroOrigen]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'en_revision':
        return 'bg-blue-100 text-blue-800';
      case 'resuelto':
        return 'bg-green-100 text-green-800';
      case 'rechazado':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getOrigenBadge = (origen: string) => {
    switch (origen) {
      case 'fabrica':
        return 'bg-purple-100 text-purple-800';
      case 'sucursal':
        return 'bg-indigo-100 text-indigo-800';
      case 'oficina':
        return 'bg-teal-100 text-teal-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

const getOrigenWithUbicacionBadge = (contingencia: any) => {
  // Color base según origen
  const baseClass = getOrigenBadge(contingencia.origen);
  
  // Si tiene ubicación específica, mostrarla
  if (contingencia.ubicacion) {
    return (
      <div>
        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${baseClass}`}>
          {contingencia.origen === 'fabrica' ? 'Fábrica' : 
           contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
        </span>
        <span className="ml-1 text-xs text-gray-500">{contingencia.ubicacion.nombre}</span>
      </div>
    );
  }
  
  // Si no tiene ubicación específica, mostrar solo el origen
  return (
    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${baseClass}`}>
      {contingencia.origen === 'fabrica' ? 'Fábrica' : 
       contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
    </span>
  );
};

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-black">Gestión de Contingencias</h1>
          <Link 
            href="/admin/contingencias/nueva" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Nueva Contingencia
          </Link>
        </div>
  
        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <HCLabel htmlFor="filtroEstado" className="block text-sm font-medium mb-1">
                Filtrar por estado
              </HCLabel>
              <HCSelect
                id="filtroEstado"
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="en_revision">En revisión</option>
                <option value="resuelto">Resuelto</option>
                <option value="rechazado">Rechazado</option>
              </HCSelect>
            </div>
            <div>
              <HCLabel htmlFor="filtroOrigen" className="block text-sm font-medium mb-1">
                Filtrar por origen
              </HCLabel>
              <HCSelect
                id="filtroOrigen"
                value={filtroOrigen}
                onChange={(e) => setFiltroOrigen(e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              >
                <option value="">Todos los orígenes</option>
                <option value="fabrica">Fábrica</option>
                <option value="sucursal">Sucursal</option>
                <option value="oficina">Oficina</option>
              </HCSelect>
            </div>
            <div>
  <HCLabel htmlFor="filtroUbicacion" className="block text-sm font-medium mb-1">
    Filtrar por ubicación
  </HCLabel>
  <HCSelect
    id="filtroUbicacion"
    value={filtroUbicacion}
    onChange={(e) => setFiltroUbicacion(e.target.value)}
    className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
  >
    <option value="">Todas las ubicaciones</option>
    {ubicaciones.map(ubicacion => (
      <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</option>
    ))}
  </HCSelect>
</div>
          </div>
        </div>
  
        {/* Lista de contingencias */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-10">
              <p className="text-lg text-black">Cargando contingencias...</p>
            </div>
          ) : error ? (
            <div className="text-center py-10">
              <p className="text-red-500">{error}</p>
            </div>
          ) : contingencias.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-lg text-black">No hay contingencias que mostrar</p>
            </div>
          ) : (
            <HCTable className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Título
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Origen
                  </HCTh>
                  <HCTh scope="col" className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">
  Ubicación
</HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Estado
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Fecha
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider"
                  >
                    Creado por
                  </HCTh>
                  <HCTh
                    scope="col"
                    className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider"
                  >
                    Acciones
                  </HCTh>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {contingencias.map((contingencia) => (
                  <tr key={contingencia.id}>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-black">{contingencia.titulo}</div>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrigenBadge(contingencia.origen)}`}>
                        {contingencia.origen === 'fabrica' ? 'Fábrica' : 
                         contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
                      </span>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
  {contingencia.ubicacion ? (
    <span className="text-sm text-gray-900">{contingencia.ubicacion.nombre}</span>
  ) : (
    <span className="text-sm text-gray-500">General</span>
  )}
</HCTd>
{contingencia.conciliacionId && (
  <span className="ml-1 px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
    Conciliación
  </span>
)}
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                        {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                         contingencia.estado === 'en_revision' ? 'En revisión' : 
                         contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                      </span>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{formatDate(contingencia.fechaCreacion)}</div>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-black">{contingencia.usuario.name}</div>
                    </HCTd>
                    <HCTd className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link 
                        href={`/admin/contingencias/${contingencia.id}`}
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