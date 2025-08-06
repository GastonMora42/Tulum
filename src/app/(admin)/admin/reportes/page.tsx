// src/app/(admin)/admin/reportes/page.tsx - SISTEMA DE REPORTES PROFESIONAL
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Package, Users, Calendar, Download,
  Filter, Printer, Eye, DollarSign, ShoppingCart, Clock,
  AlertTriangle, CheckCircle, ChevronRight, Loader2,
  FileText, PieChart, Activity, Target, Settings, RefreshCw,
  Layout, Grid, Table, ChevronDown, Search, X, Save, Share
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Componentes personalizados
import { 
  KPICard, 
  GraficoUniversal, 
  MapaCalor, 
  AlertaMejorada, 
  MetricaCircular 
} from '@/components/reportes/DashboardAvanzado';
import ConfiguradorReportes from '@/components/reportes/ConfiguradorReportes';

// Componentes de gráficos
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Scatter, ScatterChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Tipos
interface FiltrosReporte {
  fechaInicio: string;
  fechaFin: string;
  sucursalId: string;
  tipoReporte: string;
  agruparPor: 'hora' | 'dia' | 'semana' | 'mes';
  incluirFacturadas: boolean;
  incluirNoFacturadas: boolean;
  tipoFactura: string[];
  vendedorId: string;
  productoId: string;
  categoriaId: string;
  mediosPago: string[];
}

interface ReporteConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icono: any;
  color: string;
  filtrosDisponibles: string[];
  tiposGrafico: string[];
  exportable: boolean;
}

interface VistaReporte {
  id: string;
  nombre: string;
  layout: 'grid' | 'list' | 'dashboard';
  componentes: ComponenteVista[];
}

interface ComponenteVista {
  id: string;
  tipo: 'kpi' | 'grafico' | 'tabla' | 'mapa_calor' | 'gauge';
  titulo: string;
  tamano: 'small' | 'medium' | 'large' | 'full';
  configuracion: any;
}

const COLORES_GRAFICOS = [
  '#311716', '#9c7561', '#eeb077', '#462625', '#8a6550', '#d4a574',
  '#2563eb', '#dc2626', '#16a34a', '#ca8a04', '#9333ea', '#c2410c'
];

const CONFIGURACIONES_REPORTES: ReporteConfig[] = [
  {
    id: 'ventas_generales',
    nombre: 'Ventas Generales',
    descripcion: 'Análisis completo de ventas con tendencias y comparativas',
    icono: ShoppingCart,
    color: '#311716',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor', 'facturacion'],
    tiposGrafico: ['lineas', 'barras', 'area', 'dona'],
    exportable: true
  },
  {
    id: 'ventas_sucursales',
    nombre: 'Ventas por Sucursal',
    descripcion: 'Comparativa detallada entre sucursales',
    icono: Target,
    color: '#9c7561',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor'],
    tiposGrafico: ['barras', 'radar', 'dona'],
    exportable: true
  },
  {
    id: 'punto_equilibrio',
    nombre: 'Punto de Equilibrio',
    descripcion: 'Análisis financiero y cumplimiento de metas',
    icono: TrendingUp,
    color: '#eeb077',
    filtrosDisponibles: ['fechas', 'sucursal'],
    tiposGrafico: ['gauge', 'lineas', 'barras'],
    exportable: true
  },
  {
    id: 'productos_rendimiento',
    nombre: 'Rendimiento de Productos',
    descripcion: 'Top productos, rotación e inventario',
    icono: Package,
    color: '#462625',
    filtrosDisponibles: ['fechas', 'sucursal', 'categoria', 'productos'],
    tiposGrafico: ['barras', 'dona', 'scatter'],
    exportable: true
  },
  {
    id: 'vendedores_performance',
    nombre: 'Performance Vendedores',
    descripcion: 'Análisis de desempeño por vendedor',
    icono: Users,
    color: '#8a6550',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor'],
    tiposGrafico: ['barras', 'radar', 'scatter'],
    exportable: true
  },
  {
    id: 'facturacion_detallada',
    nombre: 'Facturación Detallada',
    descripcion: 'Estado y análisis de facturación electrónica',
    icono: FileText,
    color: '#d4a574',
    filtrosDisponibles: ['fechas', 'sucursal', 'tipoFactura'],
    tiposGrafico: ['barras', 'dona', 'lineas'],
    exportable: true
  },
  {
    id: 'horarios_ventas',
    nombre: 'Análisis Horarios',
    descripcion: 'Patrones de venta por hora y día',
    icono: Clock,
    color: '#2563eb',
    filtrosDisponibles: ['fechas', 'sucursal'],
    tiposGrafico: ['mapa_calor', 'barras', 'lineas'],
    exportable: true
  },
  {
    id: 'medios_pago',
    nombre: 'Medios de Pago',
    descripcion: 'Análisis de preferencias de pago',
    icono: DollarSign,
    color: '#16a34a',
    filtrosDisponibles: ['fechas', 'sucursal', 'mediosPago'],
    tiposGrafico: ['dona', 'barras', 'lineas'],
    exportable: true
  }
];

