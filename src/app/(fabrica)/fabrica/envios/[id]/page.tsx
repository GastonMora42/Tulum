// src/app/(fabrica)/fabrica/envios/[id]/page.tsx - VERSIÓN CORREGIDA
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft, Clipboard, Check, AlertTriangle, Loader2, Package, CheckCircle, Clock, MapPin, User, Calendar } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Link from 'next/link';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCButton, HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

interface ItemEnvio {
  id: string;
  insumoId?: string | null;
  productoId?: string | null;
  cantidad: number;
  cantidadRecibida: number | null;
  insumo?: {
    id: string;
    nombre: string;
    unidadMedida: string;
  } | null;
  producto?: {
    id: string;
    nombre: string;
  } | null;
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
  observaciones?: string | null;
  usuarioId: string;
  origen: {
    id: string;
    nombre: string;
    tipo: string;
  };
  destino: {
    id: string;
    nombre: string;
    tipo: string;
  };
  usuario: {
    id: string;
    name: string;
    email: string;
  };
  items: ItemEnvio[];
  contingencias?: Array<{
    id: string;
    titulo: string;
    descripcion: string;
    estado: string;
    fechaCreacion: string;
    usuario: {
      name: string;
    };
  }>;
}

interface EnvioDetallePageProps {
  params: Promise<{ id: string }> | { id: string };
}

