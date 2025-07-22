// src/app/(pdv)/pdv/conciliacion/page.tsx - VERSIÓN MODIFICADA CON CONTROL DE INTENTOS INDIVIDUAL
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, Check, X, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, ChevronLeft, ChevronRight,
  Hash, ScanLine, Grid, List, Filter, Tags, Lock, Shield
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
  bloqueado: boolean; // 🆕 NUEVO: Indica si el producto está bloqueado por intentos
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
  bloqueada: boolean;
  contingencias?: any[];
}

interface Conciliacion {
  id: string;
  fecha: string;
  estado: 'pendiente' | 'completada' | 'con_contingencia';
  intentosGlobales: number;
  productos: ProductoConciliacion[];
}

const MAX_INTENTOS_POR_PRODUCTO = 3; // 🆕 CONSTANTE PARA INTENTOS POR PRODUCTO
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
  
  // 🆕 NUEVOS ESTADOS PARA CONTROL DE INTENTOS POR PRODUCTO
  const [productAttempts, setProductAttempts] = useState<Record<string, number>>({});
  const [blockedProducts, setBlockedProducts] = useState<Set<string>>(new Set());
  
  // Estados existentes para manejo de categorías
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

  // 🆕 FUNCIÓN MEJORADA PARA MANEJAR CAMBIOS EN STOCK CON CONTROL DE INTENTOS
  const handleStockChange = useCallback((productoId: string, value: string) => {
    const cantidad = parseInt(value) || 0;
    if (cantidad < 0) return;
    
    // Verificar si el producto ya está bloqueado
    if (blockedProducts.has(productoId)) {
      console.log(`[CONCILIACIÓN] ⚠️ Intento de modificar producto bloqueado: ${productoId}`);
      return;
    }
    
    // Obtener valor anterior
    const valorAnterior = stockCounts[productoId];
    const esNuevoValor = value !== '' && (!valorAnterior || valorAnterior !== cantidad);
    
    // Si es un valor nuevo diferente al anterior, incrementar intentos
    if (esNuevoValor) {
      const nuevosIntentos = (productAttempts[productoId] || 0) + 1;
      
      console.log(`[CONCILIACIÓN] 📊 Producto ${productoId}: Intento ${nuevosIntentos}/${MAX_INTENTOS_POR_PRODUCTO}`);
      
      // Actualizar intentos
      setProductAttempts(prev => ({
        ...prev,
        [productoId]: nuevosIntentos
      }));
      
      // Si alcanza el máximo de intentos, bloquear el producto
      if (nuevosIntentos >= MAX_INTENTOS_POR_PRODUCTO) {
        console.log(`[CONCILIACIÓN] 🔒 Producto ${productoId} BLOQUEADO por exceder ${MAX_INTENTOS_POR_PRODUCTO} intentos`);
        
        setBlockedProducts(prev => new Set([...prev, productoId]));
        
        // Marcar como completado automáticamente
        setCompletedProducts(prev => new Set([...prev, productoId]));
        
        // Actualizar el producto en la conciliación para marcarlo como bloqueado
        setConciliacion(prev => prev ? {
          ...prev,
          productos: prev.productos.map(p => 
            p.id === productoId 
              ? { ...p, bloqueado: true, conteoIntentos: nuevosIntentos, completado: true }
              : p
          )
        } : null);
        
        // Mostrar alerta de bloqueo
        setShowAlert({
          show: true,
          tipo: 'error',
          titulo: '🔒 Producto Bloqueado',
          mensaje: `El producto "${conciliacion?.productos.find(p => p.id === productoId)?.nombre}" ha sido bloqueado automáticamente después de ${MAX_INTENTOS_POR_PRODUCTO} intentos de conteo.`,
          productosConError: [conciliacion?.productos.find(p => p.id === productoId)?.nombre || 'Producto'],
          intentosRestantes: 0
        });
        
        setTimeout(() => setShowAlert(null), 5000);
      }
    }
    
    // Actualizar el valor solo si no está bloqueado
    if (!blockedProducts.has(productoId)) {
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
    }
  }, [stockCounts, productAttempts, blockedProducts, conciliacion]);

  // 🆕 FUNCIÓN PARA REINICIAR PRODUCTO (SOLO ADMIN PUEDE HACER ESTO)
  const reiniciarConteoProducto = useCallback((productoId: string) => {
    // Esta función ahora también reinicia los intentos
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
    
    // 🆕 REINICIAR INTENTOS Y DESBLOQUEAR
    setProductAttempts(prev => {
      const newAttempts = { ...prev };
      delete newAttempts[productoId];
      return newAttempts;
    });
    
    setBlockedProducts(prev => {
      const newSet = new Set(prev);
      newSet.delete(productoId);
      return newSet;
    });
    
    // Actualizar conciliación para desmarcar como bloqueado
    setConciliacion(prev => prev ? {
      ...prev,
      productos: prev.productos.map(p => 
        p.id === productoId 
          ? { ...p, bloqueado: false, conteoIntentos: 0, completado: false }
          : p
      )
    } : null);
    
    console.log(`[CONCILIACIÓN] 🔄 Producto ${productoId} reiniciado completamente`);
  }, []);

  // Verificar estado de todas las categorías (función existente)
  const verificarEstadoCategorias = useCallback(async () => {
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) return;

      console.log('[Conciliación] 🔍 Verificando estado de categorías...');

      const categoriasResponse = await authenticatedFetch('/api/categorias');
      if (!categoriasResponse.ok) {
        throw new Error('Error al cargar categorías');
      }
      const todasCategorias = await categoriasResponse.json();

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
              productCount: 0,
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

      const categoriasConProductos = categoriasConEstado.filter(c => !c.bloqueada || c.contingencias.length > 0);
      
      setCategorias(categoriasConProductos);
      
      const bloqueadas = new Set(categoriasConEstado.filter(c => c.bloqueada).map(c => c.id));
      setCategoriasBloquedas(bloqueadas);

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

  // Cargar conciliación específica de una categoría (función existente pero modificada)
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
          setError(`🔒 ${errorData.error || 'Esta categoría está bloqueada por contingencias'}`);
          setCategoriasBloquedas(prev => new Set([...prev, categoriaId]));
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
      
      // 🆕 FORMATEAR DATOS CON INFORMACIÓN DE BLOQUEO
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
          conteoIntentos: 0, // Se inicializa en 0, se trackea por separado
          completado: p.stockFisico !== null && p.stockFisico !== undefined,
          bloqueado: false, // Se inicializa como no bloqueado
          categoriaId: p.categoriaId,
          categoria: p.categoria
        }))
      };
      
      setConciliacion(conciliacionFormateada);
      
      // 🆕 INICIALIZAR ESTADOS DE INTENTOS Y BLOQUEOS
      const initialCounts: Record<string, number> = {};
      const completed = new Set<string>();
      const attempts: Record<string, number> = {};
      const blocked = new Set<string>();
      
      conciliacionFormateada.productos.forEach(producto => {
        if (producto.stockFisico !== null && producto.stockFisico !== undefined) {
          initialCounts[producto.id] = producto.stockFisico;
          completed.add(producto.id);
        }
        attempts[producto.id] = 0; // Inicializar intentos en 0
      });
      
      setStockCounts(initialCounts);
      setCompletedProducts(completed);
      setProductAttempts(attempts);
      setBlockedProducts(blocked);
      
      console.log(`[Conciliación] ✅ Conciliación de categoría cargada: ${conciliacionFormateada.productos.length} productos`);
      
    } catch (err) {
      console.error('[Conciliación] ❌ Error cargando conciliación de categoría:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar conciliación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manejar cambio de categoría activa (función existente)
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
    // 🆕 LIMPIAR ESTADOS DE INTENTOS AL CAMBIAR CATEGORÍA
    setProductAttempts({});
    setBlockedProducts(new Set());
    
    await loadConciliacionCategoria(categoriaId);
  }, [categoriasBloquedas, categorias, loadConciliacionCategoria]);

  // Inicialización (sin cambios)
  useEffect(() => {
    const init = async () => {
      await verificarEstadoCategorias();
    };
    init();
  }, [verificarEstadoCategorias]);

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

  // Función de validación y guardado (modificada para incluir productos bloqueados)
  const handleValidateAndSave = async () => {
    if (!conciliacion || !activeCategoryId) return;
    
    const productosIncompletos = conciliacion.productos.filter(p => 
      !blockedProducts.has(p.id) && (stockCounts[p.id] === undefined || stockCounts[p.id] === null)
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
    
    // 🆕 CONTAR PRODUCTOS BLOQUEADOS
    const productosBloquados = conciliacion.productos.filter(p => blockedProducts.has(p.id));
    
    const intentosActuales = (conciliacion?.intentosGlobales || 0) + 1;
    
    if ((hayDiferencias || productosBloquados.length > 0) && intentosActuales < MAX_INTENTOS_GLOBAL) {
      const productosConDiferencia = conciliacion.productos
        .filter(p => {
          if (blockedProducts.has(p.id)) return true; // Incluir productos bloqueados
          return stockCounts[p.id] !== p.stockTeorico;
        })
        .map(p => p.nombre);
      
      let mensajeAlerta = `Se encontraron diferencias en algunos productos de esta categoría.`;
      if (productosBloquados.length > 0) {
        mensajeAlerta += ` ${productosBloquados.length} producto(s) fueron bloqueado(s) automáticamente por exceder ${MAX_INTENTOS_POR_PRODUCTO} intentos.`;
      }
      
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: 'Diferencias y/o Productos Bloqueados',
        mensaje: mensajeAlerta,
        productosConError: productosConDiferencia,
        intentosRestantes: MAX_INTENTOS_GLOBAL - intentosActuales
      });
      
      setConciliacion(prev => prev ? {
        ...prev,
        intentosGlobales: intentosActuales
      } : null);
      
    } else {
      await finalizarConciliacion(hayDiferencias || productosBloquados.length > 0);
    }
  };

  // Función para finalizar conciliación (modificada)
  const finalizarConciliacion = async (generarContingencia: boolean = false) => {
    if (!conciliacion || !activeCategoryId) return;
    
    setIsSaving(true);
    
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // 🆕 INCLUIR INFORMACIÓN DE PRODUCTOS BLOQUEADOS
      const productos = conciliacion.productos.map(producto => ({
        productoId: producto.id,
        stockTeorico: producto.stockTeorico,
        stockFisico: blockedProducts.has(producto.id) 
          ? stockCounts[producto.id] || producto.stockTeorico // Usar último valor o teórico si está bloqueado
          : stockCounts[producto.id] || 0,
        bloqueadoPorIntentos: blockedProducts.has(producto.id),
        intentosRealizados: productAttempts[producto.id] || 0
      }));
      
      const response = await authenticatedFetch('/api/pdv/conciliacion/guardar', {
        method: 'POST',
        body: JSON.stringify({
          id: conciliacion.id,
          productos,
          observaciones,
          sucursalId,
          categoriaId: activeCategoryId,
          forzarContingencia: generarContingencia,
          productosBloquados: Array.from(blockedProducts) // 🆕 ENVIAR LISTA DE PRODUCTOS BLOQUEADOS
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar conciliación');
      }
      
      const result = await response.json();
      
      if (result.hayDiferencias || generarContingencia) {
        let mensaje = `¡Conciliación de categoría completada! Se generó una contingencia para esta categoría específica.`;
        
        if (blockedProducts.size > 0) {
          mensaje += ` ${blockedProducts.size} producto(s) fueron bloqueado(s) por exceder los intentos permitidos.`;
        }
        
        setSuccessMessage(mensaje);
        setCategoriasBloquedas(prev => new Set([...prev, activeCategoryId]));
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
        verificarEstadoCategorias();
        setSuccessMessage(null);
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

  // Filtrar productos por búsqueda
  const productosFiltrados = conciliacion?.productos.filter(producto => {
    const matchesSearch = searchTerm ? 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesSearch;
  }) || [];

  // Progreso de la categoría actual
  const progreso = {
    completados: completedProducts.size,
    total: conciliacion?.productos.length || 0,
    bloqueados: blockedProducts.size // 🆕 INCLUIR PRODUCTOS BLOQUEADOS EN EL PROGRESO
  };

  // Estados de carga (sin cambios)
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
      {/* Header mejorado con información de productos bloqueados */}
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
                  ? `Conciliando: ${categoriaActiva?.nombre || 'Categoría'} • Máximo ${MAX_INTENTOS_POR_PRODUCTO} intentos por producto`
                  : 'Selecciona una categoría para iniciar conciliación individual'
                }
              </p>
            </div>
            
            {/* Progreso de categoría actual con información de bloqueos */}
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
                  {/* 🆕 MOSTRAR PRODUCTOS BLOQUEADOS */}
                  {progreso.bloqueados > 0 && (
                    <>
                      <div className="text-gray-400 text-lg">•</div>
                      <div className="flex items-center text-red-600">
                        <Shield className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">{progreso.bloqueados} bloqueados</span>
                      </div>
                    </>
                  )}
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
        {/* Mensajes (sin cambios) */}
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
          {/* Panel de categorías (sin cambios en la estructura) */}
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
                          {progreso.bloqueados > 0 && (
                            <span className="text-red-600 ml-2">• {progreso.bloqueados} bloqueados</span>
                          )}
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

          {/* PANEL PRINCIPAL DE PRODUCTOS - MODIFICADO */}
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
                    {blockedProducts.size > 0 && (
                      <span className="text-red-600 ml-2">• {blockedProducts.size} bloqueados</span>
                    )}
                  </div>
                </div>
                
                {productosFiltrados.length > 0 ? (
                  <div className="space-y-3">
                    {productosFiltrados.map(producto => {
                      const stockFisico = stockCounts[producto.id];
                      const estaCompleto = completedProducts.has(producto.id);
                      const estaBloqueado = blockedProducts.has(producto.id);
                      const intentosRealizados = productAttempts[producto.id] || 0;
                      const intentosRestantes = MAX_INTENTOS_POR_PRODUCTO - intentosRealizados;
                      const esCorrectoCalculo = estaCompleto && !estaBloqueado && isProductCorrect(producto.id, stockFisico);

                      return (
                        <div
                          key={producto.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${
                            estaBloqueado
                              ? 'border-red-600 bg-red-100'
                              : estaCompleto
                              ? esCorrectoCalculo
                                ? 'border-green-500 bg-green-50'
                                : 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-[#9c7561]'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center">
                              {producto.nombre}
                              {estaBloqueado && (
                                <Shield className="w-4 h-4 ml-2 text-red-600" />
                              )}
                            </h4>
                            {/* 🚫 ELIMINADO: El span que muestra "Stock teórico" */}
                            
                            {/* 🆕 MOSTRAR INTENTOS RESTANTES */}
                            {!estaBloqueado && intentosRealizados > 0 && (
                              <div className="text-xs text-orange-600">
                                Intentos: {intentosRealizados}/{MAX_INTENTOS_POR_PRODUCTO} • Quedan: {intentosRestantes}
                              </div>
                            )}
                            
                            {estaBloqueado && (
                              <div className="text-xs text-red-700 font-medium">
                                🔒 BLOQUEADO - Excedió {MAX_INTENTOS_POR_PRODUCTO} intentos
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                Stock contado:
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={stockFisico !== undefined ? stockFisico : ''}
                                onChange={(e) => handleStockChange(producto.id, e.target.value)}
                                disabled={estaBloqueado} // 🆕 DESHABILITAR INPUT SI ESTÁ BLOQUEADO
                                placeholder="0"
                                className={`w-24 p-2 text-center font-semibold border-2 rounded-lg transition-all ${
                                  estaBloqueado
                                    ? 'border-red-500 bg-red-100 cursor-not-allowed text-red-800'
                                    : estaCompleto
                                    ? esCorrectoCalculo
                                      ? 'border-green-500 bg-green-50 text-green-900'
                                      : 'border-red-500 bg-red-50 text-red-900'
                                    : intentosRealizados > 0
                                    ? 'border-orange-400 bg-orange-50 focus:border-orange-500 focus:ring-2 focus:ring-orange-500 focus:ring-opacity-50'
                                    : 'border-gray-300 focus:border-[#9c7561] focus:ring-2 focus:ring-[#9c7561] focus:ring-opacity-50'
                                }`}
                              />
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              {estaBloqueado ? (
                                <div className="flex items-center text-red-700">
                                  <Shield className="w-5 h-5 mr-1" />
                                  <span className="text-sm font-medium">Bloqueado</span>
                                </div>
                              ) : estaCompleto ? (
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
                                title={estaBloqueado ? "Reiniciar producto bloqueado" : "Limpiar"}
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

        {/* Footer con observaciones y finalizar - MODIFICADO */}
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
              
              {/* 🆕 INFORMACIÓN ADICIONAL SOBRE PRODUCTOS BLOQUEADOS */}
              {blockedProducts.size > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-red-800 font-medium">Productos Bloqueados</h4>
                      <p className="text-red-700 text-sm mt-1">
                        {blockedProducts.size} producto(s) fueron bloqueado(s) automáticamente por exceder {MAX_INTENTOS_POR_PRODUCTO} intentos de conteo. 
                        Se generará una contingencia que incluirá estos productos para revisión administrativa.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  💡 Esta conciliación afectará únicamente la categoría <strong>{categoriaActiva?.nombre}</strong>
                  {blockedProducts.size > 0 && (
                    <span className="text-red-600 block mt-1">
                      ⚠️ {blockedProducts.size} producto(s) bloqueado(s) serán incluidos en contingencia
                    </span>
                  )}
                </div>
                <button
                  onClick={handleValidateAndSave}
                  disabled={isSaving || (progreso.completados === 0 && blockedProducts.size === 0)}
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

      {/* Modal de alerta (mantener igual) */}
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
            {alert.tipo === 'error' ? (
              <Shield className="w-8 h-8 text-red-600" />
            ) : (
              <AlertTriangle className="w-8 h-8 text-amber-600" />
            )}
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