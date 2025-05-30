// src/app/(pdv)/pdv/conciliacion/page.tsx
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, Check, X, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, Eye, EyeOff, Hash, ScanLine
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface ProductoConciliacion {
  id: string;
  nombre: string;
  stockTeorico: number; // Solo para cálculos internos, NO se muestra
  stockFisico: number | null;
  diferencia: number; // Solo para cálculos internos
  conteoIntentos: number;
  completado: boolean;
}

interface Conciliacion {
  id: string;
  fecha: string;
  estado: 'pendiente' | 'completada' | 'con_contingencia';
  intentosGlobales: number;
  productos: ProductoConciliacion[];
}

const MAX_INTENTOS_GLOBAL = 3;

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
  
  // 🆕 Estados para la nueva UI
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'focus'>('list');
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  const [hasContingenciasPendientes, setHasContingenciasPendientes] = useState(false);
  const [contingenciasPendientes, setContingenciasPendientes] = useState<any[]>([]);
  
  const productRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Verificar contingencias pendientes
  useEffect(() => {
    verificarContingenciasPendientes();
  }, []);

  useEffect(() => {
    if (!hasContingenciasPendientes) {
      loadConciliacion();
    }
  }, [hasContingenciasPendientes]);

  const verificarContingenciasPendientes = async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      const response = await authenticatedFetch(
        `/api/contingencias?origen=sucursal&estado=pendiente&ubicacionId=${sucursalId}&tipo=conciliacion`
      );

      if (response.ok) {
        const contingencias = await response.json();
        const contingenciasConciliacion = contingencias.filter((c: any) => 
          c.tipo === 'conciliacion' && (c.estado === 'pendiente' || c.estado === 'en_revision')
        );

        if (contingenciasConciliacion.length > 0) {
          setHasContingenciasPendientes(true);
          setContingenciasPendientes(contingenciasConciliacion);
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
      
      let response = await authenticatedFetch(`/api/pdv/conciliacion?sucursalId=${sucursalId}`);
      
      if (!response.ok && response.status === 404) {
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
      
      const conciliacionFormateada: Conciliacion = {
        id: data.id,
        fecha: data.fecha,
        estado: data.estado || 'pendiente',
        intentosGlobales: 0,
        productos: data.productos.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          stockTeorico: p.stockTeorico, // Solo para cálculos internos
          stockFisico: p.stockFisico,
          diferencia: p.diferencia || 0,
          conteoIntentos: 0,
          completado: p.stockFisico !== null && p.stockFisico !== undefined
        }))
      };
      
      setConciliacion(conciliacionFormateada);
      
      const initialCounts: Record<string, number> = {};
      const initialIntentos: Record<string, number> = {};
      const completed = new Set<string>();
      
      conciliacionFormateada.productos.forEach(producto => {
        if (producto.stockFisico !== null) {
          initialCounts[producto.id] = producto.stockFisico;
          completed.add(producto.id);
        }
        initialIntentos[producto.id] = 0;
      });
      
      setStockCounts(initialCounts);
      setConteoIntentos(initialIntentos);
      setCompletedProducts(completed);
      
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar datos');
    } finally {
      setIsLoading(false);
    }
  };

  // 🆕 NUEVA LÓGICA: No mostrar diferencias, solo validar si está correcto
  const isProductCorrect = useCallback((productoId: string, stockFisico: number): boolean => {
    const producto = conciliacion?.productos.find(p => p.id === productoId);
    if (!producto) return false;
    return stockFisico === producto.stockTeorico; // Comparación interna
  }, [conciliacion]);

  const handleStockChange = (productoId: string, value: string) => {
    const cantidad = parseInt(value) || 0;
    if (cantidad < 0) return;
    
    setStockCounts(prev => ({
      ...prev,
      [productoId]: cantidad
    }));
    
    if (value !== '') {
      setCompletedProducts(prev => new Set([...prev, productoId]));
      
      // Auto-focus siguiente producto
      setTimeout(() => {
        focusNextIncompleteProduct(productoId);
      }, 500);
    } else {
      setCompletedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productoId);
        return newSet;
      });
    }
  };

  const focusNextIncompleteProduct = (currentProductId: string) => {
    if (!conciliacion) return;
    
    const currentIndex = conciliacion.productos.findIndex(p => p.id === currentProductId);
    const nextIncomplete = conciliacion.productos
      .slice(currentIndex + 1)
      .find(p => !completedProducts.has(p.id));
    
    if (nextIncomplete) {
      const input = inputRefs.current[nextIncomplete.id];
      if (input) {
        input.focus();
        input.select();
      }
    }
  };

  const handleValidateAndSave = async () => {
    if (!conciliacion) return;
    
    const productosIncompletos = conciliacion.productos.filter(p => 
      stockCounts[p.id] === undefined || stockCounts[p.id] === null
    );
    
    if (productosIncompletos.length > 0) {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: 'Conteo Incompleto',
        mensaje: `Faltan ${productosIncompletos.length} productos por contar.`,
        productosConError: productosIncompletos.map(p => p.nombre),
        intentosRestantes: 0
      });
      return;
    }
    
    // Verificar si hay diferencias (sin mostrarlas al usuario)
    const hayDiferencias = conciliacion.productos.some(p => {
      const stockFisico = stockCounts[p.id];
      return stockFisico !== p.stockTeorico;
    });
    
    const intentosActuales = (conciliacion?.intentosGlobales || 0) + 1;
    
    if (hayDiferencias && intentosActuales < MAX_INTENTOS_GLOBAL) {
      const productosConDiferencia = conciliacion.productos
        .filter(p => stockCounts[p.id] !== p.stockTeorico)
        .map(p => p.nombre);
      
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: 'Diferencias Detectadas',
        mensaje: `Se encontraron diferencias en algunos productos. Te recomendamos revisar el conteo de:`,
        productosConError: productosConDiferencia,
        intentosRestantes: MAX_INTENTOS_GLOBAL - intentosActuales
      });
      
      setConciliacion(prev => prev ? {
        ...prev,
        intentosGlobales: intentosActuales
      } : null);
      
    } else {
      await finalizarConciliacion(hayDiferencias);
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
        setSuccessMessage('Conciliación finalizada. Se ha generado una contingencia para revisión administrativa.');
      } else {
        setSuccessMessage('¡Conciliación completada exitosamente! Los números coinciden perfectamente.');
      }
      
      setShowAlert(null);
      
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

  const reiniciarConteoProducto = (productoId: string) => {
    setStockCounts(prev => {
      const newCounts = { ...prev };
      delete newCounts[productoId];
      return newCounts;
    });
    
    setCompletedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productoId);
      return newSet;
    });
    
    setTimeout(() => {
      const input = inputRefs.current[productoId];
      if (input) {
        input.focus();
      }
    }, 100);
  };

  // Progreso de la conciliación
  const progreso = {
    completados: completedProducts.size,
    total: conciliacion?.productos.length || 0
  };

  // Filtros de productos
  const filteredProductos = conciliacion?.productos.filter(producto =>
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  // Estados de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9c7561] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Preparando Conciliación</h2>
          <p className="text-gray-600">Cargando inventario...</p>
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
            Existe una contingencia de conciliación pendiente que debe ser resuelta por el administrador.
          </p>
          
          <div className="bg-orange-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-orange-800">
              <strong>Contingencias de conciliación pendientes:</strong> {contingenciasPendientes.length}
            </p>
            <p className="text-xs text-orange-600 mt-1">
              Las demás contingencias no afectan las conciliaciones.
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
      {/* Header mejorado con progreso prominente */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#311716] flex items-center">
                <BarChart className="mr-3 h-7 w-7 text-[#9c7561]" />
                Conteo de Inventario
              </h1>
              <p className="text-gray-600 mt-1">
                Registra la cantidad exacta que encuentras físicamente
              </p>
            </div>
            
            {/* 🆕 PROGRESO MÁS PROMINENTE */}
            <div className="text-center">
              <div className="flex items-center justify-center space-x-3 mb-2">
                <div className="text-3xl font-bold text-[#311716]">
                  {progreso.completados}
                </div>
                <div className="text-gray-400 text-xl">/</div>
                <div className="text-2xl font-semibold text-gray-600">
                  {progreso.total}
                </div>
              </div>
              
              <div className="w-32 bg-gray-200 rounded-full h-3 mb-1">
                <div 
                  className="bg-gradient-to-r from-[#311716] to-[#9c7561] h-3 rounded-full transition-all duration-500"
                  style={{ width: `${(progreso.completados / progreso.total) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-xs text-gray-500">
                {progreso.completados === progreso.total ? '¡Completado!' : 'Productos contados'}
              </p>
            </div>
          </div>

          {/* 🆕 CONTROLES DE VISTA */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('list')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'list' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Lista Completa
                </button>
                <button
                  onClick={() => setViewMode('focus')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'focus' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Modo Enfoque
                </button>
              </div>
              
              {conciliacion && conciliacion.intentosGlobales > 0 && (
                <div className="flex items-center text-amber-600 text-sm bg-amber-50 px-3 py-1 rounded-full">
                  <Clock className="h-4 w-4 mr-1" />
                  <span>Intento {conciliacion.intentosGlobales + 1} de {MAX_INTENTOS_GLOBAL}</span>
                </div>
              )}
            </div>
            
            {/* Buscador compacto */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar producto..."
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561] w-64"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6">
        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2" />
              <p className="text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg mb-6">
            <div className="flex items-center">
              <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
              <p className="text-green-800 font-medium">{successMessage}</p>
            </div>
          </div>
        )}

        {/* 🆕 INSTRUCCIONES SIMPLIFICADAS */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-4">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Hash className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Instrucciones Simples</h3>
              <div className="text-blue-800 space-y-1 text-sm">
                <p>• Cuenta físicamente cada producto y registra la cantidad exacta</p>
                <p>• El sistema te dirá si está ✅ correcto o ❌ incorrecto</p>
                <p>• Tienes hasta 3 oportunidades para revisar si hay diferencias</p>
              </div>
            </div>
          </div>
        </div>

        {/* 🆕 CONTENIDO PRINCIPAL CON VISTAS ALTERNATIVAS */}
        {viewMode === 'focus' ? (
          <FocusMode
            productos={filteredProductos}
            stockCounts={stockCounts}
            completedProducts={completedProducts}
            currentIndex={currentProductIndex}
            onStockChange={handleStockChange}
            onNext={() => setCurrentProductIndex(prev => Math.min(prev + 1, filteredProductos.length - 1))}
            onPrev={() => setCurrentProductIndex(prev => Math.max(prev - 1, 0))}
            onReset={reiniciarConteoProducto}
            isProductCorrect={isProductCorrect}
            inputRefs={inputRefs}
          />
        ) : (
          <ListView
            productos={filteredProductos}
            stockCounts={stockCounts}
            completedProducts={completedProducts}
            onStockChange={handleStockChange}
            onReset={reiniciarConteoProducto}
            isProductCorrect={isProductCorrect}
            inputRefs={inputRefs}
            productRefs={productRefs}
          />
        )}

        {/* Footer con observaciones y finalizar */}
        {conciliacion?.estado !== 'completada' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
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
                  placeholder="Cualquier observación sobre el conteo..."
                />
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleValidateAndSave}
                  disabled={isSaving || progreso.completados === 0}
                  className="px-8 py-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold text-lg shadow-lg hover:shadow-xl"
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

      {/* Modal de alerta */}
      {showAlert && (
        <AlertModal
          alert={showAlert}
          onClose={() => setShowAlert(null)}
          onConfirm={() => finalizarConciliacion(true)}
        />
      )}
    </div>
  );
}

// 🆕 COMPONENTE MODO ENFOQUE (para concentrarse en un producto a la vez)
interface FocusModeProps {
  productos: ProductoConciliacion[];
  stockCounts: Record<string, number>;
  completedProducts: Set<string>;
  currentIndex: number;
  onStockChange: (id: string, value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  onReset: (id: string) => void;
  isProductCorrect: (id: string, stock: number) => boolean;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}

function FocusMode({ 
  productos, 
  stockCounts, 
  completedProducts,
  currentIndex, 
  onStockChange, 
  onNext, 
  onPrev, 
  onReset,
  isProductCorrect,
  inputRefs
}: FocusModeProps) {
  const producto = productos[currentIndex];
  
  if (!producto) return <div>No hay productos para mostrar</div>;
  
  const stockFisico = stockCounts[producto.id];
  const estaCompleto = completedProducts.has(producto.id);
  const esCorrectoCalculo = estaCompleto && isProductCorrect(producto.id, stockFisico);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg p-8">
        {/* Header del producto */}
        <div className="text-center mb-8">
          <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
            estaCompleto
              ? esCorrectoCalculo
                ? 'bg-green-100 border-4 border-green-500'
                : 'bg-red-100 border-4 border-red-500'
              : 'bg-gray-100 border-4 border-gray-300'
          }`}>
            {estaCompleto ? (
              esCorrectoCalculo ? (
                <Check className="w-10 h-10 text-green-600" />
              ) : (
                <X className="w-10 h-10 text-red-600" />
              )
            ) : (
              <Hash className="w-10 h-10 text-gray-400" />
            )}
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{producto.nombre}</h2>
          <p className="text-gray-600">Producto {currentIndex + 1} de {productos.length}</p>
        </div>

        {/* Input principal */}
        <div className="mb-8">
          <label className="block text-lg font-medium text-gray-700 mb-4 text-center">
            ¿Cuántas unidades contaste?
          </label>
          <div className="relative">
            <input
              ref={(el) => { inputRefs.current[producto.id] = el; }}
              type="number"
              min="0"
              value={stockFisico !== undefined ? stockFisico : ''}
              onChange={(e) => onStockChange(producto.id, e.target.value)}
              placeholder="Cantidad contada"
              className={`w-full p-6 text-center text-3xl font-bold border-2 rounded-2xl focus:ring-4 focus:ring-opacity-50 ${
                estaCompleto
                  ? esCorrectoCalculo
                    ? 'border-green-500 bg-green-50 text-green-900 focus:ring-green-200'
                    : 'border-red-500 bg-red-50 text-red-900 focus:ring-red-200'
                  : 'border-gray-300 focus:border-[#9c7561] focus:ring-[#9c7561]'
              }`}
              autoFocus
            />
          </div>
        </div>

        {/* Estado visual */}
        {estaCompleto && (
          <div className={`text-center mb-6 p-4 rounded-xl ${
            esCorrectoCalculo
              ? 'bg-green-50 text-green-800'
              : 'bg-red-50 text-red-800'
          }`}>
            <div className="flex items-center justify-center space-x-2">
              {esCorrectoCalculo ? (
                <>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <span className="text-lg font-semibold">¡Correcto!</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <span className="text-lg font-semibold">Revisar cantidad</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Controles */}
        <div className="flex items-center justify-between">
          <button
            onClick={onPrev}
            disabled={currentIndex === 0}
            className="px-6 py-3 border border-gray-300 rounded-xl text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Anterior
          </button>
          
          <div className="flex space-x-2">
            <button
              onClick={() => onReset(producto.id)}
              className="px-4 py-3 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl"
              title="Limpiar"
            >
              <RotateCcw className="w-5 h-5" />
            </button>
          </div>
          
          <button
            onClick={onNext}
            disabled={currentIndex === productos.length - 1}
            className="px-6 py-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
          </button>
        </div>
      </div>
    </div>
  );
}

// 🆕 COMPONENTE VISTA LISTA COMPACTA
interface ListViewProps {
  productos: ProductoConciliacion[];
  stockCounts: Record<string, number>;
  completedProducts: Set<string>;
  onStockChange: (id: string, value: string) => void;
  onReset: (id: string) => void;
  isProductCorrect: (id: string, stock: number) => boolean;
  inputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  productRefs: React.MutableRefObject<Record<string, HTMLDivElement | null>>;
}

function ListView({ 
  productos, 
  stockCounts, 
  completedProducts,
  onStockChange, 
  onReset,
  isProductCorrect,
  inputRefs,
  productRefs
}: ListViewProps) {
  if (productos.length === 0) {
    return (
      <div className="bg-white p-8 text-center rounded-xl shadow-sm">
        <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">No se encontraron productos</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {productos.map((producto) => {
        const stockFisico = stockCounts[producto.id];
        const estaCompleto = completedProducts.has(producto.id);
        const esCorrectoCalculo = estaCompleto && isProductCorrect(producto.id, stockFisico);

        return (
          <div
            key={producto.id}
            ref={(el) => { productRefs.current[producto.id] = el; }}
            className={`bg-white rounded-xl shadow-sm border-2 transition-all duration-200 p-6 ${
              estaCompleto
                ? esCorrectoCalculo
                  ? 'border-green-500 bg-green-50'
                  : 'border-red-500 bg-red-50'
                : 'border-gray-200 hover:border-[#9c7561] hover:shadow-md'
            }`}
          >
            {/* Header del producto */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-lg mb-2 leading-tight">
                  {producto.nombre}
                </h3>
              </div>
              
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                estaCompleto
                  ? esCorrectoCalculo
                    ? 'bg-green-500 text-white'
                    : 'bg-red-500 text-white'
                  : 'bg-gray-200 text-gray-500'
              }`}>
                {estaCompleto ? (
                  esCorrectoCalculo ? (
                    <Check className="w-6 h-6" />
                  ) : (
                    <X className="w-6 h-6" />
                  )
                ) : (
                  <Hash className="w-6 h-6" />
                )}
              </div>
            </div>

            {/* Input de cantidad */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad contada:
              </label>
              <div className="flex items-center space-x-2">
                <input
                  ref={(el) => { inputRefs.current[producto.id] = el; }}
                  type="number"
                  min="0"
                  value={stockFisico !== undefined ? stockFisico : ''}
                  onChange={(e) => onStockChange(producto.id, e.target.value)}
                  placeholder="0"
                  className={`flex-1 p-3 text-center text-xl font-semibold border-2 rounded-lg ${
                    estaCompleto
                      ? esCorrectoCalculo
                        ? 'border-green-500 bg-green-50 text-green-900'
                        : 'border-red-500 bg-red-50 text-red-900'
                      : 'border-gray-300 focus:border-[#9c7561] focus:ring-2 focus:ring-[#9c7561] focus:ring-opacity-50'
                  }`}
                />
                
                <button
                  onClick={() => onReset(producto.id)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Limpiar"
                >
                  <RotateCcw className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Estado visual */}
            {estaCompleto && (
              <div className={`text-center py-2 px-4 rounded-lg ${
                esCorrectoCalculo
                  ? 'bg-green-100 text-green-800'
                  : 'bg-red-100 text-red-800'
              }`}>
                <div className="flex items-center justify-center space-x-2">
                  {esCorrectoCalculo ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Correcto</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-sm font-medium">Revisar</span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// 🆕 COMPONENTE MODAL DE ALERTA MEJORADO
interface AlertModalProps {
  alert: {
    tipo: 'warning' | 'error';
    titulo: string;
    mensaje: string;
    productosConError: string[];
    intentosRestantes: number;
  };
  onClose: () => void;
  onConfirm: () => void;
}

function AlertModal({ alert, onClose, onConfirm }: AlertModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${
            alert.tipo === 'error' ? 'bg-red-100' : 'bg-amber-100'
          }`}>
            <AlertTriangle className={`w-8 h-8 ${
              alert.tipo === 'error' ? 'text-red-600' : 'text-amber-600'
            }`} />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {alert.titulo}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {alert.mensaje}
          </p>
          
          {alert.productosConError.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left max-h-32 overflow-y-auto">
              <ul className="text-sm text-gray-600 space-y-1">
                {alert.productosConError.slice(0, 10).map((producto, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="truncate">{producto}</span>
                  </li>
                ))}
                {alert.productosConError.length > 10 && (
                  <li className="text-gray-500 italic text-center">
                    y {alert.productosConError.length - 10} más...
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {alert.intentosRestantes > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Oportunidades restantes:</strong> {alert.intentosRestantes}
              </p>
            </div>
          )}
          
          <div className="flex space-x-3">
            {alert.tipo === 'error' || alert.intentosRestantes === 0 ? (
              <button
                onClick={onConfirm}
                className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl hover:bg-red-700 font-semibold"
              >
                Entendido, Finalizar
              </button>
            ) : (
              <>
                <button
                  onClick={onClose}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold"
                >
                  Revisar Conteo
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 px-4 bg-amber-600 text-white rounded-xl hover:bg-amber-700 font-semibold"
                >
                  Finalizar Ahora
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}