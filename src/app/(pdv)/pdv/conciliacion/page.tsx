// src/app/(pdv)/pdv/conciliacion/page.tsx - VERSIÓN MEJORADA
'use client';

import { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, ArrowUp, ArrowDown, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, Eye, EyeOff
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface ProductoConciliacion {
  id: string;
  nombre: string;
  stockTeorico: number;
  stockFisico: number | null;
  diferencia: number;
  conteoIntentos: number;
  bloqueado: boolean;
}

interface Conciliacion {
  id: string;
  fecha: string;
  estado: 'pendiente' | 'completada' | 'con_contingencia';
  intentosGlobales: number;
  productos: ProductoConciliacion[];
}

const MAX_INTENTOS_GLOBAL = 3;
const MAX_INTENTOS_POR_PRODUCTO = 3;

export default function ConciliacionPage() {
  const [conciliacion, setConciliacion] = useState<Conciliacion | null>(null);
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  const [conteoIntentos, setConteoIntentos] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showAlert, setShowAlert] = useState<{
    show: boolean;
    tipo: 'warning' | 'error';
    titulo: string;
    mensaje: string;
    productosConError: string[];
    intentosRestantes: number;
  } | null>(null);
  
  // Nuevos estados para UX mejorada
  const [mostrarStockTeorico, setMostrarStockTeorico] = useState(false);
  const [productosCompletados, setProductosCompletados] = useState<Set<string>>(new Set());
  const [progreso, setProgreso] = useState({ completados: 0, total: 0 });
  
  const [hasContingenciasPendientes, setHasContingenciasPendientes] = useState(false);
  const [contingenciasPendientes, setContingenciasPendientes] = useState<any[]>([]);
  
  // Referencias para navegación mejorada
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const nextProductRef = useRef<string | null>(null);

  // Verificar contingencias pendientes al cargar
  useEffect(() => {
    verificarContingenciasPendientes();
  }, []);

  // Cargar datos de conciliación
  useEffect(() => {
    if (!hasContingenciasPendientes) {
      loadConciliacion();
    }
  }, [hasContingenciasPendientes]);

  // Actualizar progreso
  useEffect(() => {
    if (conciliacion) {
      const completados = conciliacion.productos.filter(p => 
        stockCounts[p.id] !== undefined && stockCounts[p.id] !== null
      ).length;
      
      setProgreso({
        completados,
        total: conciliacion.productos.length
      });
      
      setProductosCompletados(new Set(
        conciliacion.productos
          .filter(p => stockCounts[p.id] !== undefined && stockCounts[p.id] !== null)
          .map(p => p.id)
      ));
    }
  }, [stockCounts, conciliacion]);

  const verificarContingenciasPendientes = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      const response = await authenticatedFetch(
        `/api/contingencias?origen=sucursal&estado=pendiente&ubicacionId=${sucursalId}&tipo=stock`
      );

      if (response.ok) {
        const contingencias = await response.json();
        const contingenciasStock = contingencias.filter((c: any) => 
          c.tipo === 'stock' && (c.estado === 'pendiente' || c.estado === 'en_revision')
        );

        if (contingenciasStock.length > 0) {
          setHasContingenciasPendientes(true);
          setContingenciasPendientes(contingenciasStock);
        }
      }
    } catch (error) {
      console.error('Error verificando contingencias:', error);
    }
  };

  const loadConciliacion = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // Intentar obtener conciliación existente
      let response = await authenticatedFetch(`/api/pdv/conciliacion?sucursalId=${sucursalId}`);
      
      if (!response.ok && response.status === 404) {
        // Crear nueva conciliación
        const createResponse = await authenticatedFetch('/api/pdv/conciliacion', {
          method: 'POST',
          body: JSON.stringify({ sucursalId })
        });
        
        if (!createResponse.ok) {
          throw new Error('Error al crear nueva conciliación');
        }
        
        response = createResponse;
      } else if (!response.ok) {
        throw new Error('Error al cargar datos de conciliación');
      }
      
      const data = await response.json();
      
      // Formatear datos para la nueva estructura
      const conciliacionFormateada: Conciliacion = {
        id: data.id,
        fecha: data.fecha,
        estado: data.estado || 'pendiente',
        intentosGlobales: 0,
        productos: data.productos.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          stockTeorico: p.stockTeorico,
          stockFisico: p.stockFisico,
          diferencia: p.diferencia || 0,
          conteoIntentos: 0,
          bloqueado: false
        }))
      };
      
      setConciliacion(conciliacionFormateada);
      
      // Inicializar conteos
      const initialCounts: Record<string, number> = {};
      const initialIntentos: Record<string, number> = {};
      
      conciliacionFormateada.productos.forEach(producto => {
        if (producto.stockFisico !== null) {
          initialCounts[producto.id] = producto.stockFisico;
        }
        initialIntentos[producto.id] = 0;
      });
      
      setStockCounts(initialCounts);
      setConteoIntentos(initialIntentos);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStockChange = (productoId: string, value: string) => {
    const cantidad = parseInt(value) || 0;
    if (cantidad < 0) return;
    
    setStockCounts(prev => ({
      ...prev,
      [productoId]: cantidad
    }));
    
    // Auto-focus al siguiente producto incompleto
    if (value !== '') {
      focusNextIncompleteProduct(productoId);
    }
  };

  const focusNextIncompleteProduct = (currentProductId: string) => {
    if (!conciliacion) return;
    
    const currentIndex = conciliacion.productos.findIndex(p => p.id === currentProductId);
    const nextIncomplete = conciliacion.productos
      .slice(currentIndex + 1)
      .find(p => !productosCompletados.has(p.id));
    
    if (nextIncomplete) {
      setTimeout(() => {
        const element = productRefs.current[nextIncomplete.id];
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          const input = element.querySelector('input');
          input?.focus();
        }
      }, 100);
    }
  };

  const calcularDiferencia = (productoId: string, stockTeorico: number): number => {
    const stockFisico = stockCounts[productoId] || 0;
    return stockFisico - stockTeorico;
  };

  const validarConciliacion = (): { esValida: boolean; productosConError: string[]; diferenciasEncontradas: boolean } => {
    if (!conciliacion) return { esValida: false, productosConError: [], diferenciasEncontradas: false };
    
    const productosConError: string[] = [];
    let diferenciasEncontradas = false;
    
    for (const producto of conciliacion.productos) {
      const stockFisico = stockCounts[producto.id];
      
      // Verificar que todos los productos tengan conteo
      if (stockFisico === undefined || stockFisico === null) {
        productosConError.push(producto.nombre);
        continue;
      }
      
      // Verificar diferencias
      const diferencia = calcularDiferencia(producto.id, producto.stockTeorico);
      if (diferencia !== 0) {
        diferenciasEncontradas = true;
      }
    }
    
    return {
      esValida: productosConError.length === 0,
      productosConError,
      diferenciasEncontradas
    };
  };

  const handleValidateAndSave = async () => {
    const validacion = validarConciliacion();
    
    // Si faltan productos por contar
    if (!validacion.esValida) {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: 'Conteo Incompleto',
        mensaje: `Faltan ${validacion.productosConError.length} productos por contar. Por favor complete el conteo de todos los productos antes de continuar.`,
        productosConError: validacion.productosConError,
        intentosRestantes: 0
      });
      return;
    }
    
    // Si no hay diferencias, finalizar directamente
    if (!validacion.diferenciasEncontradas) {
      await finalizarConciliacion(false);
      return;
    }
    
    // Hay diferencias - manejar intentos
    const intentosActuales = (conciliacion?.intentosGlobales || 0) + 1;
    
    if (intentosActuales < MAX_INTENTOS_GLOBAL) {
      // Mostrar alerta de diferencias con oportunidad de reconteo
      const productosConDiferencia = conciliacion!.productos
        .filter(p => calcularDiferencia(p.id, p.stockTeorico) !== 0)
        .map(p => p.nombre);
      
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: 'Diferencias Detectadas',
        mensaje: `Se encontraron diferencias en el inventario. Te recomendamos recontar cuidadosamente los siguientes productos:`,
        productosConError: productosConDiferencia,
        intentosRestantes: MAX_INTENTOS_GLOBAL - intentosActuales
      });
      
      // Actualizar intentos
      setConciliacion(prev => prev ? {
        ...prev,
        intentosGlobales: intentosActuales
      } : null);
      
    } else {
      // Se agotaron los intentos - mostrar alerta final
      setShowAlert({
        show: true,
        tipo: 'error',
        titulo: 'Máximo de Intentos Alcanzado',
        mensaje: 'Se han agotado las oportunidades de reconteo. La conciliación se cerrará automáticamente y se generará una contingencia para revisión administrativa.',
        productosConError: [],
        intentosRestantes: 0
      });
    }
  };

  const finalizarConciliacion = async (generarContingencia: boolean = false) => {
    if (!conciliacion) return;
    
    setIsSaving(true);
    
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      const productos = conciliacion.productos.map(producto => ({
        productoId: producto.id,
        stockTeorico: producto.stockTeorico,
        stockFisico: stockCounts[producto.id] || 0
      }));
      
      const response = await authenticatedFetch('/api/pdv/conciliacion/guardar', {
        method: 'POST',
        body: JSON.stringify({
          id: conciliacion.id,
          productos,
          observaciones,
          sucursalId,
          forzarContingencia: generarContingencia
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar conciliación');
      }
      
      const result = await response.json();
      
      if (result.hayDiferencias || generarContingencia) {
        setSuccessMessage('Conciliación finalizada. Se ha generado una contingencia para revisión administrativa debido a las diferencias encontradas.');
      } else {
        setSuccessMessage('¡Conciliación completada exitosamente! Los números coinciden perfectamente.');
      }
      
      // Ocultar alerta
      setShowAlert(null);
      
      // Recargar después de un momento
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar conciliación');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseAlert = () => {
    setShowAlert(null);
  };

  const handleConfirmFinalizar = () => {
    if (showAlert?.intentosRestantes === 0 && showAlert.tipo === 'error') {
      // Finalizar con contingencia
      finalizarConciliacion(true);
    } else {
      // Cerrar alerta y permitir reconteo
      setShowAlert(null);
    }
  };

  const reiniciarConteoProducto = (productoId: string) => {
    setStockCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[productoId];
      return newCounts;
    });
    
    // Focus en el input del producto
    setTimeout(() => {
      const element = productRefs.current[productoId];
      if (element) {
        const input = element.querySelector('input');
        input?.focus();
      }
    }, 100);
  };

  // Filtros y búsqueda
  const filteredProductos = conciliacion?.productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Estados de loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9c7561] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Preparando Conciliación</h2>
          <p className="text-gray-600">Cargando información del inventario...</p>
        </div>
      </div>
    );
  }

  // Pantalla de contingencias pendientes
  if (hasContingenciasPendientes) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-lg border border-orange-200 max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8 text-orange-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Conciliación Bloqueada</h2>
          <p className="text-gray-600 mb-6">
            Existe una contingencia de stock pendiente que debe ser resuelta por el administrador antes de realizar una nueva conciliación.
          </p>
          
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              <strong>Contingencias pendientes:</strong> {contingenciasPendientes.length}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Contacte con el administrador para resolver estas contingencias.
            </p>
          </div>
          
          <button
            onClick={() => window.location.href = '/pdv'}
            className="w-full py-3 px-6 bg-[#311716] text-white rounded-xl hover:bg-[#462625] transition-colors font-semibold"
          >
            Volver al PDV
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mejorado */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-[#311716] flex items-center">
                <BarChart className="mr-3 h-7 w-7 text-[#9c7561]" />
                Conciliación de Inventario
              </h1>
              <p className="text-gray-600 mt-1">
                Registra el conteo físico de productos de manera precisa
              </p>
            </div>
            
            {/* Progreso */}
            <div className="text-right">
              <div className="flex items-center space-x-2 mb-2">
                <div className="text-2xl font-bold text-[#311716]">
                  {progreso.completados}/{progreso.total}
                </div>
                <Target className="h-5 w-5 text-[#9c7561]" />
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#311716] to-[#9c7561] h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(progreso.completados / progreso.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Productos completados</p>
            </div>
          </div>

          {/* Barra de estado */}
          {conciliacion?.estado === 'completada' && (
            <div className="mt-4 bg-green-100 border border-green-200 rounded-lg p-3 flex items-center">
              <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
              <span className="text-green-800 font-medium">Conciliación Completada</span>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* Card de instrucciones */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Eye className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Instrucciones de Conteo</h3>
              <div className="text-blue-800 space-y-2 text-sm">
                <p>• Realice un conteo físico cuidadoso de cada producto</p>
                <p>• Registre la cantidad exacta que encuentra en el inventario</p>
                <p>• Tiene hasta <strong>3 oportunidades</strong> para realizar el conteo correctamente</p>
                <p>• Si persisten las diferencias después de 3 intentos, se generará una contingencia automáticamente</p>
              </div>
              
              <div className="mt-4 flex items-center space-x-4">
                <button
                  onClick={() => setMostrarStockTeorico(!mostrarStockTeorico)}
                  className="flex items-center space-x-2 text-blue-700 hover:text-blue-900 text-sm"
                >
                  {mostrarStockTeorico ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  <span>
                    {mostrarStockTeorico ? 'Ocultar' : 'Mostrar'} stock del sistema
                  </span>
                </button>
                
                {conciliacion && conciliacion.intentosGlobales > 0 && (
                  <div className="flex items-center text-orange-600 text-sm">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Intento {conciliacion.intentosGlobales + 1} de {MAX_INTENTOS_GLOBAL}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar productos..."
            className="w-full p-4 pl-12 bg-white border border-gray-300 rounded-xl focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561] shadow-sm"
          />
          <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
        </div>

        {/* Lista de productos */}
        <div className="space-y-3">
          {filteredProductos.length === 0 ? (
            <div className="bg-white p-8 text-center rounded-xl shadow-sm">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600">No se encontraron productos</p>
            </div>
          ) : (
            filteredProductos.map((producto, index) => {
              const stockFisico = stockCounts[producto.id];
              const diferencia = stockFisico !== undefined ? calcularDiferencia(producto.id, producto.stockTeorico) : 0;
              const estaCompleto = stockFisico !== undefined && stockFisico !== null;
              const tieneDiferencia = estaCompleto && diferencia !== 0;

              return (
                <div
                  key={producto.id}
                  ref={(el) => {
                    if (el) productRefs.current[producto.id] = el;
                  }}
                  className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 ${
                    estaCompleto 
                      ? tieneDiferencia 
                        ? 'border-orange-200 bg-orange-50' 
                        : 'border-green-200 bg-green-50'
                      : 'border-gray-200 hover:border-[#9c7561] hover:shadow-md'
                  }`}
                >
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            estaCompleto 
                              ? tieneDiferencia 
                                ? 'bg-orange-500 text-white' 
                                : 'bg-green-500 text-white'
                              : 'bg-gray-200 text-gray-600'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h3 className="font-semibold text-gray-900 text-lg">{producto.nombre}</h3>
                            {mostrarStockTeorico && (
                              <p className="text-sm text-gray-500">Stock en sistema: {producto.stockTeorico} unidades</p>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {estaCompleto && (
                        <div className="flex items-center space-x-2">
                          {tieneDiferencia ? (
                            <div className="flex items-center text-orange-600">
                              {diferencia > 0 ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
                              <span className="font-bold">{Math.abs(diferencia)}</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-5 w-5 mr-1" />
                              <span className="font-medium">Correcto</span>
                            </div>
                          )}
                          
                          <button
                            onClick={() => reiniciarConteoProducto(producto.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Recontar producto"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cantidad contada físicamente:
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={stockFisico !== undefined ? stockFisico : ''}
                          onChange={(e) => handleStockChange(producto.id, e.target.value)}
                          placeholder="Ingrese la cantidad contada"
                          className={`w-full p-3 border rounded-lg text-lg font-medium focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561] ${
                            estaCompleto
                              ? tieneDiferencia
                                ? 'border-orange-300 bg-orange-50 text-orange-900'
                                : 'border-green-300 bg-green-50 text-green-900'
                              : 'border-gray-300'
                          }`}
                          disabled={conciliacion?.estado === 'completada'}
                        />
                      </div>
                      
                      {tieneDiferencia && (
                        <div className="text-center">
                          <div className="text-sm text-gray-600 mb-1">Diferencia</div>
                          <div className={`text-2xl font-bold px-3 py-2 rounded-lg ${
                            diferencia > 0 
                              ? 'text-blue-600 bg-blue-100' 
                              : 'text-red-600 bg-red-100'
                          }`}>
                            {diferencia > 0 ? '+' : ''}{diferencia}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {diferencia > 0 ? 'Exceso' : 'Faltante'}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Observaciones y finalizar */}
        {conciliacion?.estado !== 'completada' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones (opcional):
                </label>
                <textarea
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  placeholder="Ingrese cualquier observación sobre la conciliación..."
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleValidateAndSave}
                  disabled={isSaving || progreso.completados === 0}
                  className="px-8 py-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold text-lg shadow-lg"
                >
                  {isSaving ? (
                    <>
                      <Loader className="animate-spin h-5 w-5" />
                      <span>Procesando...</span>
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5" />
                      <span>Finalizar Conciliación</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de alerta mejorado */}
      {showAlert && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <div className="text-center">
              <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
                showAlert.tipo === 'error' ? 'bg-red-100' : 'bg-orange-100'
              }`}>
                <AlertTriangle className={`w-8 h-8 ${
                  showAlert.tipo === 'error' ? 'text-red-600' : 'text-orange-600'
                }`} />
              </div>
              
              <h3 className="text-xl font-bold text-gray-900 mb-3">
                {showAlert.titulo}
              </h3>
              
              <p className="text-gray-600 mb-4">
                {showAlert.mensaje}
              </p>
              
              {showAlert.productosConError.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left">
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Productos afectados:
                  </p>
                  <ul className="text-sm text-gray-600 space-y-1">
                    {showAlert.productosConError.slice(0, 5).map((producto, index) => (
                      <li key={index} className="flex items-center">
                        <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                        {producto}
                      </li>
                    ))}
                    {showAlert.productosConError.length > 5 && (
                      <li className="text-gray-500 italic">
                        y {showAlert.productosConError.length - 5} más...
                      </li>
                    )}
                  </ul>
                </div>
              )}
              
              {showAlert.intentosRestantes > 0 && (
                <div className="bg-blue-50 rounded-lg p-3 mb-4">
                  <p className="text-sm text-blue-800">
                    <strong>Oportunidades restantes:</strong> {showAlert.intentosRestantes}
                  </p>
                </div>
              )}
              
              <div className="flex space-x-3">
                {showAlert.tipo === 'error' ? (
                  <button
                    onClick={handleConfirmFinalizar}
                    className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
                  >
                    Entendido, Finalizar
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleCloseAlert}
                      className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                    >
                      Recontar
                    </button>
                    <button
                      onClick={() => finalizarConciliacion(true)}
                      className="flex-1 py-3 px-4 bg-orange-600 text-white rounded-xl hover:bg-orange-700 font-semibold"
                    >
                      Finalizar Ahora
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}