export default function EnvioDetallePage({ params }: EnvioDetallePageProps) {
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMarkingAsSent, setIsMarkingAsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [envioId, setEnvioId] = useState<string | null>(null);
  const router = useRouter();

  // 🔧 MANEJO MEJORADO DE PARÁMETROS (tanto Promise como objeto directo)
  useEffect(() => {
    const extractId = async () => {
      try {
        if ('then' in params) {
          // Es una Promise
          const resolvedParams = await params;
          setEnvioId(resolvedParams.id);
        } else {
          // Es un objeto directo
          setEnvioId(params.id);
        }
      } catch (error) {
        console.error('Error extrayendo ID de parámetros:', error);
        setError('Error al cargar la página');
      }
    };

    extractId();
  }, [params]);

  // 🔧 CARGAR ENVÍO CUANDO SE TENGA EL ID
  useEffect(() => {
    if (!envioId) return;

    const fetchEnvio = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log(`[EnvioDetalle] Cargando envío con ID: ${envioId}`);
        
        const response = await authenticatedFetch(`/api/envios/${envioId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Envío no encontrado');
          }
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `Error ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // 🔧 VALIDACIÓN Y NORMALIZACIÓN DE DATOS
        const envioNormalizado: Envio = {
          id: data.id || 'unknown',
          origenId: data.origenId || '',
          destinoId: data.destinoId || '',
          fechaCreacion: data.fechaCreacion || new Date().toISOString(),
          fechaEnvio: data.fechaEnvio,
          fechaRecepcion: data.fechaRecepcion,
          estado: data.estado || 'pendiente',
          observaciones: data.observaciones,
          usuarioId: data.usuarioId || '',
          origen: {
            id: data.origen?.id || '',
            nombre: data.origen?.nombre || 'Origen desconocido',
            tipo: data.origen?.tipo || 'desconocido'
          },
          destino: {
            id: data.destino?.id || '',
            nombre: data.destino?.nombre || 'Destino desconocido',
            tipo: data.destino?.tipo || 'desconocido'
          },
          usuario: {
            id: data.usuario?.id || '',
            name: data.usuario?.name || 'Usuario desconocido',
            email: data.usuario?.email || ''
          },
          items: (data.items || []).map((item: any) => ({
            id: item.id || 'unknown',
            insumoId: item.insumoId,
            productoId: item.productoId,
            cantidad: typeof item.cantidad === 'number' ? item.cantidad : 0,
            cantidadRecibida: typeof item.cantidadRecibida === 'number' ? item.cantidadRecibida : null,
            insumo: item.insumo ? {
              id: item.insumo.id || '',
              nombre: item.insumo.nombre || 'Insumo desconocido',
              unidadMedida: item.insumo.unidadMedida || 'und'
            } : null,
            producto: item.producto ? {
              id: item.producto.id || '',
              nombre: item.producto.nombre || 'Producto desconocido'
            } : null
          })),
          contingencias: (data.contingencias || []).map((cont: any) => ({
            id: cont.id || 'unknown',
            titulo: cont.titulo || 'Contingencia sin título',
            descripcion: cont.descripcion || '',
            estado: cont.estado || 'pendiente',
            fechaCreacion: cont.fechaCreacion || new Date().toISOString(),
            usuario: {
              name: cont.usuario?.name || 'Usuario desconocido'
            }
          }))
        };
        
        setEnvio(envioNormalizado);
        console.log(`[EnvioDetalle] Envío cargado exitosamente:`, envioNormalizado);
        
      } catch (err) {
        console.error('[EnvioDetalle] Error al cargar envío:', err);
        const errorMessage = err instanceof Error ? err.message : 'Error desconocido al cargar el envío';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvio();
  }, [envioId]);

  // 🔧 FUNCIÓN MEJORADA PARA MARCAR COMO ENVIADO
  const handleMarkAsSent = async () => {
    if (!envio || !envioId) return;
    
    try {
      setIsMarkingAsSent(true);
      setError(null);
      
      // Confirmación del usuario
      const confirmed = window.confirm(
        `¿Confirma que desea marcar el envío #${envio.id.slice(-6)} como enviado?\n\n` +
        `Destino: ${envio.destino.nombre}\n` +
        `Items: ${envio.items.length} producto(s)/insumo(s)`
      );
      
      if (!confirmed) {
        setIsMarkingAsSent(false);
        return;
      }
      
      console.log(`[EnvioDetalle] Marcando envío ${envioId} como enviado...`);
      
      const response = await authenticatedFetch('/api/envios/marcar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ envioId })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}: No se pudo marcar como enviado`);
      }
      
      const resultado = await response.json();
      
      // Actualizar estado local
      setEnvio(prev => prev ? {
        ...prev,
        estado: 'en_transito',
        fechaEnvio: new Date().toISOString()
      } : null);
      
      setSuccess('Envío marcado como enviado exitosamente');
      
      console.log(`[EnvioDetalle] Envío marcado como enviado:`, resultado);
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => setSuccess(null), 3000);
      
    } catch (err) {
      console.error('[EnvioDetalle] Error al marcar como enviado:', err);
      const errorMessage = err instanceof Error ? err.message : 'Error al marcar como enviado';
      setError(errorMessage);
    } finally {
      setIsMarkingAsSent(false);
    }
  };

  // 🔧 FUNCIONES DE UTILIDAD MEJORADAS
  const getEstadoBadge = (estado: string) => {
    const badges = {
      pendiente: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
      enviado: 'bg-blue-100 text-blue-800 border border-blue-300',
      en_transito: 'bg-indigo-100 text-indigo-800 border border-indigo-300',
      recibido: 'bg-green-100 text-green-800 border border-green-300',
      con_contingencia: 'bg-red-100 text-red-800 border border-red-300',
    };
    return badges[estado as keyof typeof badges] || 'bg-gray-100 text-gray-800 border border-gray-300';
  };

  const getEstadoTexto = (estado: string) => {
    const textos = {
      pendiente: 'Pendiente',
      enviado: 'Enviado',
      en_transito: 'En Tránsito',
      recibido: 'Recibido',
      con_contingencia: 'Con Contingencia',
    };
    return textos[estado as keyof typeof textos] || estado;
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      console.warn('Error formateando fecha:', dateString, e);
      return 'Fecha inválida';
    }
  };

  const getItemName = (item: ItemEnvio) => {
    return item.producto?.nombre || item.insumo?.nombre || 'Item desconocido';
  };

  const getItemUnit = (item: ItemEnvio) => {
    return item.insumo?.unidadMedida || 'und';
  };

  // 🔧 ESTADOS DE CARGA Y ERROR MEJORADOS
  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-500 mx-auto mb-4" />
            <h2 className="text-lg font-medium text-gray-900 mb-2">Cargando Envío</h2>
            <p className="text-gray-600">Obteniendo detalles del envío...</p>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error || !envio) {
    return (
      <ContrastEnhancer>
        <div className="max-w-2xl mx-auto p-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-red-900 mb-2">Error al Cargar Envío</h2>
            <p className="text-red-700 mb-6">{error || 'Envío no encontrado'}</p>
            <div className="flex justify-center space-x-4">
              <HCButton
                onClick={() => router.back()}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Volver
              </HCButton>
              <HCButton
                onClick={() => window.location.reload()}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Recargar Página
              </HCButton>
            </div>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header con información básica */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-black mr-3">
              Envío #{envio.id.slice(-6)}
            </h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(envio.estado)}`}>
              {getEstadoTexto(envio.estado)}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            {envio.estado === 'pendiente' && (
              <HCButton
                onClick={handleMarkAsSent}
                disabled={isMarkingAsSent}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {isMarkingAsSent ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Marcando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Marcar como Enviado
                  </>
                )}
              </HCButton>
            )}
            <HCButton
              onClick={() => router.back()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Volver
            </HCButton>
          </div>
        </div>

        {/* Mensajes de estado */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
            <CheckCircle className="h-5 w-5 mr-2" />
            {success}
          </div>
        )}

        {/* Información del envío */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-500" />
              Información del Envío
            </h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  Origen
                </dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  <span className="font-medium">{envio.origen.nombre}</span>
                  <span className="ml-2 text-gray-500 capitalize">({envio.origen.tipo})</span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black flex items-center">
                  <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                  Destino
                </dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  <span className="font-medium">{envio.destino.nombre}</span>
                  <span className="ml-2 text-gray-500 capitalize">({envio.destino.tipo})</span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black flex items-center">
                  <User className="h-4 w-4 mr-2 text-gray-400" />
                  Creado por
                </dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  {envio.usuario.name}
                  {envio.usuario.email && (
                    <span className="ml-2 text-gray-500">({envio.usuario.email})</span>
                  )}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                  Fecha de creación
                </dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  {formatDate(envio.fechaCreacion)}
                </dd>
              </div>
              {envio.fechaEnvio && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                    Fecha de envío
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaEnvio)}
                  </dd>
                </div>
              )}
              {envio.fechaRecepcion && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black flex items-center">
                    <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                    Fecha de recepción
                  </dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaRecepcion)}
                  </dd>
                </div>
              )}
              {envio.observaciones && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Observaciones</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {envio.observaciones}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Items del envío */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black flex items-center">
              <Clipboard className="h-5 w-5 mr-2 text-gray-500" />
              Items del Envío ({envio.items.length})
            </h3>
          </div>
          <div className="border-t border-gray-200">
            {envio.items.length > 0 ? (
              <HCTable>
                <thead>
                  <tr>
                    <HCTh>Producto/Insumo</HCTh>
                    <HCTh>Tipo</HCTh>
                    <HCTh>Cantidad Enviada</HCTh>
                    <HCTh>Cantidad Recibida</HCTh>
                    <HCTh>Estado</HCTh>
                  </tr>
                </thead>
                <tbody>
                  {envio.items.map((item, index) => {
                    const hayDiferencia = item.cantidadRecibida !== null && item.cantidadRecibida !== item.cantidad;
                    
                    return (
                      <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <HCTd>
                          <div className="font-medium text-gray-900">
                            {getItemName(item)}
                          </div>
                          {item.insumo && (
                            <div className="text-sm text-gray-500">
                              Unidad: {item.insumo.unidadMedida}
                            </div>
                          )}
                        </HCTd>
                        <HCTd>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            item.producto ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {item.producto ? 'Producto' : 'Insumo'}
                          </span>
                        </HCTd>
                        <HCTd>
                          <span className="font-medium">
                            {item.cantidad} {getItemUnit(item)}
                          </span>
                        </HCTd>
                        <HCTd>
                          {item.cantidadRecibida !== null ? (
                            <span className={`font-medium ${hayDiferencia ? 'text-red-600' : 'text-green-600'}`}>
                              {item.cantidadRecibida} {getItemUnit(item)}
                            </span>
                          ) : (
                            <span className="text-gray-400 flex items-center">
                              <Clock className="h-4 w-4 mr-1" />
                              Pendiente
                            </span>
                          )}
                        </HCTd>
                        <HCTd>
                          {item.cantidadRecibida !== null ? (
                            hayDiferencia ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                <AlertTriangle className="h-3 w-3 mr-1" />
                                Diferencia
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Correcto
                              </span>
                            )
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              <Clock className="h-3 w-3 mr-1" />
                              No recibido
                            </span>
                          )}
                        </HCTd>
                      </tr>
                    );
                  })}
                </tbody>
              </HCTable>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No hay items en este envío</p>
              </div>
            )}
          </div>
        </div>

        {/* Contingencias (si existen) */}
        {envio.contingencias && envio.contingencias.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-red-50">
              <h3 className="text-lg leading-6 font-medium text-red-900 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Contingencias ({envio.contingencias.length})
              </h3>
            </div>
            <div className="border-t border-red-200">
              <div className="divide-y divide-gray-200">
                {envio.contingencias.map((contingencia) => (
                  <div key={contingencia.id} className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-sm font-medium text-gray-900 mb-1">
                          {contingencia.titulo}
                        </h4>
                        <p className="text-sm text-gray-600 mb-2">
                          {contingencia.descripcion}
                        </p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span>Por: {contingencia.usuario.name}</span>
                          <span>{formatDate(contingencia.fechaCreacion)}</span>
                        </div>
                      </div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        contingencia.estado === 'pendiente' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : contingencia.estado === 'resuelto'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {contingencia.estado}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Acciones adicionales */}
        <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse rounded-lg">
          <div className="flex space-x-3">
            <Link
              href="/fabrica/envios"
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
            >
              Ver Todos los Envíos
            </Link>
            {envio.estado === 'enviado' || envio.estado === 'en_transito' ? (
              <Link
                href={`/fabrica/envios/${envio.id}/recibir`}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Recepcionar Envío
              </Link>
            ) : null}
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}