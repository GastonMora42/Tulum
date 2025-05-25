// src/app/(admin)/admin/solicitudes-insumos-pdv/page.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Package, Clock, CheckCircle, Send, Eye } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCSelect } from '@/components/ui/HighContrastComponents';

interface Solicitud {
  id: string;
  estado: string;
  fechaCreacion: string;
  observaciones: string | null;
  sucursal: {
    nombre: string;
  };
  usuario: {
    name: string;
  };
  items: Array<{
    insumoPdv: {
      nombre: string;
      unidadMedida: string;
    };
    cantidadSolicitada: number;
  }>;
}

export default function SolicitudesInsumosPdvPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filtroEstado, setFiltroEstado] = useState('');

  useEffect(() => {
    fetchSolicitudes();
  }, [filtroEstado]);

  const fetchSolicitudes = async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (filtroEstado) params.append('estado', filtroEstado);

      const response = await authenticatedFetch(`/api/admin/solicitudes-insumos-pdv?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSolicitudes(data);
      }
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    const configs = {
      pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, label: 'Pendiente' },
      aprobada: { color: 'bg-blue-100 text-blue-800', icon: CheckCircle, label: 'Aprobada' },
      enviada: { color: 'bg-indigo-100 text-indigo-800', icon: Send, label: 'Enviada' },
      recibida: { color: 'bg-green-100 text-green-800', icon: CheckCircle, label: 'Recibida' }
    };
    return configs[estado as keyof typeof configs] || configs.pendiente;
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Solicitudes de Insumos PDV</h1>
              <p className="text-white/80">Gestión de solicitudes desde sucursales</p>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-black mb-1">
                Estado
              </label>
              <HCSelect
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-48"
              >
                <option value="">Todos los estados</option>
                <option value="pendiente">Pendiente</option>
                <option value="aprobada">Aprobada</option>
                <option value="enviada">Enviada</option>
                <option value="recibida">Recibida</option>
              </HCSelect>
            </div>
          </div>
        </div>

        {/* Lista de solicitudes */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {isLoading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin h-8 w-8 border-4 border-[#311716] border-t-transparent rounded-full"></div>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {solicitudes.map((solicitud) => {
                const estadoConfig = getEstadoBadge(solicitud.estado);
                const IconoEstado = estadoConfig.icon;
                
                return (
                  <div key={solicitud.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          <div className={`p-2 rounded-lg ${estadoConfig.color.replace('text-', 'bg-').replace('800', '100')}`}>
                            <IconoEstado className={`h-5 w-5 ${estadoConfig.color.includes('yellow') ? 'text-yellow-600' : 
                                                                estadoConfig.color.includes('blue') ? 'text-blue-600' :
                                                                estadoConfig.color.includes('indigo') ? 'text-indigo-600' :
                                                                'text-green-600'}`} />
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-medium text-black">
                              Solicitud #{solicitud.id.substring(solicitud.id.length - 8)}
                            </h3>
                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${estadoConfig.color}`}>
                              {estadoConfig.label}
                            </span>
                          </div>
                          
                          <div className="text-sm text-black mb-2">
                            <strong>Sucursal:</strong> {solicitud.sucursal.nombre} • 
                            <strong> Solicitado por:</strong> {solicitud.usuario.name}
                          </div>
                          
                          <div className="text-sm text-black mb-2">
                            <strong>Fecha:</strong> {format(new Date(solicitud.fechaCreacion), 'dd/MM/yyyy HH:mm')}
                          </div>
                          
                          <div className="text-sm text-black">
                            <strong>Items:</strong> {solicitud.items.length} insumo(s) solicitado(s)
                          </div>
                          
                          {solicitud.observaciones && (
                            <div className="text-sm text-gray-600 mt-2">
                              <strong>Observaciones:</strong> {solicitud.observaciones}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Link 
                          href={`/admin/solicitudes-insumos-pdv/${solicitud.id}`}
                          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver detalles
                        </Link>
                        
                        {solicitud.estado === 'pendiente' && (
                          <Link 
                            href={`/admin/solicitudes-insumos-pdv/${solicitud.id}/aprobar`}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Procesar
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}