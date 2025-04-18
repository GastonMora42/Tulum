// src/app/(admin)/admin/contingencias/page.tsx

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface Contingencia {
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

  useEffect(() => {
    const fetchContingencias = async () => {
      try {
        setIsLoading(true);
        
        // Construir query params
        const params = new URLSearchParams();
        if (filtroEstado) params.append('estado', filtroEstado);
        if (filtroOrigen) params.append('origen', filtroOrigen);
        
        const response = await fetch(`/api/contingencias?${params.toString()}`);
        
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Contingencias</h1>
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
            <label htmlFor="filtroEstado" className="block text-sm font-medium text-gray-700">
              Filtrar por estado
            </label>
            <select
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
            </select>
          </div>
          <div>
            <label htmlFor="filtroOrigen" className="block text-sm font-medium text-gray-700">
              Filtrar por origen
            </label>
            <select
              id="filtroOrigen"
              value={filtroOrigen}
              onChange={(e) => setFiltroOrigen(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="">Todos los orígenes</option>
              <option value="fabrica">Fábrica</option>
              <option value="sucursal">Sucursal</option>
              <option value="oficina">Oficina</option>
            </select>
          </div>
        </div>
      </div>

      {/* Lista de contingencias */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando contingencias...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : contingencias.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-lg text-gray-500">No hay contingencias que mostrar</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Título
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Origen
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Estado
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Fecha
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Creado por
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
              {contingencias.map((contingencia) => (
                <tr key={contingencia.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{contingencia.titulo}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getOrigenBadge(contingencia.origen)}`}>
                      {contingencia.origen === 'fabrica' ? 'Fábrica' : 
                       contingencia.origen === 'sucursal' ? 'Sucursal' : 'Oficina'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                      {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                       contingencia.estado === 'en_revision' ? 'En revisión' : 
                       contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(contingencia.fechaCreacion)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{contingencia.usuario.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/admin/contingencias/${contingencia.id}`}
                      className="text-indigo-600 hover:text-indigo-900"
                    >
                      Ver detalles
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}