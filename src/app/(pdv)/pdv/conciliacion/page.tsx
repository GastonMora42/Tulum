// src/app/(pdv)/pdv/conciliacion/page.tsx - VERSIÓN MEJORADA CON BLOQUEO GRANULAR POR CATEGORÍA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, Check, X, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, ChevronLeft, ChevronRight,
  Hash, ScanLine, Grid, List, Filter, Tags, Lock
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface ProductoConciliacion {
  id: string;
  nombre: string;
  stockTeorico: number;
  stockFisico: number | null;
  diferencia: number;
  conteoIntentos: number;
  completado: boolean;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
  };
}

interface Categoria {
  id: string;
  nombre: string;
  productCount: number;
  completedCount: number;
  hasErrors: boolean;
  bloqueada: boolean; // 🆕 Indica si esta categoría está bloqueada
  contingencias?: any[]; // 🆕 Contingencias que bloquean esta categoría
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
  const [searchTerm, setSearchTerm] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // 🆕 NUEVOS ESTADOS PARA MANEJO GRANULAR DE CATEGORÍAS
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'all'>('category');
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  const [categoriasBloquedas, setCategoriasBloquedas] = useState<Set<string>>(new Set());
  
  const [showAlert, setShowAlert] = useState<{
    show: boolean;
    tipo: 'warning' | 'error';
    titulo: string;
    mensaje: string;
    productosConError: string[];
    intentosRestantes: number;
  } | null>(null);

