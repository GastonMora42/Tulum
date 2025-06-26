// src/components/pdv/RecepcionEnvios.tsx - VERSIÓN MEJORADA SIN MARCAR COMO ENVIADO
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Package, CheckCircle, AlertTriangle, Clock, Truck, 
  Calendar, User, FileText, ChevronRight, RefreshCw,
  MapPin, Hash, Weight, AlertCircle
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface ItemEnvio {
  id: string;
  productoId: string | null;
  insumoId: string | null;
  cantidad: number;
  cantidadRecibida: number | null;
  producto?: {
    id: string;
    nombre: string;
  };
  insumo?: {
    id: string;
    nombre: string;
    unidadMedida: string;
  };
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
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
}

interface RecepcionEnviosProps {
  onSuccess?: () => void;
}

export function RecepcionEnvios({ onSuccess }: RecepcionEnviosProps) {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isReceiving, setIsReceiving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Estados para el modal de recepción
  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState('');

  const fetchEnvios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // 🔧 OBTENER ENVÍOS PENDIENTES DE RECEPCIÓN
      const response = await authenticatedFetch(
        `/api/envios?destinoId=${encodeURIComponent(sucursalId)}&estado=enviado,en_transito`
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar envíos pendientes');
      }
      
      const data = await response.json();
      setEnvios(data);
    } catch (err) {
      console.error('Error al cargar envíos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar envíos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvios();
  }, []);

  const handleOpenReceiveModal = (envio: Envio) => {
    setSelectedEnvio(envio);
    setShowReceiveModal(true);
    
    // Inicializar cantidades recibidas con las cantidades enviadas por defecto
    const cantidadesIniciales: Record<string, number> = {};
    envio.items.forEach(item => {
      cantidadesIniciales[item.id] = item.cantidad;
    });
    setCantidadesRecibidas(cantidadesIniciales);
    setObservaciones('');
  };

  const handleCloseReceiveModal = () => {
    setSelectedEnvio(null);
    setShowReceiveModal(false);
    setCantidadesRecibidas({});
    setObservaciones('');
  };

  const handleCantidadChange = (itemId: string, cantidad: number) => {
    setCantidadesRecibidas(prev => ({
      ...prev,
      [itemId]: cantidad
    }));
  };

  const handleReceiveEnvio = async () => {
    if (!selectedEnvio) return;
    
    try {
      setIsReceiving(selectedEnvio.id);
      setError(null);
      
      // Preparar datos para el envío
      const items = selectedEnvio.items.map(item => ({
        itemEnvioId: item.id,
        cantidadRecibida: cantidadesRecibidas[item.id] || 0
      }));
      
      // Verificar si hay diferencias
      const hayDiferencias = selectedEnvio.items.some(item => {
        const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
        return cantidadRecibida !== item.cantidad;
      });
      
      if (hayDiferencias) {
        const confirmar = window.confirm(
          'Se detectaron diferencias entre las cantidades enviadas y recibidas. ' +
          'Se generará una contingencia automáticamente. ¿Desea continuar?'
        );
        
        if (!confirmar) {
          setIsReceiving(null);
          return;
        }
      }
      
      const response = await authenticatedFetch(`/api/fabrica/envios/${selectedEnvio.id}/recibir`, {
        method: 'POST',
        body: JSON.stringify({
          items,
          observaciones
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al recibir envío');
      }
      
      const resultado = await response.json();
      
      setSuccess(
        hayDiferencias 
          ? 'Envío recibido con diferencias. Se ha generado una contingencia para revisión.'
          : 'Envío recibido correctamente. El stock ha sido actualizado.'
      );
      
      // Cerrar modal y refrescar lista
      handleCloseReceiveModal();
      fetchEnvios();
      
      if (onSuccess) onSuccess();
      
      // Limpiar mensaje de éxito después de 5 segundos
      setTimeout(() => setSuccess(null), 5000);
      
    } catch (err) {
      console.error('Error al recibir envío:', err);
      setError(err instanceof Error ? err.message : 'Error al recibir envío');
    } finally {
      setIsReceiving(null);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'enviado':
        return 'bg-blue-100 text-blue-800 border border-blue-300';
      case 'en_transito':
        return 'bg-indigo-100 text-indigo-800 border border-indigo-300';
      default:
        return 'bg-gray-100 text-gray-800 border border-gray-300';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'No disponible';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  const getItemName = (item: ItemEnvio) => {
    return item.producto?.nombre || item.insumo?.nombre || 'Producto desconocido';
  };

  const getItemUnit = (item: ItemEnvio) => {
    return item.insumo?.unidadMedida || 'und';
  };

  // Verificar si hay diferencias en el modal
  const hasDifferences = selectedEnvio ? selectedEnvio.items.some(item => {
    const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
    return cantidadRecibida !== item.cantidad;
  }) : false;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando envíos pendientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
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

      {/* Lista de envíos */}
      {envios.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay envíos pendientes</h3>
          <p className="text-gray-500">Todos los envíos han sido recepcionados.</p>
          <button
            onClick={fetchEnvios}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <RefreshCw className="mr-2 h-4 w-4" />
            Actualizar
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {envios.map(envio => (
            <div key={envio.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <div className="flex items-center">
                      <Hash className="h-4 w-4 text-gray-400 mr-1" />
                      <span className="text-sm font-mono text-gray-600">#{envio.id.slice(-6)}</span>
                    </div>
                    
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getEstadoBadge(envio.estado)}`}>
                      {envio.estado === 'enviado' ? 'Enviado' : 'En Tránsito'}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="font-medium text-gray-900">Desde: {envio.origen.nombre}</div>
                        <div className="text-gray-500 capitalize">{envio.origen.tipo}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="font-medium text-gray-900">Fecha de envío:</div>
                        <div className="text-gray-500">{formatDate(envio.fechaEnvio)}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Package className="h-4 w-4 text-gray-400 mr-2" />
                      <div>
                        <div className="font-medium text-gray-900">{envio.items.length} producto{envio.items.length !== 1 ? 's' : ''}</div>
                        <div className="text-gray-500">
                          {envio.items.slice(0, 2).map(item => getItemName(item)).join(', ')}
                          {envio.items.length > 2 && ' y más...'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="ml-4 flex-shrink-0">
                  <button
                    onClick={() => handleOpenReceiveModal(envio)}
                    disabled={isReceiving === envio.id}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isReceiving === envio.id ? (
                      <>
                        <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Recepcionar
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Recepción */}
      {showReceiveModal && selectedEnvio && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Recepcionar Envío #{selectedEnvio.id.slice(-6)}
                </h3>
                <button
                  onClick={handleCloseReceiveModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <span className="sr-only">Cerrar</span>
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Información del envío */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Origen:</span>
                    <span className="ml-2 text-gray-900">{selectedEnvio.origen.nombre}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fecha de envío:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedEnvio.fechaEnvio)}</span>
                  </div>
                </div>
              </div>
              
              {/* Lista de productos/insumos - VERSIÓN MEJORADA */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Conteo Físico de Productos:</h4>
                  <div className="text-sm text-gray-500">
                    {selectedEnvio.items.length} producto{selectedEnvio.items.length !== 1 ? 's' : ''} para verificar
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <Package className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Instrucciones:</p>
                      <p>Ingrese la cantidad exacta que está recibiendo físicamente. El sistema comparará automáticamente con lo enviado y detectará cualquier diferencia.</p>
                    </div>
                  </div>
                </div>
                
                {selectedEnvio.items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 text-lg">{getItemName(item)}</h5>
                            <p className="text-sm text-gray-500">Unidad: {getItemUnit(item)}</p>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Cantidad física recibida:
                          </label>
                          <div className="flex items-center">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cantidadesRecibidas[item.id] || ''}
                              onChange={(e) => handleCantidadChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 text-center text-lg font-semibold border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="0"
                              autoFocus={index === 0}
                            />
                            <span className="ml-2 text-sm text-gray-500 font-medium">{getItemUnit(item)}</span>
                          </div>
                        </div>
                        
                        {/* Estado visual */}
                        <div className="w-24 text-center">
                          {cantidadesRecibidas[item.id] === undefined || cantidadesRecibidas[item.id] === null ? (
                            <div className="flex flex-col items-center text-gray-400">
                              <Clock className="h-6 w-6 mb-1" />
                              <span className="text-xs">Pendiente</span>
                            </div>
                          ) : cantidadesRecibidas[item.id] === item.cantidad ? (
                            <div className="flex flex-col items-center text-green-600">
                              <CheckCircle className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Correcto</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center text-orange-600">
                              <AlertCircle className="h-6 w-6 mb-1" />
                              <span className="text-xs font-medium">Diferencia</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Observaciones */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional):
                </label>
                <textarea
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Cualquier observación sobre la recepción..."
                />
              </div>
              
              {/* Alerta de diferencias */}
              {hasDifferences && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-orange-400" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-orange-800">
                        Diferencias detectadas
                      </h3>
                      <p className="mt-1 text-sm text-orange-700">
                        Se ha detectado diferencias entre las cantidades enviadas y recibidas. 
                        Se generará automáticamente una contingencia para su revisión administrativa.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Botones */}
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleCloseReceiveModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleReceiveEnvio}
                  disabled={isReceiving !== null}
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                >
                  {isReceiving ? 'Procesando...' : 'Confirmar Recepción'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}