// src/app/(admin)/admin/ubicaciones/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  MapPin, 
  Users, 
  Building, 
  Factory, 
  Store, 
  Phone, 
  Plus,
  Edit,
  Eye,
  AlertCircle,
  CheckCircle,
  BarChart3
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

interface Usuario {
  id: string;
  name: string;
  email: string;
  role: { name: string; };
}

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
  direccion?: string;
  telefono?: string;
  activo: boolean;
  usuarios: Usuario[];
  _count: {
    usuarios: number;
    stocks: number;
    enviosOrigen: number;
    enviosDestino: number;
  };
}

export default function UbicacionesPage() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<string>('');

  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedFetch('/api/admin/ubicaciones/detailed');
        
        if (!response.ok) throw new Error('Error al cargar ubicaciones');
        
        const data = await response.json();
        setUbicaciones(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudieron cargar las ubicaciones');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUbicaciones();
  }, []);

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'fabrica': return <Factory className="h-5 w-5 text-purple-600" />;
      case 'sucursal': return <Store className="h-5 w-5 text-indigo-600" />;
      case 'oficina': return <Building className="h-5 w-5 text-green-600" />;
      default: return <MapPin className="h-5 w-5 text-gray-600" />;
    }
  };

  const getTipoBadge = (tipo: string) => {
    switch (tipo) {
      case 'fabrica': return 'bg-purple-100 text-purple-800';
      case 'sucursal': return 'bg-indigo-100 text-indigo-800';
      case 'oficina': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const ubicacionesFiltradas = ubicaciones.filter(ubicacion => 
    !filtroTipo || ubicacion.tipo === filtroTipo
  );

  return (
    <ContrastEnhancer>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-[#311716]">Gestión de Ubicaciones</h1>
            <p className="text-gray-600 mt-1">Administra ubicaciones y usuarios asignados</p>
          </div>
          <Link 
            href="/admin/ubicaciones/nueva" 
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#311716] hover:bg-[#462625]"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Ubicación
          </Link>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-[#fcf3ea] p-3 rounded-lg">
                <MapPin className="h-6 w-6 text-[#eeb077]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Ubicaciones</p>
                <p className="text-2xl font-bold text-[#311716]">{ubicaciones.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-[#fcf3ea] p-3 rounded-lg">
                <Users className="h-6 w-6 text-[#eeb077]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                <p className="text-2xl font-bold text-[#311716]">
                  {ubicaciones.reduce((sum, ub) => sum + ub.usuarios.length, 0)}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-[#fcf3ea] p-3 rounded-lg">
                <CheckCircle className="h-6 w-6 text-[#eeb077]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Ubicaciones Activas</p>
                <p className="text-2xl font-bold text-[#311716]">
                  {ubicaciones.filter(ub => ub.activo).length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow border border-[#eeb077] p-6">
            <div className="flex items-center">
              <div className="bg-[#fcf3ea] p-3 rounded-lg">
                <BarChart3 className="h-6 w-6 text-[#eeb077]" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Promedio Usuarios</p>
                <p className="text-2xl font-bold text-[#311716]">
                  {ubicaciones.length > 0 
                    ? Math.round(ubicaciones.reduce((sum, ub) => sum + ub.usuarios.length, 0) / ubicaciones.length)
                    : 0
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow border border-[#eeb077]">
          <div className="flex items-center space-x-4">
            <label htmlFor="filtroTipo" className="text-sm font-medium text-gray-700">
              Filtrar por tipo:
            </label>
            <select
              id="filtroTipo"
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm rounded-md"
            >
              <option value="">Todas las ubicaciones</option>
              <option value="fabrica">Fábricas</option>
              <option value="sucursal">Sucursales</option>
              <option value="oficina">Oficinas</option>
            </select>
          </div>
        </div>

        {/* Lista de ubicaciones */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-[#eeb077]">
          {isLoading ? (
            <div className="text-center py-10">
              <div className="animate-spin h-8 w-8 border-4 border-[#eeb077] border-t-transparent rounded-full mx-auto mb-2"></div>
              <p className="text-lg text-black">Cargando ubicaciones...</p>
            </div>
          ) : ubicacionesFiltradas.length === 0 ? (
            <div className="text-center py-10">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-lg text-black">No hay ubicaciones que mostrar</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {ubicacionesFiltradas.map((ubicacion) => (
                <div key={ubicacion.id} className="p-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {getTipoIcon(ubicacion.tipo)}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg font-medium text-[#311716]">
                            {ubicacion.nombre}
                          </h3>
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getTipoBadge(ubicacion.tipo)}`}>
                            {ubicacion.tipo.charAt(0).toUpperCase() + ubicacion.tipo.slice(1)}
                          </span>
                          {!ubicacion.activo && (
                            <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                              Inactiva
                            </span>
                          )}
                        </div>
                        <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                          {ubicacion.direccion && (
                            <span className="flex items-center">
                              <MapPin className="h-4 w-4 mr-1" />
                              {ubicacion.direccion}
                            </span>
                          )}
                          {ubicacion.telefono && (
                            <span className="flex items-center">
                              <Phone className="h-4 w-4 mr-1" />
                              {ubicacion.telefono}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-6">
                      {/* Estadísticas */}
                      <div className="text-right text-sm">
                        <div className="flex items-center space-x-4">
                          <div className="text-center">
                            <p className="font-medium text-[#311716]">{ubicacion.usuarios.length}</p>
                            <p className="text-gray-500">Usuarios</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-[#311716]">{ubicacion._count.stocks}</p>
                            <p className="text-gray-500">Items Stock</p>
                          </div>
                          <div className="text-center">
                            <p className="font-medium text-[#311716]">
                              {ubicacion._count.enviosOrigen + ubicacion._count.enviosDestino}
                            </p>
                            <p className="text-gray-500">Envíos</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Acciones */}
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/ubicaciones/${ubicacion.id}`}
                          className="text-[#9c7561] hover:text-[#311716] p-2 rounded-md hover:bg-gray-100"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <Link
                          href={`/admin/ubicaciones/${ubicacion.id}/editar`}
                          className="text-indigo-600 hover:text-indigo-900 p-2 rounded-md hover:bg-gray-100"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* Lista de usuarios */}
                  {ubicacion.usuarios.length > 0 && (
                    <div className="mt-4 border-t border-gray-200 pt-4">
                      <h4 className="text-sm font-medium text-gray-900 mb-2">Usuarios Asignados:</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {ubicacion.usuarios.map((usuario) => (
                          <div key={usuario.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md">
                            <div className="flex-shrink-0">
                              <Users className="h-4 w-4 text-gray-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {usuario.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {usuario.role.name} • {usuario.email}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}