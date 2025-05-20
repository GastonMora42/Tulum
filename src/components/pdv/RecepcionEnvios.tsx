// src/components/pdv/RecepcionEnvios.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, X, AlertTriangle, Package, Truck, ArrowRight } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';

interface Envio {
  fechaCreacion: string;
  id: string;
  origen: { nombre: string };
  destino: { nombre: string };
  fechaEnvio?: string; // Opcional para manejar casos donde no existe
  estado: string;
  items: EnvioItem[];
}

interface EnvioItem {
  id: string;
  cantidad: number;
  cantidadRecibida?: number;
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

interface RecepcionEnviosProps {
  onSuccess?: () => void;
}

export function RecepcionEnvios({ onSuccess }: RecepcionEnviosProps) {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isStepTwo, setIsStepTwo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { isOnline, registrarRecepcionEnvioOffline } = useOffline();
  
  // Cargar envíos pendientes
  useEffect(() => {
    const loadEnvios = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha definido una sucursal');
        }
        
        console.log(`Cargando envíos para sucursal: ${sucursalId}`);
        
        // Obtener envíos pendientes de recepción - Estado ampliado para capturar más casos
        const response = await authenticatedFetch(`/api/envios?destinoId=${sucursalId}&estado=pendiente,enviado,en_transito`);
        
        if (!response.ok) {
          throw new Error('Error al cargar envíos pendientes');
        }
        
        const data = await response.json();
        console.log(`Envíos recibidos: ${data.length}`, data);
        
        setEnvios(data);
        
        if (data.length === 0) {
          console.log('No se encontraron envíos pendientes para esta sucursal');
        }
      } catch (err) {
        console.error('Error al cargar envíos:', err);
        setError('No se pudieron cargar los envíos pendientes');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEnvios();
  }, []);
  
  // Inicializar cantidades recibidas cuando se selecciona un envío
  useEffect(() => {
    if (selectedEnvio) {
      const initialCantidades: Record<string, number> = {};
      selectedEnvio.items.forEach(item => {
        initialCantidades[item.id] = item.cantidad;
      });
      setCantidadesRecibidas(initialCantidades);
    }
  }, [selectedEnvio]);
  
  // Seleccionar un envío
  const handleSelectEnvio = (envio: Envio) => {
    setSelectedEnvio(envio);
    setIsStepTwo(false);
    setObservaciones('');
    setError(null);
    setSuccessMessage(null);
  };
  
  // Actualizar cantidad recibida
  const handleCantidadChange = (itemId: string, value: string) => {
    const cantidad = parseInt(value);
    if (!isNaN(cantidad) && cantidad >= 0) {
      setCantidadesRecibidas(prev => ({
        ...prev,
        [itemId]: cantidad
      }));
    }
  };
  
  // Continuar al paso 2
  const handleContinue = () => {
    setIsStepTwo(true);
  };
  
  // Verificar si hay diferencias
  const hasDifferences = () => {
    if (!selectedEnvio) return false;
    
    return selectedEnvio.items.some(item => 
      cantidadesRecibidas[item.id] !== item.cantidad
    );
  };
  
  // Recibir envío
  const handleRecibirEnvio = async () => {
    if (!selectedEnvio) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      const items = selectedEnvio.items.map(item => ({
        itemEnvioId: item.id,
        cantidadRecibida: cantidadesRecibidas[item.id]
      }));
      
      if (isOnline) {
        // Procesar online
        const response = await authenticatedFetch(`/api/fabrica/envios/${selectedEnvio.id}/recibir`, {
          method: 'POST',
          body: JSON.stringify({
            items,
            observaciones
          })
        });
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al recibir envío');
        }
        
        const result = await response.json();
        
        // Si hay diferencias, se creará una contingencia automáticamente
        setSuccessMessage(
          hasDifferences()
            ? 'Envío recibido. Se ha creado una contingencia por las diferencias encontradas.'
            : 'Envío recibido correctamente.'
        );
      } else {
        // Procesar offline
        await registrarRecepcionEnvioOffline(
          selectedEnvio.id,
          items.map(item => {
            const envioItem = selectedEnvio.items.find(i => i.id === item.itemEnvioId);
            return {
              productoId: envioItem?.producto?.id || '',
              cantidadRecibida: item.cantidadRecibida
            };
          }).filter(item => item.productoId)
        );
        
        setSuccessMessage('Envío recibido en modo offline. Se sincronizará cuando haya conexión.');
      }
      
