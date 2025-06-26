// src/app/(pdv)/pdv/conciliacion/page.tsx - VISTA MEJORADA POR CATEGORÍAS
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, Check, X, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, ChevronLeft, ChevronRight,
  Hash, ScanLine, Grid, List, Filter, Tags
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
  
  // 🆕 NUEVOS ESTADOS PARA CATEGORÍAS
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'all'>('category');
  const [completedProducts, setCompletedProducts] = useState<Set<string>>(new Set());
  const [hasContingenciasPendientes, setHasContingenciasPendientes] = useState(false);
  const [contingenciasPendientes, setContingenciasPendientes] = useState<any[]>([]);
  
  const [showAlert, setShowAlert] = useState<{
    show: boolean;
    tipo: 'warning' | 'error';
    titulo: string;
    mensaje: string;
    productosConError: string[];
    intentosRestantes: number;
  } | null>(null);

  // Verificar contingencias pendientes
  useEffect(() => {
    verificarContingenciasPendientes();
  }, []);

  useEffect(() => {
    if (!hasContingenciasPendientes) {
      loadConciliacion();
    }
  }, [hasContingenciasPendientes]);

const loadConciliacion = useCallback(async () => {
  try {
    setIsLoading(true);
    setError(null);
    
    const sucursalId = localStorage.getItem('sucursalId');
    if (!sucursalId) {
      throw new Error('No se ha definido una sucursal para este punto de venta');
    }
    
    console.log(`[Conciliación] 🏪 Iniciando carga para sucursal: ${sucursalId}`);
    console.log(`[Conciliación] 📱 URL: ${window.location.origin}/api/pdv/conciliacion?sucursalId=${encodeURIComponent(sucursalId)}`);
    
    // PASO 1: Intentar obtener conciliación existente
    console.log(`[Conciliación] 📡 Enviando petición GET...`);
    let response = await authenticatedFetch(`/api/pdv/conciliacion?sucursalId=${encodeURIComponent(sucursalId)}`);
    
    console.log(`[Conciliación] 📊 Respuesta recibida - Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch((jsonError) => {
        console.error('[Conciliación] ❌ Error parseando JSON de error:', jsonError);
        return { error: `Error HTTP ${response.status}: ${response.statusText}` };
      });
      
      console.log(`[Conciliación] 📋 Datos de error:`, errorData);
      
      if (response.status === 404) {
        console.log('[Conciliación] 🆕 No hay conciliación activa, creando nueva...');
        
        const createResponse = await authenticatedFetch('/api/pdv/conciliacion', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ sucursalId })
        });
        
        console.log(`[Conciliación] 🏗️ Respuesta de creación - Status: ${createResponse.status}`);
        
        if (!createResponse.ok) {
          const createErrorData = await createResponse.json().catch(() => ({}));
          console.error('[Conciliación] ❌ Error creando conciliación:', createErrorData);
          throw new Error(createErrorData.error || `Error HTTP ${createResponse.status} al crear conciliación`);
        }
        
        response = createResponse;
        console.log('[Conciliación] ✅ Conciliación creada exitosamente');
      } 
      else if (response.status === 409) {
        console.log('[Conciliación] 🚫 Contingencias detectadas:', errorData);
        setHasContingenciasPendientes(true);
        setContingenciasPendientes(errorData.contingencias || []);
        return;
      }
      else {
        console.error(`[Conciliación] ❌ Error HTTP ${response.status}:`, errorData);
        throw new Error(errorData.error || `Error del servidor (${response.status}): ${errorData.message || 'Error desconocido'}`);
      }
    }
    
    // PASO 2: Procesar datos de respuesta
    console.log('[Conciliación] 📦 Procesando datos de respuesta...');
    const data = await response.json().catch((jsonError) => {
      console.error('[Conciliación] ❌ Error parseando JSON de respuesta:', jsonError);
      throw new Error('Error al procesar la respuesta del servidor - JSON inválido');
    });
    
    console.log('[Conciliación] 📊 Datos recibidos:', {
      id: data.id,
      estado: data.estado,
      productosCount: data.productos?.length || 0,
      hasProductos: Array.isArray(data.productos),
      keys: Object.keys(data)
    });
    
    // PASO 3: Validar estructura de datos
    if (!data.id) {
      console.error('[Conciliación] ❌ Datos incompletos - falta ID:', data);
      throw new Error('Respuesta del servidor incompleta: falta ID de conciliación');
    }
    
    if (!Array.isArray(data.productos)) {
      console.error('[Conciliación] ❌ Datos incompletos - productos no es array:', data.productos);
      throw new Error('Respuesta del servidor incompleta: lista de productos inválida');
    }
    
    if (data.productos.length === 0) {
      console.warn('[Conciliación] ⚠️ No hay productos para conciliar en esta sucursal');
    }
    
    // PASO 4: Formatear datos de conciliación
    console.log('[Conciliación] 🔄 Formateando datos...');
    const conciliacionFormateada: Conciliacion = {
      id: data.id,
      fecha: data.fecha,
      estado: data.estado || 'pendiente',
      intentosGlobales: 0,
      productos: data.productos.map((p: any, index: number) => {
        if (!p.id || !p.nombre) {
          console.warn(`[Conciliación] ⚠️ Producto ${index} tiene datos incompletos:`, p);
        }
        
        return {
          id: p.id || `producto-${index}`,
          nombre: p.nombre || 'Producto sin nombre',
          stockTeorico: typeof p.stockTeorico === 'number' ? p.stockTeorico : 0,
          stockFisico: p.stockFisico,
          diferencia: p.diferencia || 0,
          conteoIntentos: 0,
          completado: p.stockFisico !== null && p.stockFisico !== undefined,
          categoriaId: p.categoriaId || 'sin-categoria',
          categoria: p.categoria || { id: 'sin-categoria', nombre: 'Sin categoría' }
        };
      })
    };
    
    setConciliacion(conciliacionFormateada);
    console.log(`[Conciliación] ✅ Conciliación cargada: ${conciliacionFormateada.productos.length} productos`);
    
    // PASO 5: Procesar categorías
    console.log('[Conciliación] 🏷️ Procesando categorías...');
    const categoriasMap = new Map<string, Categoria>();
    
    conciliacionFormateada.productos.forEach((producto, index) => {
      try {
        const catId = producto.categoria?.id || 'sin-categoria';
        const catNombre = producto.categoria?.nombre || 'Sin categoría';
        
        if (!categoriasMap.has(catId)) {
          categoriasMap.set(catId, {
            id: catId,
            nombre: catNombre,
            productCount: 0,
            completedCount: 0,
            hasErrors: false
          });
        }
        
        const categoria = categoriasMap.get(catId)!;
        categoria.productCount++;
        
        if (producto.completado) {
          categoria.completedCount++;
        }
      } catch (categoriaError) {
        console.error(`[Conciliación] ❌ Error procesando categoría del producto ${index}:`, categoriaError);
      }
    });
    
    const categoriasArray = Array.from(categoriasMap.values()).sort((a, b) => 
      a.nombre.localeCompare(b.nombre)
    );
    
    setCategorias(categoriasArray);
    console.log(`[Conciliación] 🏷️ Categorías procesadas: ${categoriasArray.length}`);
    
    // Seleccionar primera categoría por defecto
    if (categoriasArray.length > 0 && !activeCategoryId) {
      setActiveCategoryId(categoriasArray[0].id);
      console.log(`[Conciliación] 🎯 Categoría activa por defecto: ${categoriasArray[0].nombre}`);
    }
    
    // PASO 6: Inicializar conteos
    console.log('[Conciliación] 🔢 Inicializando conteos...');
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
    
    console.log(`[Conciliación] ✅ Carga completada exitosamente`);
    console.log(`[Conciliación] 📊 Resumen: ${conciliacionFormateada.productos.length} productos, ${categoriasArray.length} categorías, ${completed.size} completados`);
    
  } catch (err) {
    console.error('[Conciliación] ❌ Error completo en carga:', err);
    console.error('[Conciliación] 📍 Stack trace:', err instanceof Error ? err.stack : 'No stack trace');
    
    let errorMessage = 'Error desconocido al cargar datos de conciliación';
    
    if (err instanceof Error) {
      errorMessage = err.message;
      
      // Mensajes de error más específicos
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        errorMessage = 'Error de conexión. Verifique su conexión a internet e intente nuevamente.';
      } else if (err.message.includes('401') || err.message.includes('unauthorized')) {
        errorMessage = 'Su sesión ha expirado. Por favor, inicie sesión nuevamente.';
      } else if (err.message.includes('403') || err.message.includes('forbidden')) {
        errorMessage = 'No tiene permisos para realizar esta acción.';
      } else if (err.message.includes('500')) {
        errorMessage = 'Error interno del servidor. Contacte al administrador del sistema.';
      }
    }
    
    setError(errorMessage);
    
    // En desarrollo, mostrar detalles adicionales
    if (process.env.NODE_ENV === 'development') {
      console.group('[Conciliación] 🔧 Debug Info');
      console.log('Error original:', err);
      console.log('User Agent:', navigator.userAgent);
      console.log('URL actual:', window.location.href);
      console.log('Sucursal ID:', localStorage.getItem('sucursalId'));
      console.log('Tokens disponibles:', {
        accessToken: !!localStorage.getItem('accessToken'),
        refreshToken: !!localStorage.getItem('refreshToken')
      });
      console.groupEnd();
    }
    
  } finally {
    setIsLoading(false);
  }
}, []); // Sin dependencias para evitar loops infinitos

// También agregar esta función mejorada para verificar contingencias:
const verificarContingenciasPendientes = useCallback(async () => {
  try {
    const sucursalId = localStorage.getItem('sucursalId');
    if (!sucursalId) return;

    console.log('[Conciliación] 🔍 Verificando contingencias para sucursal:', sucursalId);

    const response = await authenticatedFetch(
      `/api/contingencias?origen=sucursal&estado=pendiente&ubicacionId=${encodeURIComponent(sucursalId)}&tipo=conciliacion`
    );

    if (response.ok) {
      const contingencias = await response.json();
      const contingenciasConciliacion = contingencias.filter((c: any) => 
        (c.tipo === 'conciliacion' || c.tipo === 'conciliacion_general') && 
        (c.estado === 'pendiente' || c.estado === 'en_revision')
      );

      console.log('[Conciliación] 📋 Contingencias encontradas:', contingenciasConciliacion.length);

      if (contingenciasConciliacion.length > 0) {
        setHasContingenciasPendientes(true);
        setContingenciasPendientes(contingenciasConciliacion);
        console.log('[Conciliación] 🚫 Conciliación bloqueada por contingencias');
      } else {
        setHasContingenciasPendientes(false);
        setContingenciasPendientes([]);
        console.log('[Conciliación] ✅ No hay contingencias bloqueantes');
      }
    } else {
      console.warn('[Conciliación] ⚠️ Error al verificar contingencias:', response.status);
      // No bloquear la aplicación por error en verificación de contingencias
    }
  } catch (error) {
    console.error('[Conciliación] ❌ Error verificando contingencias:', error);
    // No bloquear la aplicación por error en verificación de contingencias
  }
}, []);

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
    
    // 🆕 ACTUALIZAR ESTADÍSTICAS DE CATEGORÍA
    actualizarEstadisticasCategorias();
  };

  const actualizarEstadisticasCategorias = () => {
    if (!conciliacion) return;
    
    const categoriasActualizadas = categorias.map(categoria => {
      const productosCategoria = conciliacion.productos.filter(p => p.categoriaId === categoria.id);
      const completados = productosCategoria.filter(p => completedProducts.has(p.id));
      const conErrores = productosCategoria.some(p => {
        const stockFisico = stockCounts[p.id];
        return stockFisico !== undefined && !isProductCorrect(p.id, stockFisico);
      });
      
      return {
        ...categoria,
        completedCount: completados.length,
        hasErrors: conErrores
      };
    });
    
    setCategorias(categoriasActualizadas);
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
    
    actualizarEstadisticasCategorias();
  };

  // Filtrar productos por categoría activa
  const productosFiltrados = conciliacion?.productos.filter(producto => {
    const matchesCategory = activeCategoryId ? producto.categoriaId === activeCategoryId : true;
    const matchesSearch = searchTerm ? 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesCategory && matchesSearch;
  }) || [];

  // Progreso general
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
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#311716] flex items-center">
                <BarChart className="mr-3 h-7 w-7 text-[#9c7561]" />
                Conteo de Inventario por Categorías
              </h1>
              <p className="text-gray-600 mt-1">
                Navega por categorías y registra la cantidad exacta que encuentras físicamente
              </p>
            </div>
            
            {/* Progreso prominente */}
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

          {/* Controles de vista */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('category')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'category' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Tags className="w-4 h-4 mr-1 inline" />
                  Por Categoría
                </button>
                <button
                  onClick={() => setViewMode('all')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    viewMode === 'all' 
                      ? 'bg-white text-[#311716] shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <List className="w-4 h-4 mr-1 inline" />
                  Vista Completa
                </button>
              </div>
            </div>
            
            {/* Buscador */}
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

      <div className="max-w-7xl mx-auto p-6">
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

        <div className="flex gap-6">
          {/* 🆕 PANEL DE CATEGORÍAS */}
          {viewMode === 'category' && (
            <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Tags className="w-5 h-5 mr-2 text-[#9c7561]" />
                Categorías
              </h3>
              
              <div className="space-y-2">
                {categorias.map(categoria => (
                  <button
                    key={categoria.id}
                    onClick={() => setActiveCategoryId(categoria.id)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      activeCategoryId === categoria.id
                        ? 'border-[#311716] bg-[#311716]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-900">{categoria.nombre}</span>
                      {categoria.hasErrors && (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">
                        {categoria.completedCount}/{categoria.productCount} productos
                      </span>
                      
                      <div className="flex items-center space-x-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full transition-all ${
                              categoria.completedCount === categoria.productCount
                                ? 'bg-green-500'
                                : categoria.hasErrors
                                ? 'bg-amber-500'
                                : 'bg-blue-500'
                            }`}
                            style={{ 
                              width: `${(categoria.completedCount / categoria.productCount) * 100}%` 
                            }}
                          />
                        </div>
                        
                        {categoria.completedCount === categoria.productCount && !categoria.hasErrors && (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* PANEL PRINCIPAL DE PRODUCTOS */}
          <div className="flex-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {viewMode === 'category' && activeCategoryId
                    ? categorias.find(c => c.id === activeCategoryId)?.nombre || 'Productos'
                    : 'Todos los Productos'
                  }
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
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {viewMode === 'all' && (
                              <span className="px-2 py-1 bg-gray-100 rounded-full text-xs">
                                {producto.categoria.nombre}
                              </span>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          {/* Input de cantidad */}
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
                          
                          {/* Estado visual */}
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
                                  <span className="text-sm font-medium">Revisar</span>
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
                  <p>No hay productos en esta categoría</p>
                </div>
              )}
            </div>
          </div>
        </div>

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