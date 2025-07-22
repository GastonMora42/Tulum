// src/app/(pdv)/pdv/conciliacion/page.tsx - VERSIÓN PROFESIONAL MEJORADA
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, Save, Loader, Search, 
  Package, Check, X, RotateCcw, AlertCircle, 
  Clock, Target, TrendingUp, ChevronLeft, ChevronRight,
  Hash, ScanLine, Grid, List, Filter, Tags, Lock, Shield,
  Edit3, PlayCircle, PauseCircle, XCircle
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface ProductoConciliacion {
  id: string;
  nombre: string;
  stockTeorico: number;
  stockFisico: number | null;
  diferencia: number;
  categoriaId: string;
  categoria: {
    id: string;
    nombre: string;
  };
  // Estados mejorados para manejo profesional
  estado: 'pendiente' | 'editando' | 'confirmado' | 'bloqueado';
  intentosUsados: number;
  valorTemporal: string; // Valor que se está editando
  ultimaConfirmacion?: Date;
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
  productos: ProductoConciliacion[];
}

const MAX_INTENTOS_POR_PRODUCTO = 3;
const MAX_INTENTOS_GLOBAL = 3;

export default function ConciliacionPage() {
  const [conciliacion, setConciliacion] = useState<Conciliacion | null>(null);
  const [observaciones, setObservaciones] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Estados para categorías
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'category' | 'all'>('category');
  const [categoriasBloquedas, setCategoriasBloquedas] = useState<Set<string>>(new Set());
  
  // 🆕 ESTADOS MEJORADOS PARA MANEJO PROFESIONAL
  const [productosEditando, setProductosEditando] = useState<Set<string>>(new Set());
  const [valoresTempo, setValoresTempo] = useState<Record<string, string>>({});
  const [productosConfirmados, setProductosConfirmados] = useState<Set<string>>(new Set());
  const [productosBloquedos, setProductosBloquedos] = useState<Set<string>>(new Set());
  const [intentosPorProducto, setIntentosPorProducto] = useState<Record<string, number>>({});
  
  const [showAlert, setShowAlert] = useState<{
    show: boolean;
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    mensaje: string;
    productosAfectados: string[];
    intentosRestantes?: number;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Refs para manejo de inputs
  const inputRefs = useRef<Record<string, HTMLInputElement>>({});

  // 🆕 FUNCIÓN PROFESIONAL PARA INICIAR EDICIÓN
  const iniciarEdicionProducto = useCallback((productoId: string) => {
    // Verificar si el producto está bloqueado
    if (productosBloquedos.has(productoId)) {
      setShowAlert({
        show: true,
        tipo: 'error',
        titulo: '🔒 Producto Bloqueado',
        mensaje: 'Este producto ha sido bloqueado por exceder el número máximo de intentos.',
        productosAfectados: [conciliacion?.productos.find(p => p.id === productoId)?.nombre || 'Producto'],
        onConfirm: () => setShowAlert(null)
      });
      return;
    }

    // Marcar producto en edición
    setProductosEditando(prev => new Set([...prev, productoId]));
    
    // Inicializar valor temporal con el valor actual o vacío
    const producto = conciliacion?.productos.find(p => p.id === productoId);
    const valorActual = producto?.stockFisico?.toString() || '';
    setValoresTempo(prev => ({
      ...prev,
      [productoId]: valorActual
    }));

    // Enfocar el input después de un pequeño delay
    setTimeout(() => {
      const input = inputRefs.current[productoId];
      if (input) {
        input.focus();
        input.select();
      }
    }, 100);
  }, [conciliacion, productosBloquedos]);

  // 🆕 FUNCIÓN PROFESIONAL PARA CANCELAR EDICIÓN
  const cancelarEdicionProducto = useCallback((productoId: string) => {
    setProductosEditando(prev => {
      const newSet = new Set(prev);
      newSet.delete(productoId);
      return newSet;
    });
    
    // Limpiar valor temporal
    setValoresTempo(prev => {
      const newValues = { ...prev };
      delete newValues[productoId];
      return newValues;
    });
  }, []);

  // 🆕 FUNCIÓN PROFESIONAL PARA CONFIRMAR VALOR
  const confirmarValorProducto = useCallback((productoId: string) => {
    const valorTemporal = valoresTempo[productoId];
    
    if (valorTemporal === undefined || valorTemporal === '') {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: '⚠️ Valor Requerido',
        mensaje: 'Debe ingresar un valor antes de confirmar.',
        productosAfectados: [],
        onConfirm: () => setShowAlert(null)
      });
      return;
    }

    const cantidad = parseInt(valorTemporal);
    if (isNaN(cantidad) || cantidad < 0) {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: '⚠️ Valor Inválido',
        mensaje: 'El valor debe ser un número entero positivo.',
        productosAfectados: [],
        onConfirm: () => setShowAlert(null)
      });
      return;
    }

    // 🔥 INCREMENTAR INTENTOS SOLO AL CONFIRMAR
    const intentosActuales = intentosPorProducto[productoId] || 0;
    const nuevosIntentos = intentosActuales + 1;
    
    console.log(`[CONCILIACIÓN] 📊 Confirmando producto ${productoId}: Intento ${nuevosIntentos}/${MAX_INTENTOS_POR_PRODUCTO}`);

    // Actualizar intentos
    setIntentosPorProducto(prev => ({
      ...prev,
      [productoId]: nuevosIntentos
    }));

    // Actualizar producto en conciliación
    setConciliacion(prev => prev ? {
      ...prev,
      productos: prev.productos.map(p => 
        p.id === productoId 
          ? { 
              ...p, 
              stockFisico: cantidad,
              diferencia: cantidad - p.stockTeorico,
              estado: 'confirmado' as const,
              intentosUsados: nuevosIntentos,
              ultimaConfirmacion: new Date()
            }
          : p
      )
    } : null);

    // Marcar como confirmado
    setProductosConfirmados(prev => new Set([...prev, productoId]));
    
    // Quitar de edición
    setProductosEditando(prev => {
      const newSet = new Set(prev);
      newSet.delete(productoId);
      return newSet;
    });

    // Limpiar valor temporal
    setValoresTempo(prev => {
      const newValues = { ...prev };
      delete newValues[productoId];
      return newValues;
    });

    // 🔥 VERIFICAR SI DEBE BLOQUEARSE
    if (nuevosIntentos >= MAX_INTENTOS_POR_PRODUCTO) {
      console.log(`[CONCILIACIÓN] 🔒 Bloqueando producto ${productoId} por exceder ${MAX_INTENTOS_POR_PRODUCTO} intentos`);
      
      setProductosBloquedos(prev => new Set([...prev, productoId]));
      
      // Actualizar estado del producto
      setConciliacion(prev => prev ? {
        ...prev,
        productos: prev.productos.map(p => 
          p.id === productoId 
            ? { ...p, estado: 'bloqueado' as const }
            : p
        )
      } : null);

      const nombreProducto = conciliacion?.productos.find(p => p.id === productoId)?.nombre;
      
      setShowAlert({
        show: true,
        tipo: 'error',
        titulo: '🔒 Producto Bloqueado Automáticamente',
        mensaje: `El producto "${nombreProducto}" ha sido bloqueado después de ${MAX_INTENTOS_POR_PRODUCTO} intentos. Se mantendrá el último valor confirmado.`,
        productosAfectados: [nombreProducto || 'Producto'],
        onConfirm: () => setShowAlert(null)
      });
    }
  }, [valoresTempo, intentosPorProducto, conciliacion]);

  // 🆕 FUNCIÓN PARA MANEJAR CAMBIOS EN INPUT (SIN CONTAR INTENTOS)
  const handleInputChange = useCallback((productoId: string, value: string) => {
    // Solo actualizar el valor temporal, NO contar como intento
    setValoresTempo(prev => ({
      ...prev,
      [productoId]: value
    }));
  }, []);

  // 🆕 FUNCIÓN PARA MANEJAR ENTER O BLUR
  const handleInputKeyPress = useCallback((productoId: string, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      confirmarValorProducto(productoId);
    } else if (event.key === 'Escape') {
      cancelarEdicionProducto(productoId);
    }
  }, [confirmarValorProducto, cancelarEdicionProducto]);

  // 🆕 FUNCIÓN PARA REINICIAR PRODUCTO (SOLO ADMIN)
  const reiniciarProducto = useCallback((productoId: string) => {
    setShowAlert({
      show: true,
      tipo: 'warning',
      titulo: '🔄 Reiniciar Producto',
      mensaje: '¿Está seguro de que desea reiniciar este producto? Se perderán todos los intentos realizados.',
      productosAfectados: [conciliacion?.productos.find(p => p.id === productoId)?.nombre || 'Producto'],
      onConfirm: () => {
        // Reiniciar todo el estado del producto
        setIntentosPorProducto(prev => {
          const newAttempts = { ...prev };
          delete newAttempts[productoId];
          return newAttempts;
        });
        
        setProductosBloquedos(prev => {
          const newSet = new Set(prev);
          newSet.delete(productoId);
          return newSet;
        });
        
        setProductosConfirmados(prev => {
          const newSet = new Set(prev);
          newSet.delete(productoId);
          return newSet;
        });
        
        setProductosEditando(prev => {
          const newSet = new Set(prev);
          newSet.delete(productoId);
          return newSet;
        });
        
        setValoresTempo(prev => {
          const newValues = { ...prev };
          delete newValues[productoId];
          return newValues;
        });
        
        // Actualizar conciliación
        setConciliacion(prev => prev ? {
          ...prev,
          productos: prev.productos.map(p => 
            p.id === productoId 
              ? { 
                  ...p, 
                  stockFisico: null,
                  diferencia: 0,
                  estado: 'pendiente' as const,
                  intentosUsados: 0,
                  ultimaConfirmacion: undefined
                }
              : p
          )
        } : null);
        
        console.log(`[CONCILIACIÓN] 🔄 Producto ${productoId} reiniciado completamente`);
        setShowAlert(null);
      },
      onCancel: () => setShowAlert(null)
    });
  }, [conciliacion]);

  // Función para obtener el estado visual del producto
  const getProductoEstado = useCallback((producto: ProductoConciliacion) => {
    const productoId = producto.id;
    
    if (productosBloquedos.has(productoId)) {
      return {
        estado: 'bloqueado' as const,
        color: 'border-red-600 bg-red-100',
        icon: <Shield className="w-5 h-5 text-red-600" />,
        label: 'Bloqueado',
        intentos: intentosPorProducto[productoId] || 0
      };
    }
    
    if (productosEditando.has(productoId)) {
      return {
        estado: 'editando' as const,
        color: 'border-blue-500 bg-blue-50',
        icon: <Edit3 className="w-5 h-5 text-blue-600" />,
        label: 'Editando',
        intentos: intentosPorProducto[productoId] || 0
      };
    }
    
    if (productosConfirmados.has(productoId)) {
      const esCorrectoCalculo = producto.stockFisico === producto.stockTeorico;
      return {
        estado: 'confirmado' as const,
        color: esCorrectoCalculo ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50',
        icon: esCorrectoCalculo ? <CheckCircle className="w-5 h-5 text-green-700" /> : <AlertCircle className="w-5 h-5 text-red-700" />,
        label: esCorrectoCalculo ? 'Correcto' : 'Con Diferencia',
        intentos: intentosPorProducto[productoId] || 0
      };
    }
    
    return {
      estado: 'pendiente' as const,
      color: 'border-gray-300 hover:border-gray-400',
      icon: <Clock className="w-5 h-5 text-gray-500" />,
      label: 'Pendiente',
      intentos: intentosPorProducto[productoId] || 0
    };
  }, [productosBloquedos, productosEditando, productosConfirmados, intentosPorProducto]);

  // Verificar estado de categorías (función existente - sin cambios)
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

  // Cargar conciliación específica de una categoría (función existente pero adaptada)
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
      
      // 🆕 FORMATEAR DATOS CON NUEVOS ESTADOS
      const conciliacionFormateada: Conciliacion = {
        id: data.id,
        fecha: data.fecha,
        estado: data.estado || 'pendiente',
        productos: data.productos.map((p: any) => ({
          id: p.id,
          nombre: p.nombre,
          stockTeorico: p.stockTeorico,
          stockFisico: p.stockFisico,
          diferencia: p.diferencia || 0,
          categoriaId: p.categoriaId,
          categoria: p.categoria,
          estado: p.stockFisico !== null && p.stockFisico !== undefined ? 'confirmado' : 'pendiente',
          intentosUsados: 0,
          valorTemporal: ''
        }))
      };
      
      setConciliacion(conciliacionFormateada);
      
      // 🆕 INICIALIZAR ESTADOS MEJORADOS
      const confirmed = new Set<string>();
      const attempts: Record<string, number> = {};
      
      conciliacionFormateada.productos.forEach(producto => {
        if (producto.stockFisico !== null && producto.stockFisico !== undefined) {
          confirmed.add(producto.id);
        }
        attempts[producto.id] = 0;
      });
      
      setProductosConfirmados(confirmed);
      setIntentosPorProducto(attempts);
      setProductosBloquedos(new Set());
      setProductosEditando(new Set());
      setValoresTempo({});
      
      console.log(`[Conciliación] ✅ Conciliación cargada: ${conciliacionFormateada.productos.length} productos`);
      
    } catch (err) {
      console.error('[Conciliación] ❌ Error cargando conciliación:', err);
      setError(err instanceof Error ? err.message : 'Error al cargar conciliación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Manejar cambio de categoría activa (función existente - sin cambios)
  const handleCategoriaChange = useCallback(async (categoriaId: string) => {
    if (categoriasBloquedas.has(categoriaId)) {
      const categoria = categorias.find(c => c.id === categoriaId);
      setError(`🔒 La categoría "${categoria?.nombre || 'seleccionada'}" está bloqueada por contingencias pendientes.`);
      return;
    }
    
    setActiveCategoryId(categoriaId);
    setError(null);
    setConciliacion(null);
    
    // 🆕 LIMPIAR TODOS LOS ESTADOS AL CAMBIAR CATEGORÍA
    setProductosConfirmados(new Set());
    setProductosBloquedos(new Set());
    setProductosEditando(new Set());
    setValoresTempo({});
    setIntentosPorProducto({});
    
    await loadConciliacionCategoria(categoriaId);
  }, [categoriasBloquedas, categorias, loadConciliacionCategoria]);

  // Función de validación y guardado (adaptada)
  const handleValidateAndSave = async () => {
    if (!conciliacion || !activeCategoryId) return;
    
    // Verificar que no hay productos en edición
    if (productosEditando.size > 0) {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: '⚠️ Productos en Edición',
        mensaje: `Hay ${productosEditando.size} producto(s) en edición. Debe confirmar o cancelar la edición antes de finalizar.`,
        productosAfectados: Array.from(productosEditando).map(id => 
          conciliacion.productos.find(p => p.id === id)?.nombre || 'Producto'
        ),
        onConfirm: () => setShowAlert(null)
      });
      return;
    }
    
    const productosIncompletos = conciliacion.productos.filter(p => 
      !productosBloquedos.has(p.id) && !productosConfirmados.has(p.id)
    );
    
    if (productosIncompletos.length > 0) {
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: '⚠️ Conteo Incompleto',
        mensaje: `Faltan ${productosIncompletos.length} productos por confirmar.`,
        productosAfectados: productosIncompletos.map(p => p.nombre),
        onConfirm: () => setShowAlert(null)
      });
      return;
    }
    
    const hayDiferencias = conciliacion.productos.some(p => {
      return p.stockFisico !== p.stockTeorico;
    });
    
    const productosBloquados = Array.from(productosBloquedos);
    
    if ((hayDiferencias || productosBloquados.length > 0)) {
      let mensaje = 'Se encontraron diferencias en algunos productos de esta categoría.';
      if (productosBloquados.length > 0) {
        mensaje += ` ${productosBloquados.length} producto(s) fueron bloqueado(s) por exceder ${MAX_INTENTOS_POR_PRODUCTO} intentos.`;
      }
      
      setShowAlert({
        show: true,
        tipo: 'warning',
        titulo: '⚠️ Diferencias y/o Productos Bloqueados',
        mensaje,
        productosAfectados: conciliacion.productos
          .filter(p => productosBloquados.includes(p.id) || p.stockFisico !== p.stockTeorico)
          .map(p => p.nombre),
        onConfirm: () => finalizarConciliacion(true),
        onCancel: () => setShowAlert(null)
      });
    } else {
      await finalizarConciliacion(false);
    }
  };

  // Función para finalizar conciliación (adaptada)
  const finalizarConciliacion = async (generarContingencia: boolean = false) => {
    if (!conciliacion || !activeCategoryId) return;
    
    setIsSaving(true);
    
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        throw new Error('No se ha definido una sucursal');
      }
      
      // Preparar datos para envío
      const productos = conciliacion.productos.map(producto => ({
        productoId: producto.id,
        stockTeorico: producto.stockTeorico,
        stockFisico: producto.stockFisico || 0,
        bloqueadoPorIntentos: productosBloquedos.has(producto.id),
        intentosRealizados: intentosPorProducto[producto.id] || 0
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
          productosBloquados: Array.from(productosBloquedos)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar conciliación');
      }
      
      const result = await response.json();
      
      let mensaje = '¡Conciliación de categoría completada exitosamente!';
      if (result.hayDiferencias || generarContingencia) {
        mensaje = 'Conciliación completada con diferencias. Se generó una contingencia para revisión.';
        if (productosBloquedos.size > 0) {
          mensaje += ` ${productosBloquedos.size} producto(s) fueron bloqueado(s).`;
        }
      }
      
      setSuccessMessage(mensaje);
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

  // Filtrar productos por búsqueda
  const productosFiltrados = conciliacion?.productos.filter(producto => {
    const matchesSearch = searchTerm ? 
      producto.nombre.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesSearch;
  }) || [];

  // Progreso de la categoría actual
  const progreso = {
    completados: productosConfirmados.size,
    total: conciliacion?.productos.length || 0,
    bloqueados: productosBloquedos.size,
    editando: productosEditando.size
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
      {/* Header mejorado */}
      <div className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[#311716] flex items-center">
                <BarChart className="mr-3 h-7 w-7 text-[#9c7561]" />
                Conciliación Profesional por Categorías
              </h1>
              <p className="text-gray-600 mt-1">
                {activeCategoryId 
                  ? `Conciliando: ${categoriaActiva?.nombre || 'Categoría'} • Sistema de ${MAX_INTENTOS_POR_PRODUCTO} intentos por producto`
                  : 'Selecciona una categoría para iniciar conciliación individual'
                }
              </p>
            </div>
            
            {/* Progreso mejorado */}
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
                  {progreso.editando > 0 && (
                    <>
                      <div className="text-gray-400 text-lg">•</div>
                      <div className="flex items-center text-blue-600">
                        <Edit3 className="w-4 h-4 mr-1" />
                        <span className="text-sm font-medium">{progreso.editando} editando</span>
                      </div>
                    </>
                  )}
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
                  {progreso.completados === progreso.total ? '¡Completado!' : 'En progreso'}
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
              <AlertTriangle className="h-5 w-5 text-red-500 mr-2 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">{error}</p>
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
          {/* Panel de categorías (sin cambios en estructura) */}
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
          </div>

          {/* PANEL PRINCIPAL DE PRODUCTOS - COMPLETAMENTE RENOVADO */}
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
              </div>
            ) : conciliacion ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-gray-900">
                    Productos de {categoriaActiva?.nombre}
                  </h3>
                  
                  <div className="text-sm text-gray-600">
                    {productosFiltrados.length} productos
                    {progreso.bloqueados > 0 && (
                      <span className="text-red-600 ml-2">• {progreso.bloqueados} bloqueados</span>
                    )}
                  </div>
                </div>
                
                {productosFiltrados.length > 0 ? (
                  <div className="space-y-4">
                    {productosFiltrados.map(producto => {
                      const estadoProducto = getProductoEstado(producto);
                      const estaEditando = productosEditando.has(producto.id);
                      const valorActual = estaEditando 
                        ? valoresTempo[producto.id] || ''
                        : producto.stockFisico?.toString() || '';
                      const intentosRestantes = MAX_INTENTOS_POR_PRODUCTO - estadoProducto.intentos;

                      return (
                        <div
                          key={producto.id}
                          className={`flex items-center justify-between p-4 rounded-lg border-2 transition-all ${estadoProducto.color}`}
                        >
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-gray-900 mb-1 flex items-center">
                              {producto.nombre}
                              <span className="ml-2">{estadoProducto.icon}</span>
                            </h4>
                            
                            <div className="flex items-center space-x-4 text-sm text-gray-600">
                              {estadoProducto.intentos > 0 && (
                                <span className={`px-2 py-1 rounded text-xs font-medium ${
                                  intentosRestantes > 1 
                                    ? 'bg-yellow-100 text-yellow-800' 
                                    : intentosRestantes === 1
                                    ? 'bg-orange-100 text-orange-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {intentosRestantes > 0 
                                    ? `${intentosRestantes} intento(s) restante(s)`
                                    : 'Sin intentos'
                                  }
                                </span>
                              )}
                              
                              <span className={`px-2 py-1 rounded text-xs font-medium ${
                                estadoProducto.estado === 'bloqueado' ? 'bg-red-100 text-red-800' :
                                estadoProducto.estado === 'editando' ? 'bg-blue-100 text-blue-800' :
                                estadoProducto.estado === 'confirmado' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {estadoProducto.label}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-3">
                            {/* Input de cantidad */}
                            <div className="flex items-center space-x-2">
                              <label className="text-sm font-medium text-gray-700 whitespace-nowrap">
                                Stock contado:
                              </label>
                              <input
                                ref={(el) => {
                                  if (el) inputRefs.current[producto.id] = el;
                                }}
                                type="number"
                                min="0"
                                value={valorActual}
                                onChange={(e) => handleInputChange(producto.id, e.target.value)}
                                onKeyDown={(e) => handleInputKeyPress(producto.id, e)}
                                disabled={estadoProducto.estado === 'bloqueado'}
                                placeholder="0"
                                className={`w-24 p-2 text-center font-semibold border-2 rounded-lg transition-all ${
                                  estadoProducto.estado === 'bloqueado'
                                    ? 'border-red-500 bg-red-100 cursor-not-allowed text-red-800'
                                    : estaEditando
                                    ? 'border-blue-500 bg-blue-50 focus:border-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50'
                                    : estadoProducto.estado === 'confirmado'
                                    ? producto.stockFisico === producto.stockTeorico
                                      ? 'border-green-500 bg-green-50 text-green-900'
                                      : 'border-red-500 bg-red-50 text-red-900'
                                    : 'border-gray-300 focus:border-[#9c7561] focus:ring-2 focus:ring-[#9c7561] focus:ring-opacity-50'
                                }`}
                              />
                            </div>
                            
                            {/* Botones de acción */}
                            <div className="flex items-center space-x-2">
                              {estadoProducto.estado === 'bloqueado' ? (
                                <button
                                  onClick={() => reiniciarProducto(producto.id)}
                                  className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                  title="Reiniciar producto (Admin)"
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                              ) : estaEditando ? (
                                <>
                                  <button
                                    onClick={() => confirmarValorProducto(producto.id)}
                                    className="p-2 text-green-600 hover:text-green-700 hover:bg-green-100 rounded-lg transition-colors"
                                    title="Confirmar valor (Enter)"
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => cancelarEdicionProducto(producto.id)}
                                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors"
                                    title="Cancelar edición (Escape)"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </>
                              ) : estadoProducto.estado === 'confirmado' ? (
                                <>
                                  <div className="flex items-center text-green-700">
                                    {producto.stockFisico === producto.stockTeorico ? (
                                      <span className="text-sm font-medium">✓ Correcto</span>
                                    ) : (
                                      <span className="text-sm font-medium text-red-700">
                                        ⚠ Dif: {(producto.stockFisico || 0) - producto.stockTeorico}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => iniciarEdicionProducto(producto.id)}
                                    className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                    title="Editar valor"
                                    disabled={intentosRestantes <= 0}
                                  >
                                    <Edit3 className="w-4 h-4" />
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => iniciarEdicionProducto(producto.id)}
                                  className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 rounded-lg transition-colors"
                                  title="Iniciar conteo"
                                >
                                  <PlayCircle className="w-4 h-4" />
                                </button>
                              )}
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

        {/* Footer mejorado */}
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
              
              {/* Información sobre productos bloqueados */}
              {progreso.bloqueados > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Shield className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-red-800 font-medium">Productos Bloqueados Automáticamente</h4>
                      <p className="text-red-700 text-sm mt-1">
                        {progreso.bloqueados} producto(s) fueron bloqueado(s) por exceder {MAX_INTENTOS_POR_PRODUCTO} intentos de conteo. 
                        Se generará una contingencia que incluirá estos productos para revisión administrativa.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Información sobre productos en edición */}
              {progreso.editando > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <Edit3 className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                    <div>
                      <h4 className="text-blue-800 font-medium">Productos en Edición</h4>
                      <p className="text-blue-700 text-sm mt-1">
                        {progreso.editando} producto(s) están siendo editado(s). 
                        Debe confirmar o cancelar la edición antes de finalizar la conciliación.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-600">
                  💡 Esta conciliación afectará únicamente la categoría <strong>{categoriaActiva?.nombre}</strong>
                  {progreso.bloqueados > 0 && (
                    <span className="text-red-600 block mt-1">
                      ⚠️ {progreso.bloqueados} producto(s) bloqueado(s) serán incluidos en contingencia
                    </span>
                  )}
                </div>
                <button
                  onClick={handleValidateAndSave}
                  disabled={isSaving || (progreso.completados === 0 && progreso.bloqueados === 0) || progreso.editando > 0}
                  className="px-8 py-3 bg-[#311716] text-white rounded-xl hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 font-semibold text-lg shadow-lg hover:shadow-xl transition-all"
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

      {/* Modal de alerta mejorado */}
      {showAlert && (
        <AlertModal
          alert={showAlert}
          onClose={() => setShowAlert(null)}
          onConfirm={showAlert.onConfirm}
          onCancel={showAlert.onCancel}
        />
      )}
    </div>
  );
}

// Componente de modal de alerta mejorado
interface AlertModalProps {
  alert: {
    tipo: 'warning' | 'error' | 'info';
    titulo: string;
    mensaje: string;
    productosAfectados: string[];
    intentosRestantes?: number;
  };
  onClose: () => void;
  onConfirm?: () => void;
  onCancel?: () => void;
}

function AlertModal({ alert, onClose, onConfirm, onCancel }: AlertModalProps) {
  const getIconAndColor = () => {
    switch (alert.tipo) {
      case 'error':
        return { icon: <Shield className="w-8 h-8 text-red-600" />, bg: 'bg-red-100' };
      case 'warning':
        return { icon: <AlertTriangle className="w-8 h-8 text-amber-600" />, bg: 'bg-amber-100' };
      case 'info':
        return { icon: <AlertCircle className="w-8 h-8 text-blue-600" />, bg: 'bg-blue-100' };
      default:
        return { icon: <AlertTriangle className="w-8 h-8 text-amber-600" />, bg: 'bg-amber-100' };
    }
  };

  const { icon, bg } = getIconAndColor();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
        <div className="text-center">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center ${bg}`}>
            {icon}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            {alert.titulo}
          </h3>
          
          <p className="text-gray-600 mb-4">
            {alert.mensaje}
          </p>
          
          {alert.productosAfectados.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4 text-left max-h-32 overflow-y-auto">
              <ul className="text-sm text-gray-600 space-y-1">
                {alert.productosAfectados.slice(0, 10).map((producto, index) => (
                  <li key={index} className="flex items-center">
                    <div className="w-2 h-2 bg-amber-400 rounded-full mr-2 flex-shrink-0"></div>
                    <span className="truncate">{producto}</span>
                  </li>
                ))}
                {alert.productosAfectados.length > 10 && (
                  <li className="text-gray-500 italic text-center">
                    y {alert.productosAfectados.length - 10} más...
                  </li>
                )}
              </ul>
            </div>
          )}
          
          {alert.intentosRestantes !== undefined && alert.intentosRestantes > 0 && (
            <div className="bg-blue-50 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Oportunidades restantes:</strong> {alert.intentosRestantes}
              </p>
            </div>
          )}
          
          <div className="flex space-x-3">
            {onConfirm && onCancel ? (
              <>
                <button
                  onClick={onCancel}
                  className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={onConfirm}
                  className="flex-1 py-3 px-4 bg-[#311716] text-white rounded-xl hover:bg-[#462625] font-semibold transition-colors"
                >
                  Confirmar
                </button>
              </>
            ) : (
              <button
                onClick={onConfirm || onClose}
                className="w-full py-3 px-4 bg-[#311716] text-white rounded-xl hover:bg-[#462625] font-semibold transition-colors"
              >
                Entendido
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}