  // 🆕 VERIFICAR ESTADO DE TODAS LAS CATEGORÍAS
  const verificarEstadoCategorias = useCallback(async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      console.log('[Conciliación] 🔍 Verificando estado de categorías...');

      // Obtener todas las categorías
      const categoriasResponse = await authenticatedFetch('/api/categorias');
      if (!categoriasResponse.ok) {
        throw new Error('Error al cargar categorías');
      }
      const todasCategorias = await categoriasResponse.json();

      // Verificar contingencias para cada categoría
      const categoriasConEstado = await Promise.all(
        todasCategorias.map(async (categoria: any) => {
          try {
            const response = await authenticatedFetch(
              `/api/pdv/conciliacion?sucursalId=${encodeURIComponent(sucursalId)}&categoriaId=${categoria.id}`
            );

            let bloqueada = false;
            let contingencias: any[] = [];

            if (response.status === 409) {
              const errorData = await response.json();
              bloqueada = true;
              contingencias = errorData.contingencias || [];
              console.log(`[Conciliación] 🔒 Categoría ${categoria.nombre} bloqueada por ${contingencias.length} contingencias`);
            }

            return {
              id: categoria.id,
              nombre: categoria.nombre,
              productCount: 0, // Se calculará después
              completedCount: 0,
              hasErrors: false,
              bloqueada,
              contingencias
            };
          } catch (error) {
            console.error(`Error verificando categoría ${categoria.nombre}:`, error);
            return {
              id: categoria.id,
              nombre: categoria.nombre,
              productCount: 0,
              completedCount: 0,
              hasErrors: false,
              bloqueada: false,
              contingencias: []
            };
          }
        })
      );

      // Filtrar solo categorías que tienen productos
      const categoriasConProductos = categoriasConEstado.filter(c => !c.bloqueada || c.contingencias.length > 0);
      
      setCategorias(categoriasConProductos);
      
      // Actualizar set de categorías bloqueadas
      const bloqueadas = new Set(categoriasConEstado.filter(c => c.bloqueada).map(c => c.id));
      setCategoriasBloquedas(bloqueadas);

      // Si no hay categoría activa, seleccionar la primera no bloqueada
      if (!activeCategoryId) {
        const primeraDisponible = categoriasConEstado.find(c => !c.bloqueada);
        if (primeraDisponible) {
          setActiveCategoryId(primeraDisponible.id);
          console.log(`[Conciliación] 🎯 Categoría activa por defecto: ${primeraDisponible.nombre}`);
        }
      }

    } catch (error) {
      console.error('[Conciliación] Error verificando estado de categorías:', error);
    }
  }, [activeCategoryId]);

  // 🆕 CARGAR CONCILIACIÓN ESPECÍFICA DE UNA CATEGORÍA
  const loadConciliacionCategoria = useCallback(async (categoriaId: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal para este punto de venta');
      }
      
      console.log(`[Conciliación] 🏪 Cargando conciliación para categoría: ${categoriaId}`);
      
      let response = await authenticatedFetch(`/api/pdv/conciliacion?sucursalId=${encodeURIComponent(sucursalId)}&categoriaId=${categoriaId}`);
      
      console.log(`[Conciliación] 📊 Respuesta recibida - Status: ${response.status} ${response.statusText}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: `Error HTTP ${response.status}` }));
        
        if (response.status === 404) {
          console.log('[Conciliación] 🆕 No hay conciliación activa para esta categoría, creando nueva...');
          
          const createResponse = await authenticatedFetch('/api/pdv/conciliacion', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sucursalId, categoriaId })
          });
          
          if (!createResponse.ok) {
            const createErrorData = await createResponse.json().catch(() => ({}));
            throw new Error(createErrorData.error || `Error al crear conciliación para categoría`);
          }
          
          response = createResponse;
        } 
        else if (response.status === 409) {
          console.log('[Conciliación] 🚫 Categoría bloqueada:', errorData);
          
          // Mostrar mensaje específico de bloqueo granular
          setError(`🔒 ${errorData.error || 'Esta categoría está bloqueada por contingencias'}`);
          
          // Marcar esta categoría como bloqueada
          setCategoriasBloquedas(prev => new Set([...prev, categoriaId]));
          
          // Actualizar estado de categorías
          setCategorias(prev => prev.map(cat => 
            cat.id === categoriaId 
              ? { ...cat, bloqueada: true, contingencias: errorData.contingencias || [] }
              : cat
          ));
          
          return;
        }
        else {
          throw new Error(errorData.error || `Error del servidor (${response.status})`);
        }
      }
      
      const data = await response.json();
      
      // Formatear datos de conciliación
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
          completado: p.stockFisico !== null && p.stockFisico !== undefined,
          categoriaId: p.categoriaId,
          categoria: p.categoria
        }))
      };
      
      setConciliacion(conciliacionFormateada);
      
      // Inicializar conteos
      const initialCounts: Record<string, number> = {};
      const completed = new Set<string>();
      
      conciliacionFormateada.productos.forEach(producto => {
        if (producto.stockFisico !== null && producto.stockFisico !== undefined) {
          initialCounts[producto.id] = producto.stockFisico;
          completed.add(producto.id);
        }
      });
      
      setStockCounts(initialCounts);
      setCompletedProducts(completed);
      
      console.log(`[Conciliación] ✅ Conciliación de categoría cargada: ${conciliacionFormateada.productos.length} productos`);
      
    } catch (err) {
      console.error('[Conciliación] ❌ Error cargando conciliación de categoría:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar conciliación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 🆕 MANEJAR CAMBIO DE CATEGORÍA ACTIVA
  const handleCategoriaChange = useCallback(async (categoriaId: string) => {
    if (categoriasBloquedas.has(categoriaId)) {
      const categoria = categorias.find(c => c.id === categoriaId);
      setError(`🔒 La categoría "${categoria?.nombre || 'seleccionada'}" está bloqueada por contingencias pendientes. Las demás categorías pueden conciliarse normalmente.`);
      return;
    }
    
    setActiveCategoryId(categoriaId);
    setError(null);
    setConciliacion(null);
    setStockCounts({});
    setCompletedProducts(new Set());
    
    await loadConciliacionCategoria(categoriaId);
  }, [categoriasBloquedas, categorias, loadConciliacionCategoria]);

  // Inicialización
  useEffect(() => {
    const init = async () => {
      await verificarEstadoCategorias();
    };
    init();
  }, [verificarEstadoCategorias]);

  // Cargar conciliación cuando se selecciona una categoría
  useEffect(() => {
    if (activeCategoryId && !categoriasBloquedas.has(activeCategoryId)) {
      loadConciliacionCategoria(activeCategoryId);
    }
  }, [activeCategoryId, categoriasBloquedas, loadConciliacionCategoria]);

  const isProductCorrect = useCallback((productoId: string, stockFisico: number): boolean => {
    const producto = conciliacion?.productos.find(p => p.id === productoId);
    if (!producto) return false;
    return stockFisico === producto.stockTeorico;
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
    } else {
      setCompletedProducts(prev => {
        const newSet = new Set(prev);
        newSet.delete(productoId);
        return newSet;
      });
    }
  };

  const handleValidateAndSave = async () => {
    if (!conciliacion || !activeCategoryId) return;
    
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
        mensaje: `Se encontraron diferencias en algunos productos de esta categoría. Te recomendamos revisar el conteo:`,
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
    if (!conciliacion || !activeCategoryId) return;
    
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
          categoriaId: activeCategoryId, // 🆕 Pasar categoría específica
          forzarContingencia: generarContingencia
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar conciliación');
      }
      
      const result = await response.json();
      
      if (result.hayDiferencias || generarContingencia) {
        setSuccessMessage(`¡Conciliación de categoría completada! Se generó una contingencia para esta categoría específica. Las demás categorías pueden seguir conciliándose normalmente.`);
        
        // Marcar esta categoría como bloqueada
        setCategoriasBloquedas(prev => new Set([...prev, activeCategoryId]));
        
        // Actualizar estado de categorías
        setCategorias(prev => prev.map(cat => 
          cat.id === activeCategoryId 
            ? { ...cat, bloqueada: true }
            : cat
        ));
      } else {
        setSuccessMessage('¡Conciliación de categoría completada exitosamente! Los números coinciden perfectamente.');
      }
      
      setShowAlert(null);
      
      setTimeout(() => {
        // Refrescar estado de categorías
        verificarEstadoCategorias();
        setSuccessMessage(null);
        
        // Seleccionar próxima categoría disponible
        const proximaCategoria = categorias.find(c => c.id !== activeCategoryId && !categoriasBloquedas.has(c.id));
        if (proximaCategoria) {
          setActiveCategoryId(proximaCategoria.id);
        }
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
  };

  // Filtrar productos por búsqueda
  const productosFiltrados = conciliacion?.productos.filter(producto => {
    const matchesSearch = searchTerm ? 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesSearch;
  }) || [];

  // Progreso de la categoría actual
  const progreso = {
    completados: completedProducts.size,
    total: conciliacion?.productos.length || 0
  };

  // Estados de carga
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8 min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#9c7561] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">Preparando Conciliación</h2>
          <p className="text-gray-600">Cargando inventario por categorías...</p>
        </div>
      </div>
    );
  }

  const categoriaActiva = categorias.find(c => c.id === activeCategoryId);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header mejorado */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#311716] flex items-center">
                <BarChart className="mr-3 h-7 w-7 text-[#9c7561]" />
                Conciliación por Categorías
              </h1>
              <p className="text-gray-600 mt-1">
                {activeCategoryId 
                  ? `Conciliando: ${categoriaActiva?.nombre || 'Categoría'} • Otras categorías disponibles individualmente`
                  : 'Selecciona una categoría para iniciar conciliación individual'
                }
              </p>
            </div>
            
            {/* Progreso de categoría actual */}
            {conciliacion && (
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
                  {progreso.completados === progreso.total ? '¡Completado!' : 'Esta categoría'}
                </p>
              </div>
            )}
          </div>

          {/* Selector de categorías */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                📊 Estado: {categorias.filter(c => !c.bloqueada).length} disponibles, {categoriasBloquedas.size} bloqueadas
              </div>
            </div>
            
            {/* Buscador */}
            {conciliacion && (
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
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Mensajes */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg mb-6">
            <div className="flex items-start">
              {error.includes('🔒') ? (
                <Lock className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              )}
              <div>
                <p className="text-red-800 font-medium">{error}</p>
                {error.includes('🔒') && (
                  <p className="text-red-600 text-sm mt-1">
                    💡 Puedes seleccionar otra categoría disponible para continuar conciliando.
                  </p>
                )}
              </div>
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

        <div className="flex gap-6">
          {/* 🆕 PANEL DE CATEGORÍAS CON ESTADO */}
          <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
              <Tags className="w-5 h-5 mr-2 text-[#9c7561]" />
              Categorías ({categorias.length})
            </h3>
            
            <div className="space-y-2">
              {categorias.map(categoria => {
                const esBloqueada = categoriasBloquedas.has(categoria.id);
                const esActiva = activeCategoryId === categoria.id;
                
                return (
                  <button
                    key={categoria.id}
                    onClick={() => !esBloqueada && handleCategoriaChange(categoria.id)}
                    disabled={esBloqueada}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      esBloqueada
                        ? 'border-red-200 bg-red-50 cursor-not-allowed opacity-75'
                        : esActiva
                        ? 'border-[#311716] bg-[#311716]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className={`font-medium ${esBloqueada ? 'text-red-700' : 'text-gray-900'}`}>
                        {categoria.nombre}
                      </span>
                      <div className="flex items-center space-x-1">
                        {esBloqueada && (
                          <Lock className="w-4 h-4 text-red-500" />
                        )}
                        {esActiva && !esBloqueada && (
                          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-xs">
                      {esBloqueada ? (
                        <span className="text-red-600">
                          🔒 Bloqueada por contingencia
                        </span>
                      ) : esActiva && conciliacion ? (
                        <span className="text-green-600">
                          ✅ {progreso.completados}/{progreso.total} productos
                        </span>
                      ) : (
                        <span className="text-gray-500">
                          📦 Disponible para conciliar
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            
            {categoriasBloquedas.size > 0 && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs text-amber-800">
                  <strong>💡 Info:</strong> Las categorías bloqueadas se desbloquearán automáticamente cuando el administrador resuelva sus contingencias.
                </p>
              </div>
            )}
          </div>

          {/* PANEL PRINCIPAL DE PRODUCTOS */}
          <div className="flex-1">
            {!activeCategoryId || categoriasBloquedas.has(activeCategoryId) ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {categoriasBloquedas.has(activeCategoryId!) 
                    ? 'Categoría Bloqueada' 
                    : 'Selecciona una Categoría'
                  }
                </h3>
                <p className="text-gray-600 mb-4">
                  {categoriasBloquedas.has(activeCategoryId!) 
                    ? 'Esta categoría tiene contingencias pendientes. Selecciona otra categoría para continuar.'
                    : 'Elige una categoría del panel izquierdo para iniciar su conciliación individual.'
                  }
                </p>
                
                {categorias.filter(c => !categoriasBloquedas.has(c.id)).length > 0 && (
                  <div className="flex flex-wrap gap-2 justify-center">
                    {categorias.filter(c => !categoriasBloquedas.has(c.id)).slice(0, 4).map(categoria => (
                      <button
                        key={categoria.id}
                        onClick={() => handleCategoriaChange(categoria.id)}
                        className="px-3 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] text-sm"
                      >
                        {categoria.nombre}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : conciliacion ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Productos de {categoriaActiva?.nombre}
                  </h3>
                  
                  <div className="text-sm text-gray-600">
                    {productosFiltrados.length} productos
                  </div>
                </div>
                
                {productosFiltrados.length > 0 ? (
                  <div className="space-y-3">
                    {productosFiltrados.map(producto => {
                      const stockFisico = stockCounts[producto.id];
                      const estaCompleto = completedProducts.has(producto.id);
                      const esCorrectoCalculo = estaCompleto && isProductCorrect(producto.id, stockFisico);

                      return (
                        <div
                          key={producto.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            estaCompleto
                              ? esCorrectoCalculo
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-[#9c7561]'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1">
                              {producto.nombre}
                            </h4>
                            <div className="text-sm text-gray-600">
                              Stock teórico: {producto.stockTeorico}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                Stock físico:
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={stockFisico !== undefined ? stockFisico : ''}
                                onChange={(e) => handleStockChange(producto.id, e.target.value)}
                                placeholder="0"
                                className={`w-24 p-2 text-center font-semibold border-2 rounded-lg ${
                                  estaCompleto
                                    ? esCorrectoCalculo
                                      ? 'border-green-500 bg-green-50 text-green-900'
                                      : 'border-red-500 bg-red-50 text-red-900'
                                    : 'border-gray-300 focus:border-[#9c7561] focus:ring-2 focus:ring-[#9c7561] focus:ring-opacity-50'
                                }`}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {estaCompleto ? (
                                esCorrectoCalculo ? (
                                  <div className="flex items-center text-green-700">
                                    <CheckCircle className="w-5 h-5 mr-1" />
                                    <span className="text-sm font-medium">Correcto</span>
                                  </div>
                                ) : (
                                  <div className="flex items-center text-red-700">
                                    <AlertCircle className="w-5 h-5 mr-1" />
                                    <span className="text-sm font-medium">Diferencia</span>
                                  </div>
                                )
                              ) : (
                                <div className="flex items-center text-gray-500">
                                  <Clock className="w-5 h-5 mr-1" />
                                  <span className="text-sm">Pendiente</span>
                                </div>
                              )}
                              
                              <button
                                onClick={() => reiniciarConteoProducto(producto.id)}
                                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                                title="Limpiar"
                              >
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay productos que coincidan con la búsqueda</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <div className="animate-spin h-8 w-8 border-4 border-[#9c7561] border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-600">Cargando productos de la categoría...</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer con observaciones y finalizar */}
        {conciliacion && activeCategoryId && !categoriasBloquedas.has(activeCategoryId) && (
          <div className="bg-white rounded-xl shadow-sm p-6 mt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones para esta categoría (opcional):
                </label>
                <textarea
                  rows={3}
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
                  placeholder={`Observaciones específicas para ${categoriaActiva?.nombre}...`}
                />
              </div>
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  💡 Esta conciliación afectará únicamente la categoría <strong>{categoriaActiva?.nombre}</strong>
                </div>
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
                      <span>Finalizar Categoría</span>
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

// Componente de modal de alerta (mantener igual)
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