const PRESETS_FECHAS = [
  { 
    label: 'Hoy', 
    value: () => ({ inicio: new Date(), fin: new Date() }) 
  },
  { 
    label: 'Ayer', 
    value: () => ({ inicio: subDays(new Date(), 1), fin: subDays(new Date(), 1) }) 
  },
  { 
    label: 'Últimos 7 días', 
    value: () => ({ inicio: subDays(new Date(), 6), fin: new Date() }) 
  },
  { 
    label: 'Últimos 30 días', 
    value: () => ({ inicio: subDays(new Date(), 29), fin: new Date() }) 
  },
  { 
    label: 'Esta semana', 
    value: () => ({ inicio: startOfWeek(new Date(), { weekStartsOn: 1 }), fin: new Date() }) 
  },
  { 
    label: 'Este mes', 
    value: () => ({ inicio: startOfMonth(new Date()), fin: new Date() }) 
  },
  { 
    label: 'Mes pasado', 
    value: () => {
      const inicio = startOfMonth(subDays(startOfMonth(new Date()), 1));
      const fin = endOfMonth(inicio);
      return { inicio, fin };
    }
  },
  { 
    label: 'Este año', 
    value: () => ({ inicio: startOfYear(new Date()), fin: new Date() }) 
  }
];

export default function ReportesProfesionalPage() {
  // Estados principales
  const [reporteActivo, setReporteActivo] = useState<string>('ventas_generales');
  const [datos, setDatos] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showFiltros, setShowFiltros] = useState(true);
  const [tipoVista, setTipoVista] = useState<'dashboard' | 'detalles' | 'comparativo'>('dashboard');
  
  // Filtros
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    sucursalId: '',
    tipoReporte: 'ventas_generales',
    agruparPor: 'dia',
    incluirFacturadas: true,
    incluirNoFacturadas: true,
    tipoFactura: [],
    vendedorId: '',
    productoId: '',
    categoriaId: '',
    mediosPago: []
  });

  // Opciones disponibles
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);

  // Configuraciones guardadas
  const [configuracionesGuardadas, setConfiguracionesGuardadas] = useState<any[]>([]);
  const [showGuardarConfig, setShowGuardarConfig] = useState(false);
  const [configuracionActiva, setConfiguracionActiva] = useState<any>(null);
  
  // Estados de comparación y análisis
  const [modoComparacion, setModoComparacion] = useState(false);
  const [datosComparacion, setDatosComparacion] = useState<any>(null);
  const [alertasAutomaticas, setAlertasAutomaticas] = useState<any[]>([]);
  const [showExportOptions, setShowExportOptions] = useState(false);

  const reporteConfig = CONFIGURACIONES_REPORTES.find(r => r.id === reporteActivo) || CONFIGURACIONES_REPORTES[0];

  // Cargar datos iniciales
  useEffect(() => {
    cargarOpcionesIniciales();
  }, []);

  // Cargar datos cuando cambian filtros importantes
  useEffect(() => {
    if (reporteActivo && filtros.fechaInicio && filtros.fechaFin) {
      cargarDatos();
    }
  }, [reporteActivo, filtros.fechaInicio, filtros.fechaFin, filtros.sucursalId]);

  const cargarOpcionesIniciales = async () => {
    try {
      const [ubicacionesRes, vendedoresRes, productosRes, categoriasRes] = await Promise.all([
        authenticatedFetch('/api/admin/ubicaciones'),
        authenticatedFetch('/api/admin/usuarios?role=vendedor'),
        authenticatedFetch('/api/productos?limit=100'),
        authenticatedFetch('/api/admin/categorias')
      ]);

      if (ubicacionesRes.ok) setUbicaciones(await ubicacionesRes.json());
      if (vendedoresRes.ok) setVendedores(await vendedoresRes.json());
      if (productosRes.ok) {
        const prodData = await productosRes.json();
        setProductos(prodData.data || []);
      }
      if (categoriasRes.ok) setCategorias(await categoriasRes.json());
    } catch (error) {
      console.error('Error cargando opciones:', error);
    }
  };

  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams({
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        agruparPor: filtros.agruparPor
      });

      // Agregar filtros opcionales
      if (filtros.sucursalId) params.append('sucursalId', filtros.sucursalId);
      if (filtros.vendedorId) params.append('vendedorId', filtros.vendedorId);
      if (filtros.productoId) params.append('productoId', filtros.productoId);
      if (filtros.categoriaId) params.append('categoriaId', filtros.categoriaId);

      switch (reporteActivo) {
        case 'ventas_generales':
          endpoint = `/api/reportes/ventas-detallado?${params}`;
          break;
        case 'ventas_sucursales':
          endpoint = `/api/reportes/ventas-por-sucursal?${params}`;
          break;
        case 'punto_equilibrio':
          endpoint = `/api/admin/punto-equilibrio?${params}`;
          break;
        case 'productos_rendimiento':
          endpoint = `/api/reportes/productos-rendimiento?${params}`;
          break;
        case 'vendedores_performance':
          endpoint = `/api/reportes/vendedores-performance?${params}`;
          break;
        case 'facturacion_detallada':
          endpoint = `/api/reportes/facturacion-detallada?${params}`;
          break;
        case 'horarios_ventas':
          endpoint = `/api/reportes/horarios-ventas?${params}`;
          break;
        case 'medios_pago':
          endpoint = `/api/reportes/medios-pago?${params}`;
          break;
        default:
          endpoint = `/api/reportes/ventas-detallado?${params}`;
      }

      const response = await authenticatedFetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setDatos(data);
        
        // Generar alertas automáticas basadas en los datos
        generarAlertasAutomaticas(data);
        
        // Si está en modo comparación, cargar datos de comparación
        if (modoComparacion) {
          await cargarDatosComparacion(data);
        }
      } else {
        console.error('Error al cargar datos del reporte');
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const cargarDatosComparacion = async (datosActuales: any) => {
    // Cargar datos del período anterior para comparación
    try {
      const diasDiferencia = Math.abs(new Date(filtros.fechaFin).getTime() - new Date(filtros.fechaInicio).getTime()) / (1000 * 60 * 60 * 24);
      const fechaInicioComparacion = new Date(filtros.fechaInicio);
      fechaInicioComparacion.setDate(fechaInicioComparacion.getDate() - diasDiferencia);
      const fechaFinComparacion = new Date(filtros.fechaInicio);
      fechaFinComparacion.setDate(fechaFinComparacion.getDate() - 1);

      const paramsComparacion = new URLSearchParams({
        fechaInicio: format(fechaInicioComparacion, 'yyyy-MM-dd'),
        fechaFin: format(fechaFinComparacion, 'yyyy-MM-dd'),
        agruparPor: filtros.agruparPor
      });

      if (filtros.sucursalId) paramsComparacion.append('sucursalId', filtros.sucursalId);

      let endpointComparacion = '';
      switch (reporteActivo) {
        case 'ventas_generales':
          endpointComparacion = `/api/reportes/ventas-detallado?${paramsComparacion}`;
          break;
        case 'ventas_sucursales':
          endpointComparacion = `/api/reportes/ventas-por-sucursal?${paramsComparacion}`;
          break;
        default:
          endpointComparacion = `/api/reportes/ventas-detallado?${paramsComparacion}`;
      }

      const response = await authenticatedFetch(endpointComparacion);
      if (response.ok) {
        const dataComparacion = await response.json();
        setDatosComparacion(dataComparacion);
      }
    } catch (error) {
      console.error('Error al cargar datos de comparación:', error);
    }
  };

  const generarAlertasAutomaticas = (data: any) => {
    const alertas: any[] = [];

    // Alertas basadas en el tipo de reporte
    switch (reporteActivo) {
      case 'ventas_generales':
        // Alerta si las ventas están muy por debajo del promedio
        if (data.resumen?.ventasTotales && data.resumen.ventasTotales < 10000) {
          alertas.push({
            tipo: 'warning',
            titulo: 'Ventas Bajas',
            mensaje: 'Las ventas del período están por debajo de lo esperado',
            accion: 'Revisar estrategias de venta'
          });
        }
        break;
      case 'productos_rendimiento':
        // Alerta por productos con stock crítico
        if (data.estadisticas?.productosStockCritico > 5) {
          alertas.push({
            tipo: 'error',
            titulo: 'Stock Crítico',
            mensaje: `${data.estadisticas.productosStockCritico} productos con stock crítico`,
            accion: 'Revisar inventario urgentemente'
          });
        }
        break;
      case 'facturacion_detallada':
        // Alerta por bajo porcentaje de facturación
        if (data.resumen?.porcentajeFacturacion < 70) {
          alertas.push({
            tipo: 'warning',
            titulo: 'Facturación Baja',
            mensaje: `Solo ${data.resumen.porcentajeFacturacion.toFixed(1)}% de ventas facturadas`,
            accion: 'Mejorar proceso de facturación'
          });
        }
        break;
    }

    // Agregar alertas del propio reporte si las hay
    if (data.alertas && Array.isArray(data.alertas)) {
      alertas.push(...data.alertas);
    }

    setAlertasAutomaticas(alertas);
  };

  const aplicarPreset = (preset: any) => {
    const { inicio, fin } = preset.value();
    setFiltros({
      ...filtros,
      fechaInicio: format(inicio, 'yyyy-MM-dd'),
      fechaFin: format(fin, 'yyyy-MM-dd')
    });
  };

  const exportarPDF = async () => {
    if (!datos) return;
    
    setIsLoading(true);
    try {
      const response = await authenticatedFetch('/api/reportes/export/pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipoReporte: reporteActivo,
          filtros,
          datos,
          configuracion: reporteConfig
        })
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `reporte-${reporteActivo}-${format(new Date(), 'yyyy-MM-dd-HHmm')}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error('Error exportando PDF:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFiltrosAvanzados = () => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Filtros y Configuración</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGuardarConfig(true)}
            className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <Save className="h-4 w-4 inline mr-1" />
            Guardar Config
          </button>
          <button
            onClick={cargarDatos}
            className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            <RefreshCw className="h-4 w-4 inline mr-1" />
            Actualizar
          </button>
        </div>
      </div>

      {/* Selector de Reporte */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {CONFIGURACIONES_REPORTES.map(config => (
          <button
            key={config.id}
            onClick={() => {
              setReporteActivo(config.id);
              setFiltros({ ...filtros, tipoReporte: config.id });
            }}
            className={`p-3 rounded-lg border-2 transition-all text-left ${
              reporteActivo === config.id
                ? `border-[${config.color}] bg-[${config.color}]/10`
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <config.icono className="h-5 w-5 mb-2" style={{ color: config.color }} />
            <p className="font-medium text-sm">{config.nombre}</p>
            <p className="text-xs text-gray-500">{config.descripcion}</p>
          </button>
        ))}
      </div>

      {/* Filtros de Fecha */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
          <input
            type="date"
            value={filtros.fechaInicio}
            onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
          <input
            type="date"
            value={filtros.fechaFin}
            onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
          <select
            value={filtros.sucursalId}
            onChange={(e) => setFiltros({ ...filtros, sucursalId: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
          >
            <option value="">Todas las sucursales</option>
            {ubicaciones.map(ub => (
              <option key={ub.id} value={ub.id}>{ub.nombre}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Agrupar por</label>
          <select
            value={filtros.agruparPor}
            onChange={(e) => setFiltros({ ...filtros, agruparPor: e.target.value as any })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
          >
            <option value="hora">Por Hora</option>
            <option value="dia">Por Día</option>
            <option value="semana">Por Semana</option>
            <option value="mes">Por Mes</option>
          </select>
        </div>
      </div>

      {/* Presets de Fecha */}
      <div className="flex gap-2 flex-wrap mb-4">
        {PRESETS_FECHAS.map(preset => (
          <button
            key={preset.label}
            onClick={() => aplicarPreset(preset)}
            className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Filtros Específicos por Tipo de Reporte */}
      {reporteConfig.filtrosDisponibles.includes('vendedor') && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Vendedor</label>
            <select
              value={filtros.vendedorId}
              onChange={(e) => setFiltros({ ...filtros, vendedorId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <select
              value={filtros.productoId}
              onChange={(e) => setFiltros({ ...filtros, productoId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
            >
              <option value="">Todos los productos</option>
              {productos.map(p => (
                <option key={p.id} value={p.id}>{p.nombre}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <select
              value={filtros.categoriaId}
              onChange={(e) => setFiltros({ ...filtros, categoriaId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
            >
              <option value="">Todas las categorías</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );

  const renderKPIs = () => {
    if (!datos?.resumen) return null;

    const kpis = [
      {
        titulo: 'Ventas Totales',
        valor: `$${datos.resumen.ventasTotales?.toFixed(2) || '0.00'}`,
        subtitulo: `${datos.resumen.cantidadVentas || 0} transacciones`,
        icono: DollarSign,
        color: 'text-green-600',
        bgColor: 'bg-green-100'
      },
      {
        titulo: 'Ticket Promedio',
        valor: `$${datos.resumen.ticketPromedio?.toFixed(2) || '0.00'}`,
        subtitulo: 'Por transacción',
        icono: ShoppingCart,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100'
      },
      {
        titulo: 'Top Vendedor',
        valor: datos.resumen.porUsuario?.[0]?.usuario?.name || 'N/A',
        subtitulo: `$${datos.resumen.porUsuario?.[0]?._sum?.total?.toFixed(2) || '0'}`,
        icono: Users,
        color: 'text-purple-600',
        bgColor: 'bg-purple-100'
      },
      {
        titulo: 'Producto Estrella',
        valor: datos.resumen.porProducto?.[0]?.nombre || 'N/A',
        subtitulo: `${datos.resumen.porProducto?.[0]?.cantidad_vendida || 0} unidades`,
        icono: Target,
        color: 'text-orange-600',
        bgColor: 'bg-orange-100'
      }
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                <kpi.icono className={`h-6 w-6 ${kpi.color}`} />
              </div>
              <span className="text-sm text-gray-500">{kpi.titulo}</span>
            </div>
            <p className="text-2xl font-bold text-gray-800">{kpi.valor}</p>
            <p className="text-sm text-gray-500 mt-1">{kpi.subtitulo}</p>
          </div>
        ))}
      </div>
    );
  };

  const renderGraficos = () => {
    if (!datos) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Gráfico de Tendencia */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-gray-600" />
            Tendencia de Ventas
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={datos.tendencia || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="periodo" 
                tickFormatter={(value: string | number | Date) => format(new Date(value), 'dd/MM')}
              />
              <YAxis tickFormatter={(value) => `$${value.toLocaleString()}`} />
              <Tooltip 
                formatter={(value: any) => [`$${value?.toFixed(2)}`, 'Ventas']}
                labelFormatter={(label: string | number | Date) => format(new Date(label), 'dd/MM/yyyy')}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="total_vendido" 
                stroke="#311716" 
                name="Ventas"
                strokeWidth={3}
                dot={{ fill: '#311716', strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: '#311716', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Gráfico de Medios de Pago */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-gray-600" />
            Medios de Pago
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={datos.resumen?.mediosPago || []}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ medioPago, percent }: { medioPago: string; percent: number }) => 
                  `${medioPago}: ${(percent * 100).toFixed(0)}%`
                }
                outerRadius={80}
                fill="#8884d8"
                dataKey="_sum.monto"
              >
                {(datos.resumen?.mediosPago || []).map((entry: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORES_GRAFICOS[index % COLORES_GRAFICOS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => `$${value?.toFixed(2)}`} />
            </RePieChart>
          </ResponsiveContainer>
        </div>
      </div>
    );
  };

  const renderTablaDetallada = () => {
    if (!datos?.resumen?.porProducto) return null;

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <Table className="h-5 w-5 mr-2 text-gray-600" />
          Detalle de Productos
        </h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  % del Total
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {datos.resumen.porProducto.slice(0, 10).map((producto: any, idx: number) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {producto.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {producto.cantidad_vendida}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${producto.total_vendido?.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">
                    {((producto.total_vendido / datos.resumen.ventasTotales) * 100).toFixed(1)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header Profesional */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Centro de Reportes Profesional</h1>
              <p className="text-white/80">
                Análisis avanzado y personalizable de tu negocio • {reporteConfig.nombre}
              </p>
            </div>
            <div className="flex gap-3">
              <div className="flex bg-white/10 rounded-lg p-1">
                {['dashboard', 'detalles', 'comparativo'].map((vista) => (
                  <button
                    key={vista}
                    onClick={() => setTipoVista(vista as any)}
                    className={`px-3 py-1 text-sm rounded transition ${
                      tipoVista === vista 
                        ? 'bg-white text-[#311716]' 
                        : 'text-white/80 hover:text-white'
                    }`}
                  >
                    {vista === 'dashboard' && <Grid className="h-4 w-4 inline mr-1" />}
                    {vista === 'detalles' && <Table className="h-4 w-4 inline mr-1" />}
                    {vista === 'comparativo' && <BarChart3 className="h-4 w-4 inline mr-1" />}
                    {vista.charAt(0).toUpperCase() + vista.slice(1)}
                  </button>
                ))}
              </div>
              
              <button
                onClick={() => setShowFiltros(!showFiltros)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <Filter className="h-5 w-5" />
                Filtros
              </button>
              
              <button
                onClick={exportarPDF}
                disabled={!datos || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#311716] rounded-lg hover:bg-gray-100 disabled:opacity-50 transition"
              >
                <Download className="h-5 w-5" />
                Exportar PDF
              </button>
            </div>
          </div>
        </div>

        {/* Panel de Filtros */}
        {showFiltros && renderFiltrosAvanzados()}

        {/* Contenido Principal */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#9c7561]" />
            <span className="ml-3 text-lg">Generando reporte...</span>
          </div>
        ) : datos ? (
          <div className="space-y-6">
            {/* KPIs */}
            {renderKPIs()}
            
            {/* Gráficos */}
            {renderGraficos()}
            
            {/* Tabla Detallada */}
            {tipoVista === 'detalles' && renderTablaDetallada()}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Configura los filtros y selecciona un tipo de reporte para comenzar
            </p>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}