      // Actualizar lista de envíos
      setEnvios(prevEnvios => prevEnvios.filter(e => e.id !== selectedEnvio.id));
      setSelectedEnvio(null);
      setIsStepTwo(false);
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al recibir envío');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Función para marcar como enviado
  const handleMarcarEnviado = async (envioId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/envios/marcar`, {
        method: 'POST',
        body: JSON.stringify({ envioId })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al marcar envío como enviado');
      }
      
      const responseData = await response.json();
      
      // Actualizar la lista de envíos usando los datos del servidor si es posible
      if (responseData && responseData.envio) {
        setEnvios(prevEnvios => prevEnvios.map(e => 
          e.id === envioId ? responseData.envio : e
        ));
      } else {
        // Fallback a actualización manual si no hay datos del servidor
        setEnvios(prevEnvios => prevEnvios.map(e => 
          e.id === envioId ? { 
            ...e,  // Mantener todas las propiedades originales
            estado: 'enviado' 
          } : e
        ));
      }
      
      setSuccessMessage('Envío marcado como enviado correctamente');
      
      // Recargar completamente los envíos después para asegurar datos frescos
      setTimeout(() => {
        if (onSuccess) onSuccess();
      }, 1500);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al marcar envío');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Cancelar recepción
  const handleCancel = () => {
    setSelectedEnvio(null);
    setIsStepTwo(false);
    setObservaciones('');
    setError(null);
    setSuccessMessage(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-10 w-10 border-4 border-[#9c7561] border-t-transparent rounded-full"></div>
        <span className="ml-3 text-lg text-gray-700">Cargando envíos...</span>
      </div>
    );
  }

  if (envios.length === 0 && !selectedEnvio) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay envíos pendientes</h3>
        <p className="text-gray-600 mb-4">No tienes envíos pendientes de recepción en este momento</p>
        <div className="p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700 text-sm">
          <p>Recuerda que los envíos deben ser <strong>marcados como enviados</strong> desde la fábrica para aparecer aquí.</p>
          <p className="mt-2">Contacta con el administrador si crees que debería haber envíos pendientes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm">
      {/* Mensajes de éxito/error */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 mb-4">
          <div className="flex">
            <Check className="h-5 w-5 mr-2" />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      {/* Paso 1: Seleccionar envío */}
      {!selectedEnvio && (
        <div>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <h2 className="text-lg font-medium text-gray-900">Envíos Pendientes de Recepción</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {envios.map(envio => (
              <div key={envio.id} className="p-4 hover:bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-md font-medium text-gray-900">
                      Envío #{envio.id.substring(0, 8)}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Desde: {envio.origen.nombre}
                    </p>
                  </div>
                  <div className="text-sm text-right">
                    <p className="font-medium text-gray-900">
                      {format(new Date(envio.fechaEnvio || envio.fechaCreacion), 'dd/MM/yyyy')}
                    </p>
                    <span className={`inline-flex px-2 py-1 text-xs rounded-full ${
                      envio.estado === 'enviado' ? 'bg-green-100 text-green-800' : 
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {envio.estado === 'enviado' ? 'Listo para recibir' : 'Pendiente de envío'}
                    </span>
                  </div>
                </div>
                
                <div className="text-sm text-gray-700 mb-3">
                  <span className="font-medium">{envio.items?.length || 0}</span> productos/insumos
                </div>
                
                {/* Botones de acción según estado */}
                <div className="flex justify-end gap-2">
                  {envio.estado === 'enviado' ? (
                    <button 
                      onClick={() => handleSelectEnvio(envio)}
                      className="px-3 py-1 bg-[#311716] text-white rounded hover:bg-[#462625] text-sm"
                    >
                      Recibir envío
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleMarcarEnviado(envio.id)}
                      className="px-3 py-1 bg-amber-600 text-white rounded hover:bg-amber-700 text-sm"
                    >
                      Marcar como enviado
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Paso 2: Verificar cantidades */}
      {selectedEnvio && !isStepTwo && (
        <div>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Verificación de Envío #{selectedEnvio.id.substring(0, 8)}
            </h2>
            <button
              onClick={handleCancel}
              className="text-gray-600 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          
          <div className="p-6">
            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Origen:</span>
                <span className="font-medium">{selectedEnvio.origen.nombre}</span>
              </div>
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Destino:</span>
                <span className="font-medium">{selectedEnvio.destino.nombre}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Fecha de envío:</span>
                <span className="font-medium">
                  {format(new Date(selectedEnvio.fechaEnvio || selectedEnvio.fechaCreacion), 'dd/MM/yyyy HH:mm')}
                </span>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Verifica las cantidades recibidas:
              </h3>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto/Insumo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad Enviada
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cantidad Recibida
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedEnvio.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.producto ? item.producto.nombre : item.insumo?.nombre || 'Producto/Insumo'}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                          {item.cantidad} {item.insumo?.unidadMedida || ''}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          <input
                            type="number"
                            min="0"
                            value={cantidadesRecibidas[item.id] || 0}
                            onChange={e => handleCantidadChange(item.id, e.target.value)}
                            className="w-24 border border-gray-300 rounded-md p-2 text-center"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={handleCancel}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              
              <button
                onClick={handleContinue}
                className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625]"
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Paso 3: Confirmar y enviar */}
      {selectedEnvio && isStepTwo && (
        <div>
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
            <h2 className="text-lg font-medium text-gray-900">
              Confirmar Recepción
            </h2>
            <button
              onClick={() => setIsStepTwo(false)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowRight className="h-5 w-5 transform rotate-180" />
            </button>
          </div>
          
          <div className="p-6">
            {hasDifferences() && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 mb-6">
                <div className="flex">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  <div>
                    <p className="font-medium">Atención: Hay diferencias en las cantidades</p>
                    <p className="text-sm">
                      Se creará una contingencia automáticamente para resolver estas diferencias.
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <h3 className="text-md font-medium text-gray-900 mb-3">
                Resumen de la recepción:
              </h3>
              
              <div className="overflow-x-auto mb-4">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Producto/Insumo
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Enviado
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Recibido
                      </th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Diferencia
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedEnvio.items.map(item => {
                      const recibido = cantidadesRecibidas[item.id] || 0;
                      const diferencia = recibido - item.cantidad;
                      
                      return (
                        <tr key={item.id}>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                            {item.producto ? item.producto.nombre : item.insumo?.nombre || 'Producto/Insumo'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500 text-center">
                            {item.cantidad}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 text-center font-medium">
                            {recibido}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                            <span className={`
                              ${diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-600'}
                              font-medium
                            `}>
                              {diferencia > 0 ? '+' : ''}{diferencia}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              <div className="mb-4">
                <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones:
                </label>
                <textarea
                  id="observaciones"
                  rows={3}
                  value={observaciones}
                  onChange={e => setObservaciones(e.target.value)}
                  className="w-full border border-gray-300 rounded-md p-2"
                  placeholder="Ingrese cualquier observación sobre la recepción..."
                ></textarea>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                onClick={() => setIsStepTwo(false)}
                className="mr-3 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Atrás
              </button>
              
              
              <button
                onClick={handleRecibirEnvio}
                disabled={isSaving}
                className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625] disabled:opacity-50"
              >
                {isSaving ? 'Procesando...' : 'Confirmar Recepción'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}