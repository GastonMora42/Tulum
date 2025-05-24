// src/app/(pdv)/pdv/contingencias/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, 
  CheckCircle, 
  Loader, 
  Camera, 
  Video, 
  ArrowLeft,
  Clock,
  User,
  MapPin,
  Truck,
  AlertTriangle,
  Store,
  FileText
} from 'lucide-react';

interface Contingencia {
  id: string;
  titulo: string;
  descripcion: string;
  origen: string;
  estado: string;
  fechaCreacion: string;
  fechaRespuesta?: string;
  respuesta?: string;
  resueltoPor?: string;
  ajusteRealizado: boolean;
  envioId?: string;
  ubicacionId?: string;
  conciliacionId?: string;
  urgente: boolean;
  ubicacion?: {
    id: string;
    nombre: string;
  };
  envio?: {
    id: string;
    origen: {
      nombre: string;
    };
  };
  conciliacion?: {
    id: string;
    fecha: string;
  };
  imagenUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: string | null;
  usuario: {
    name: string;
  };
}

export default function DetalleContingenciaPDVPage({ params }: { params: { id: string } }) {
  const [contingencia, setContingencia] = useState<Contingencia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchContingencia = async () => {
      try {
        setIsLoading(true);
        const response = await authenticatedFetch(`/api/contingencias/${params.id}`);
        
        if (!response.ok) throw new Error('Error al cargar contingencia');
        
        const data = await response.json();
        setContingencia(data);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar la contingencia');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContingencia();
  }, [params.id]);

  const renderMedia = () => {
    if (!contingencia) return null;
    
    if (contingencia.imagenUrl) {
      return (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Camera className="w-4 h-4 mr-1" /> 
            Imagen adjunta
          </h4>
          <div className="flex justify-center">
            <img 
              src={contingencia.imagenUrl} 
              alt="Imagen adjunta" 
              className="max-w-full h-auto max-h-80 rounded-lg shadow-sm"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YxZjFmMSIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5OTkiPkltYWdlbiBubyBkaXNwb25pYmxlPC90ZXh0Pjwvc3ZnPg==';
              }}
            />
          </div>
        </div>
      );
    }
    
    if (contingencia.videoUrl) {
      return (
        <div className="mt-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h4 className="text-sm font-medium mb-2 flex items-center">
            <Video className="w-4 h-4 mr-1" />
            Video adjunto
          </h4>
          <div className="flex justify-center">
            <video 
              src={contingencia.videoUrl} 
              controls 
              className="max-w-full max-h-80 rounded-lg shadow-sm"
              onError={(e) => {
                const parent = e.currentTarget.parentElement;
                if (parent) {
                  parent.innerHTML = '<p class="text-red-500 p-4 bg-red-50 rounded text-center">No se pudo cargar el video</p>';
                }
              }}
            />
          </div>
        </div>
      );
    }
    
    if (contingencia.mediaType) {
      return (
        <div className="mt-4 bg-red-50 p-4 rounded-lg border border-red-200 text-center text-red-500">
          <AlertCircle className="w-5 h-5 mx-auto mb-2" />
          El archivo adjunto ya no está disponible o ha expirado
        </div>
      );
    }
    
    return null;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente': return 'bg-yellow-100 text-yellow-800';
      case 'en_revision': return 'bg-blue-100 text-blue-800';
      case 'resuelto': return 'bg-green-100 text-green-800';
      case 'rechazado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <Loader className="h-8 w-8 animate-spin mx-auto mb-2 text-blue-600" />
        <p className="text-lg text-[#311716]">Cargando contingencia...</p>
      </div>
    );
  }

  if (error && !contingencia) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">{error}</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#311716] hover:bg-[#462625]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </button>
      </div>
    );
  }

  if (!contingencia) {
    return (
      <div className="text-center py-10">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
        <p className="text-lg text-red-500">Contingencia no encontrada</p>
        <button
          onClick={() => router.back()}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-[#311716] hover:bg-[#462625]"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Detalle de Contingencia</h1>
            <p className="text-white/80">Seguimiento de incidencia reportada</p>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 text-white rounded-md hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
      </div>

      {/* Información principal */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-[#fcf3ea]">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg leading-6 font-medium text-[#311716]">
                {contingencia.titulo}
                {contingencia.urgente && (
                  <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                    URGENTE
                  </span>
                )}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-[#9c7561]">
                Creada el {formatDate(contingencia.fechaCreacion)} por {contingencia.usuario.name}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                 contingencia.estado === 'en_revision' ? 'En revisión' : 
                 contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
              </span>
              <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-indigo-100 text-indigo-800">
                <Store className="h-3 w-3 mr-1" />
                Sucursal
              </span>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200">
          <dl className="divide-y divide-gray-200">
            <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-[#311716] flex items-center">
                <AlertTriangle className="h-4 w-4 mr-2 text-gray-400" />
                Descripción
              </dt>
              <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2 whitespace-pre-line">
                {contingencia.descripcion}
              </dd>
            </div>
            
            {contingencia.ubicacion && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                <dt className="text-sm font-medium text-[#311716] flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  Ubicación específica
                </dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  {contingencia.ubicacion.nombre}
                </dd>
              </div>
            )}

            {contingencia.envio && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-[#311716] flex items-center">
                  <Truck className="h-4 w-4 mr-2 text-gray-400" />
                  Envío relacionado
                </dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Desde: {contingencia.envio.origen.nombre}</span>
                  </div>
                  <a 
                    href={`/pdv/envios/${contingencia.envioId}`} 
                    className="text-[#9c7561] hover:text-[#311716] text-sm"
                  >
                    Ver envío →
                  </a>
                </dd>
              </div>
            )}

            {contingencia.conciliacion && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                <dt className="text-sm font-medium text-[#311716] flex items-center">
                  <FileText className="h-4 w-4 mr-2 text-gray-400" />
                  Conciliación relacionada
                </dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">Fecha: {formatDate(contingencia.conciliacion.fecha)}</span>
                  </div>
                  <a 
                    href={`/pdv/conciliaciones/${contingencia.conciliacionId}`} 
                    className="text-[#9c7561] hover:text-[#311716] text-sm"
                  >
                    Ver conciliación →
                  </a>
                </dd>
              </div>
            )}

            {renderMedia() && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-[#311716]">Archivos adjuntos</dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  {renderMedia()}
                </dd>
              </div>
            )}
            
            {contingencia.respuesta && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                <dt className="text-sm font-medium text-[#311716] flex items-center">
                  <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                  Respuesta administrativa
                </dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2 whitespace-pre-line">
                  {contingencia.respuesta}
                </dd>
              </div>
            )}
            
            {contingencia.fechaRespuesta && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                <dt className="text-sm font-medium text-[#311716] flex items-center">
                  <Clock className="h-4 w-4 mr-2 text-green-600" />
                  Fecha de respuesta
                </dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  {formatDate(contingencia.fechaRespuesta)}
                </dd>
              </div>
            )}
            
            {contingencia.estado === 'resuelto' && (
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                <dt className="text-sm font-medium text-[#311716]">Ajuste realizado</dt>
                <dd className="mt-1 text-sm text-[#311716] sm:mt-0 sm:col-span-2">
                  {contingencia.ajusteRealizado ? (
                    <span className="text-green-600 font-medium">Sí</span>
                  ) : (
                    <span className="text-gray-600">No</span>
                  )}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Estado de seguimiento */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-[#311716] mb-4">Estado del Seguimiento</h3>
        <div className="space-y-3">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-500" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-900">Contingencia reportada</p>
              <p className="text-sm text-gray-500">{formatDate(contingencia.fechaCreacion)}</p>
            </div>
          </div>
          
          {contingencia.estado !== 'pendiente' && (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                {contingencia.estado === 'resuelto' ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : contingencia.estado === 'en_revision' ? (
                  <Clock className="h-5 w-5 text-blue-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">
                  {contingencia.estado === 'resuelto' ? 'Contingencia resuelta' :
                   contingencia.estado === 'en_revision' ? 'En revisión por administración' :
                   'Contingencia rechazada'}
                </p>
                <p className="text-sm text-gray-500">{formatDate(contingencia.fechaRespuesta)}</p>
              </div>
            </div>
          )}
          
          {contingencia.estado === 'pendiente' && (
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">Esperando revisión</p>
                <p className="text-sm text-gray-500">Su contingencia está siendo revisada por el equipo administrativo</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}