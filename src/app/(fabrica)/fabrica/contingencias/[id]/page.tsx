// src/app/(fabrica)/fabrica/contingencias/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCTextarea } from '@/components/ui/HighContrastComponents';
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
  Package,
  Truck,
  AlertTriangle
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
  produccionId?: string;
  envioId?: string;
  ubicacionId?: string;
  urgente: boolean;
  ubicacion?: {
    id: string;
    nombre: string;
  };
  produccion?: {
    id: string;
    cantidad: number;
    receta: {
      nombre: string;
    };
  };
  envio?: {
    id: string;
    destino: {
      nombre: string;
    };
  };
  imagenUrl?: string | null;
  videoUrl?: string | null;
  mediaType?: string | null;
  usuario: {
    name: string;
  };
}

export default function DetalleContingenciaFabricaPage({ params }: { params: { id: string } }) {
  const [contingencia, setContingencia] = useState<Contingencia | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [respuesta, setRespuesta] = useState('');
  const [ajusteRealizado, setAjusteRealizado] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const handleAction = async (accion: string) => {
    try {
      setIsSaving(true);
      setError(null);
      
      if ((accion === 'resolver' || accion === 'rechazar') && !respuesta.trim()) {
        setError('Debe proporcionar una respuesta');
        setIsSaving(false);
        return;
      }
      
      const payload: any = { accion };
      
      if (accion === 'resolver' || accion === 'rechazar') {
        payload.respuesta = respuesta;
        if (accion === 'resolver') {
          payload.ajusteRealizado = ajusteRealizado;
        }
      }
      
      const response = await authenticatedFetch(`/api/contingencias/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al procesar la acción');
      }
      
      const updatedContingencia = await response.json();
      setContingencia(updatedContingencia);
      
      alert(`Contingencia ${accion === 'resolver' ? 'resuelta' : accion === 'rechazar' ? 'rechazada' : 'actualizada'} correctamente`);
      
      setRespuesta('');
      setAjusteRealizado(false);
      
      if (accion === 'resolver' || accion === 'rechazar') {
        setTimeout(() => {
          router.push('/fabrica/contingencias');
        }, 1500);
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al procesar la acción');
    } finally {
      setIsSaving(false);
    }
  };

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

  const puedeResolver = user?.roleId === 'role-admin' || user?.roleId === 'role-fabrica';

  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-2 text-purple-600" />
          <p className="text-lg text-black">Cargando contingencia...</p>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error && !contingencia) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
      </ContrastEnhancer>
    );
  }

  if (!contingencia) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-2" />
          <p className="text-lg text-red-500">Contingencia no encontrada</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-purple-600 hover:bg-purple-700"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">Detalle de Contingencia de Fábrica</h1>
              <p className="text-purple-100">Gestión y resolución de incidencias en producción</p>
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

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Información principal */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-purple-50">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-purple-900">
                  {contingencia.titulo}
                  {contingencia.urgente && (
                    <span className="ml-2 px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      URGENTE
                    </span>
                  )}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-purple-600">
                  Creada el {formatDate(contingencia.fechaCreacion)} por {contingencia.usuario.name}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getEstadoBadge(contingencia.estado)}`}>
                  {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                   contingencia.estado === 'en_revision' ? 'En revisión' : 
                   contingencia.estado === 'resuelto' ? 'Resuelto' : 'Rechazado'}
                </span>
                <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800">
                  Fábrica
                </span>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200">
            <dl className="divide-y divide-gray-200">
              <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2 text-gray-400" />
                  Descripción
                </dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2 whitespace-pre-line">
                  {contingencia.descripcion}
                </dd>
              </div>
              
              {contingencia.ubicacion && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    Ubicación específica
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {contingencia.ubicacion.nombre}
                  </dd>
                </div>
              )}

              {contingencia.produccion && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <Package className="h-4 w-4 mr-2 text-gray-400" />
                    Producción relacionada
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">{contingencia.produccion.receta.nombre}</span>
                      <span className="text-gray-500">•</span>
                      <span>{contingencia.produccion.cantidad} unidades</span>
                    </div>
                    <a 
                      href={`/fabrica/produccion/${contingencia.produccionId}`} 
                      className="text-purple-600 hover:text-purple-900 text-sm"
                    >
                      Ver producción →
                    </a>
                  </dd>
                </div>
              )}
              
              {contingencia.envio && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-gray-50">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <Truck className="h-4 w-4 mr-2 text-gray-400" />
                    Envío relacionado
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Destino: {contingencia.envio.destino.nombre}</span>
                    </div>
                    <a 
                      href={`/fabrica/envios/${contingencia.envioId}`} 
                      className="text-purple-600 hover:text-purple-900 text-sm"
                    >
                      Ver envío →
                    </a>
                  </dd>
                </div>
              )}

              {renderMedia() && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Archivos adjuntos</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {renderMedia()}
                  </dd>
                </div>
              )}
              
              {contingencia.respuesta && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                    Respuesta
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2 whitespace-pre-line">
                    {contingencia.respuesta}
                  </dd>
                </div>
              )}
              
              {contingencia.fechaRespuesta && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-green-600" />
                    Fecha de respuesta
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(contingencia.fechaRespuesta)}
                  </dd>
                </div>
              )}
              
              {contingencia.estado === 'resuelto' && (
                <div className="px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 bg-green-50">
                  <dt className="text-sm font-medium text-black">Ajuste realizado</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
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

        {/* Panel de acciones */}
        {puedeResolver && contingencia.estado === 'pendiente' && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-purple-50">
              <h3 className="text-lg leading-6 font-medium text-purple-900">
                Resolver contingencia
              </h3>
              <p className="mt-1 text-sm text-purple-600">
                Proporciona una respuesta y marca si requiere ajuste de inventario
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="space-y-4">
                <div>
                  <HCLabel htmlFor="respuesta" className="block text-sm font-medium mb-1">
                    Respuesta *
                  </HCLabel>
                  <HCTextarea
                    id="respuesta"
                    name="respuesta"
                    rows={4}
                    className="shadow-sm focus:ring-purple-500 focus:border-purple-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    value={respuesta}
                    onChange={(e) => setRespuesta(e.target.value)}
                    placeholder="Describe cómo se resolvió la contingencia o por qué se rechaza..."
                  ></HCTextarea>
                </div>
                
                <div className="flex items-center">
                  <input
                    id="ajusteRealizado"
                    name="ajusteRealizado"
                    type="checkbox"
                    className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
                    checked={ajusteRealizado}
                    onChange={(e) => setAjusteRealizado(e.target.checked)}
                  />
                  <label htmlFor="ajusteRealizado" className="ml-2 block text-sm text-black">
                    Se realizó un ajuste de stock o inventario
                  </label>
                </div>
                
                <div className="flex space-x-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => handleAction('en_revision')}
                    disabled={isSaving}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    {isSaving ? 'Procesando...' : 'Marcar en revisión'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleAction('rechazar')}
                    disabled={isSaving || !respuesta.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    {isSaving ? 'Procesando...' : 'Rechazar'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => handleAction('resolver')}
                    disabled={isSaving || !respuesta.trim()}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    {isSaving ? (
                      <>
                        <span className="animate-spin mr-2">⟳</span>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Resolver
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}