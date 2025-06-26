// src/components/pdv/RecepcionEnvios.tsx - VERSIÓN CORREGIDA Y MEJORADA
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  Package, CheckCircle, AlertTriangle, Clock, Truck, 
  Calendar, User, FileText, ChevronRight, RefreshCw,
  MapPin, Hash, Weight, AlertCircle, Shield, UserCheck,
  Plus, Minus, Eye, Save
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
    codigoBarras?: string;
    categoria?: {
      nombre: string;
    };
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
  metadata?: {
    puedeRecibir: boolean;
    estadosValidosParaRecepcion: string[];
    consultadoPor: {
      rol: string;
      nombre: string;
      restriccionSucursal: string | null;
    };
  };
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
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userSucursal, setUserSucursal] = useState<string | null>(null);
  
  // Estados para el modal de recepción
  const [selectedEnvio, setSelectedEnvio] = useState<Envio | null>(null);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [cantidadesRecibidas, setCantidadesRecibidas] = useState<Record<string, number>>({});
  const [observaciones, setObservaciones] = useState('');

  const fetchUserInfo = async () => {
    try {
      const response = await authenticatedFetch('/api/auth/me');
      if (response.ok) {
        const userData = await response.json();
        setUserRole(userData.user.roleId);
        setUserSucursal(userData.user.sucursalId);
        console.log(`[RecepcionEnvios] Usuario: ${userData.user.email} (${userData.user.roleId}), Sucursal: ${userData.user.sucursalId}`);
      }
    } catch (error) {
      console.error('Error al obtener información del usuario:', error);
      setError('Error al obtener información del usuario');
    }
  };

  const fetchEnvios = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log(`[RecepcionEnvios] Cargando envíos para usuario ${userRole} en sucursal ${userSucursal}`);
      
      // 🔧 CONSTRUCCIÓN DE QUERY MEJORADA
      let queryParams = '?estado=enviado,en_transito&limit=20';
      
      // 🆕 LÓGICA DIFERENCIADA POR ROL - SIMPLIFICADA
      if (userRole === 'role-vendedor') {
        // Para vendedores, el backend ya filtra automáticamente por su sucursal
        console.log('[RecepcionEnvios] Vendedor: El backend filtrará automáticamente por sucursal');
      } else if (userRole === 'role-admin') {
        // Para administradores, ver todos los envíos pendientes de recepción
        console.log('[RecepcionEnvios] Admin: Cargando todos los envíos pendientes');
      }
      
      console.log(`[RecepcionEnvios] Query final: /api/envios${queryParams}`);
      
      const response = await authenticatedFetch(`/api/envios${queryParams}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar envíos pendientes');
      }
      
      const data = await response.json();
      console.log(`[RecepcionEnvios] Recibidos ${data.length} envíos:`, data.map((e: Envio) => `${e.id.slice(-6)}: ${e.origen.nombre} → ${e.destino.nombre} (${e.estado})`));
      
      // 🔧 FILTRAR ENVÍOS QUE PUEDEN SER RECIBIDOS
      const enviosRecibibles = data.filter((envio: Envio) => {
        const puedeRecibir = envio.metadata?.puedeRecibir ?? ['enviado', 'en_transito'].includes(envio.estado);
        console.log(`[RecepcionEnvios] Envío ${envio.id.slice(-6)}: puede recibir = ${puedeRecibir}`);
        return puedeRecibir;
      });
      
      console.log(`[RecepcionEnvios] ${enviosRecibibles.length} envíos pueden ser recibidos`);
      setEnvios(enviosRecibibles);
      
    } catch (err) {
      console.error('Error al cargar envíos:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar envíos');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();
  }, []);

  useEffect(() => {
    if (userRole) {
      fetchEnvios();
    }
  }, [userRole, userSucursal]);

  const handleOpenReceiveModal = async (envio: Envio) => {
    try {
      console.log(`[RecepcionEnvios] Abriendo modal para envío ${envio.id}`);
      
      // 🆕 OBTENER DETALLES COMPLETOS DEL ENVÍO ANTES DE ABRIR MODAL
      const response = await authenticatedFetch(`/api/pdv/envios/${envio.id}/recibir`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar detalles del envío');
      }
      
      const envioDetallado = await response.json();
      console.log(`[RecepcionEnvios] Detalles del envío obtenidos:`, envioDetallado);
      
      setSelectedEnvio(envioDetallado);
      setShowReceiveModal(true);
      
      // 🔧 INICIALIZAR CANTIDADES RECIBIDAS CON LAS CANTIDADES ENVIADAS POR DEFECTO
      const cantidadesIniciales: Record<string, number> = {};
      envioDetallado.items.forEach((item: ItemEnvio) => {
        cantidadesIniciales[item.id] = item.cantidad; // Por defecto, asumimos que se recibe todo
      });
      setCantidadesRecibidas(cantidadesIniciales);
      setObservaciones('');
      
      console.log(`[RecepcionEnvios] Cantidades iniciales:`, cantidadesIniciales);
      
    } catch (err) {
      console.error('Error al cargar detalles del envío:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar detalles del envío');
    }
  };

  const handleCloseReceiveModal = () => {
    setSelectedEnvio(null);
    setShowReceiveModal(false);
    setCantidadesRecibidas({});
    setObservaciones('');
  };

  const handleCantidadChange = (itemId: string, cantidad: number) => {
    console.log(`[RecepcionEnvios] Actualizando cantidad para item ${itemId}: ${cantidad}`);
    setCantidadesRecibidas(prev => ({
      ...prev,
      [itemId]: Math.max(0, cantidad) // No permitir cantidades negativas
    }));
  };

  const handleReceiveEnvio = async () => {
    if (!selectedEnvio) return;
    
    try {
      setIsReceiving(selectedEnvio.id);
      setError(null);
      
      console.log(`[RecepcionEnvios] Iniciando recepción del envío ${selectedEnvio.id}`);
      
      // 🔧 PREPARAR DATOS PARA EL ENVÍO
      const items = selectedEnvio.items.map(item => ({
        itemEnvioId: item.id,
        cantidadRecibida: cantidadesRecibidas[item.id] || 0
      }));
      
      console.log(`[RecepcionEnvios] Items a enviar:`, items);
      
      // 🔧 VERIFICAR SI HAY DIFERENCIAS
      const hayDiferencias = selectedEnvio.items.some(item => {
        const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
        return cantidadRecibida !== item.cantidad;
      });
      
      console.log(`[RecepcionEnvios] Hay diferencias: ${hayDiferencias}`);
      
      // 🔧 CONFIRMAR SI HAY DIFERENCIAS SIGNIFICATIVAS
      if (hayDiferencias) {
        const diferenciasDetalle = selectedEnvio.items
          .filter(item => {
            const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
            return cantidadRecibida !== item.cantidad;
          })
          .map(item => {
            const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
            const diferencia = cantidadRecibida - item.cantidad;
            return `${getItemName(item)}: Enviado ${item.cantidad}, Recibido ${cantidadRecibida} (${diferencia > 0 ? '+' : ''}${diferencia})`;
          });
        
        const confirmar = window.confirm(
          `Se detectaron diferencias entre las cantidades enviadas y recibidas:\n\n${diferenciasDetalle.join('\n')}\n\nSe generará una contingencia automáticamente para revisión administrativa. ¿Desea continuar?`
        );
        
        if (!confirmar) {
          setIsReceiving(null);
          return;
        }
      }
      
      // 🔧 ENVIAR SOLICITUD DE RECEPCIÓN
      const requestBody = {
        items,
        observaciones: observaciones.trim() || undefined
      };
      
      console.log(`[RecepcionEnvios] Enviando solicitud:`, requestBody);
      
      const response = await authenticatedFetch(`/api/pdv/envios/${selectedEnvio.id}/recibir`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('[RecepcionEnvios] Error del servidor:', errorData);
        throw new Error(errorData.error || 'Error al recibir envío');
      }
      
      const resultado = await response.json();
      console.log(`[RecepcionEnvios] Resultado de recepción:`, resultado);
      
      // 🆕 MENSAJE DIFERENCIADO SEGÚN EL RESULTADO
      const baseMessage = resultado.hayDiferencias 
        ? '✅ Envío recibido con diferencias. Se ha generado una contingencia para revisión administrativa.'
        : '✅ Envío recibido correctamente. El stock ha sido actualizado.';
      
      const roleMensaje = userRole === 'role-admin' ? ' (Administrador)' : ' (Vendedor)';
      
      setSuccess(`${baseMessage}${roleMensaje}`);
      
      // 🔧 MOSTRAR RESUMEN SI ESTÁ DISPONIBLE
      if (resultado.resumen) {
        console.log(`[RecepcionEnvios] Resumen de recepción:`, resultado.resumen);
      }
      
      // Cerrar modal y refrescar lista
      handleCloseReceiveModal();
      await fetchEnvios();
      
      if (onSuccess) onSuccess();
      
      // Limpiar mensaje de éxito después de 8 segundos
      setTimeout(() => setSuccess(null), 8000);
      
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

  const getItemCode = (item: ItemEnvio) => {
    return item.producto?.codigoBarras || 'Sin código';
  };

  // Verificar si hay diferencias en el modal
  const hasDifferences = selectedEnvio ? selectedEnvio.items.some(item => {
    const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
    return cantidadRecibida !== item.cantidad;
  }) : false;

  // 🆕 COMPONENTE INDICADOR DE ROL
  const RoleIndicator = () => {
    if (!userRole) return null;
    
    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
        userRole === 'role-admin' 
          ? 'bg-purple-100 text-purple-800 border border-purple-300'
          : 'bg-green-100 text-green-800 border border-green-300'
      }`}>
        {userRole === 'role-admin' ? (
          <>
            <Shield className="h-4 w-4 mr-1" />
            Administrador
          </>
        ) : (
          <>
            <UserCheck className="h-4 w-4 mr-1" />
            Vendedor
          </>
        )}
      </div>
    );
  };

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
      {/* Header con indicador de rol */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <h2 className="text-lg font-semibold text-gray-900">Recepción de Envíos</h2>
          <RoleIndicator />
        </div>
        
        <button
          onClick={fetchEnvios}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {userRole === 'role-admin' && (
        <div className="text-sm text-gray-600 bg-purple-50 px-3 py-2 rounded-md border border-purple-200">
          💡 Como administrador, puede recibir envíos dirigidos a cualquier sucursal
        </div>
      )}

      {/* Mensajes de estado */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Lista de envíos */}
      {envios.length === 0 ? (
        <div className="text-center py-8">
          <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay envíos pendientes</h3>
          <p className="text-gray-500">
            {userRole === 'role-admin' 
              ? 'No hay envíos pendientes de recepción en ninguna sucursal.'
              : 'No hay envíos pendientes para su sucursal.'
            }
          </p>
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

                    {/* 🆕 INDICADOR ESPECIAL PARA ADMINS */}
                    {userRole === 'role-admin' && (
                      <span className="px-2 py-1 text-xs font-medium rounded-full bg-purple-100 text-purple-800 border border-purple-300">
                        Admin Access
                      </span>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Desde: {envio.origen.nombre}</div>
                        <div className="text-gray-500 capitalize">{envio.origen.tipo}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-blue-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Hacia: {envio.destino.nombre}</div>
                        <div className="text-gray-500 capitalize">{envio.destino.tipo}</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                      <div>
                        <div className="font-medium text-gray-900">Fecha de envío:</div>
                        <div className="text-gray-500">{formatDate(envio.fechaEnvio)}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex items-center">
                    <Package className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                    <div className="text-sm">
                      <span className="font-medium text-gray-900">{envio.items.length} ítem{envio.items.length !== 1 ? 's' : ''}: </span>
                      <span className="text-gray-500">
                        {envio.items.slice(0, 2).map(item => getItemName(item)).join(', ')}
                        {envio.items.length > 2 && ` y ${envio.items.length - 2} más...`}
                      </span>
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

      {/* 🔧 MODAL DE RECEPCIÓN MEJORADO */}
      {showReceiveModal && selectedEnvio && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white max-h-[80vh] overflow-y-auto">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <h3 className="text-lg font-medium text-gray-900">
                    Recepcionar Envío #{selectedEnvio.id.slice(-6)}
                  </h3>
                  <RoleIndicator />
                </div>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Origen:</span>
                    <span className="ml-2 text-gray-900">{selectedEnvio.origen.nombre}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Destino:</span>
                    <span className="ml-2 text-gray-900">{selectedEnvio.destino.nombre}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Fecha de envío:</span>
                    <span className="ml-2 text-gray-900">{formatDate(selectedEnvio.fechaEnvio)}</span>
                  </div>
                </div>
              </div>
              
              {/* Lista de productos/insumos */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Verificación y Recepción de Items:</h4>
                  <div className="text-sm text-gray-500">
                    {selectedEnvio.items.length} ítem{selectedEnvio.items.length !== 1 ? 's' : ''} para verificar
                  </div>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                  <div className="flex items-start">
                    <Package className="h-5 w-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">Instrucciones:</p>
                      <p>Verifique físicamente cada ítem y ajuste las cantidades según lo que realmente recibe. El sistema detectará automáticamente cualquier diferencia y generará contingencias si es necesario.</p>
                    </div>
                  </div>
                </div>
                
                {selectedEnvio.items.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-medium text-gray-600 mr-3">
                            {index + 1}
                          </div>
                          <div>
                            <h5 className="font-medium text-gray-900 text-lg">{getItemName(item)}</h5>
                            <div className="text-sm text-gray-500 space-y-1">
                              <p>Código: {getItemCode(item)}</p>
                              <p>Unidad: {getItemUnit(item)} | Enviado: {item.cantidad}</p>
                              {item.producto?.categoria && (
                                <p>Categoría: {item.producto.categoria.nombre}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        {/* 🔧 CONTROLES DE CANTIDAD MEJORADOS */}
                        <div className="text-right">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Cantidad física recibida:
                          </label>
                          <div className="flex items-center border border-gray-300 rounded-md">
                            <button
                              type="button"
                              onClick={() => handleCantidadChange(item.id, (cantidadesRecibidas[item.id] || 0) - 1)}
                              disabled={(cantidadesRecibidas[item.id] || 0) <= 0}
                              className="p-2 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Minus className="h-4 w-4" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={cantidadesRecibidas[item.id] || ''}
                              onChange={(e) => handleCantidadChange(item.id, parseInt(e.target.value) || 0)}
                              className="w-20 px-3 py-2 text-center text-lg font-semibold border-0 focus:outline-none focus:ring-0"
                              placeholder="0"
                              autoFocus={index === 0}
                            />
                            <button
                              type="button"
                              onClick={() => handleCantidadChange(item.id, (cantidadesRecibidas[item.id] || 0) + 1)}
                              className="p-2 hover:bg-gray-100"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="text-center mt-1">
                            <span className="text-sm text-gray-500 font-medium">{getItemUnit(item)}</span>
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
                              <span className="text-xs">
                                {cantidadesRecibidas[item.id] > item.cantidad ? '+' : ''}{cantidadesRecibidas[item.id] - item.cantidad}
                              </span>
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  placeholder="Cualquier observación sobre la recepción, estado de los productos, etc..."
                />
              </div>
              
              {/* Alerta de diferencias */}
              {hasDifferences && (
                <div className="bg-orange-50 border border-orange-200 rounded-md p-4 mb-6">
                  <div className="flex">
                    <AlertTriangle className="h-5 w-5 text-orange-400 flex-shrink-0" />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-orange-800">
                        Diferencias detectadas
                      </h3>
                      <p className="mt-1 text-sm text-orange-700">
                        Se han detectado diferencias entre las cantidades enviadas y recibidas. 
                        Se generará automáticamente una contingencia para revisión administrativa.
                      </p>
                      <div className="mt-2 text-sm text-orange-700">
                        <strong>Diferencias:</strong>
                        <ul className="list-disc list-inside mt-1">
                          {selectedEnvio.items
                            .filter(item => cantidadesRecibidas[item.id] !== item.cantidad)
                            .map(item => {
                              const cantidadRecibida = cantidadesRecibidas[item.id] || 0;
                              const diferencia = cantidadRecibida - item.cantidad;
                              return (
                                <li key={item.id}>
                                  {getItemName(item)}: {diferencia > 0 ? '+' : ''}{diferencia} {getItemUnit(item)}
                                </li>
                              );
                            })
                          }
                        </ul>
                      </div>
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
                  className="px-4 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isReceiving ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2 inline-block"></div>
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Confirmar Recepción
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}