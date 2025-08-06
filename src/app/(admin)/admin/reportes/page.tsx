// src/app/(admin)/admin/reportes/page.tsx - SISTEMA DE REPORTES COMPLETO Y FUNCIONAL
'use client';

import { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, TrendingUp, Package, Users, Calendar, Download,
  Filter, Printer, Eye, DollarSign, ShoppingCart, Clock,
  AlertTriangle, CheckCircle, ChevronRight, Loader2,
  FileText, PieChart, Activity, Target, Settings, RefreshCw,
  Layout, Grid, Table, ChevronDown, Search, X, Save, Share,
  MapPin, CreditCard, ArrowRight, Zap, Bell, Star, Archive
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Importar hooks y utilidades
import { useReportes, FiltrosReporte } from '@/hooks/useReports';
import { formatters, calculadoras, transformadores, colores } from '@/utils/reportesUtils';
import { authenticatedFetch } from '@/hooks/useAuth';

// Importar componentes de reportes
import { 
  KPICard, 
  GraficoUniversal, 
  MapaCalor, 
  AlertaMejorada, 
  MetricaCircular,
  TablaAvanzada
} from '@/components/reportes/DashboardAvanzado';
import AlertasInteligentes from '@/components/reportes/AlertasInteligentes';
import AnalisisComparativo from '@/components/reportes/AnalisisComparativo';
import FiltrosAvanzados from '@/components/reportes/FiltrosAvanzados';

// Gráficos
import { 
  LineChart, Line, BarChart, Bar, PieChart as RePieChart, Pie, Cell, Area, AreaChart,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  ComposedChart, Scatter, ScatterChart, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';

// Tipos y configuraciones
interface ReporteConfig {
  id: string;
  nombre: string;
  descripcion: string;
  icono: any;
  color: string;
  filtrosDisponibles: string[];
  tiposGrafico: string[];
  exportable: boolean;
  categoria: 'ventas' | 'inventario' | 'financiero' | 'operativo';
}

const CONFIGURACIONES_REPORTES: ReporteConfig[] = [
  {
    id: 'ventas_generales',
    nombre: 'Ventas Generales',
    descripcion: 'Análisis completo de ventas con tendencias y comparativas',
    icono: ShoppingCart,
    color: '#311716',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor', 'facturacion'],
    tiposGrafico: ['lineas', 'barras', 'area', 'dona'],
    exportable: true,
    categoria: 'ventas'
  },
  {
    id: 'ventas_sucursales',
    nombre: 'Ventas por Sucursal',
    descripcion: 'Comparativa detallada entre sucursales',
    icono: MapPin,
    color: '#9c7561',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor'],
    tiposGrafico: ['barras', 'radar', 'dona'],
    exportable: true,
    categoria: 'ventas'
  },
  {
    id: 'productos_rendimiento',
    nombre: 'Rendimiento de Productos',
    descripcion: 'Top productos, rotación e inventario',
    icono: Package,
    color: '#eeb077',
    filtrosDisponibles: ['fechas', 'sucursal', 'categoria', 'productos'],
    tiposGrafico: ['barras', 'dona', 'scatter'],
    exportable: true,
    categoria: 'inventario'
  },
  {
    id: 'vendedores_performance',
    nombre: 'Performance Vendedores',
    descripcion: 'Análisis de desempeño por vendedor',
    icono: Users,
    color: '#462625',
    filtrosDisponibles: ['fechas', 'sucursal', 'vendedor'],
    tiposGrafico: ['barras', 'radar', 'scatter'],
    exportable: true,
    categoria: 'operativo'
  },
  {
    id: 'facturacion_detallada',
    nombre: 'Facturación Detallada',
    descripcion: 'Estado y análisis de facturación electrónica',
    icono: FileText,
    color: '#8a6550',
    filtrosDisponibles: ['fechas', 'sucursal', 'tipoFactura'],
    tiposGrafico: ['barras', 'dona', 'lineas'],
    exportable: true,
    categoria: 'financiero'
  },
  {
    id: 'horarios_ventas',
    nombre: 'Análisis Horarios',
    descripcion: 'Patrones de venta por hora y día',
    icono: Clock,
    color: '#d4a574',
    filtrosDisponibles: ['fechas', 'sucursal'],
    tiposGrafico: ['mapa_calor', 'barras', 'lineas'],
    exportable: true,
    categoria: 'operativo'
  },
  {
    id: 'medios_pago',
    nombre: 'Medios de Pago',
    descripcion: 'Análisis de preferencias de pago',
    icono: CreditCard,
    color: '#2563eb',
    filtrosDisponibles: ['fechas', 'sucursal', 'mediosPago'],
    tiposGrafico: ['dona', 'barras', 'lineas'],
    exportable: true,
    categoria: 'financiero'
  },
  {
    id: 'inventario',
    nombre: 'Inventario y Stock',
    descripcion: 'Análisis completo de inventario',
    icono: Archive,
    color: '#16a34a',
    filtrosDisponibles: ['sucursal', 'categoria', 'productos'],
    tiposGrafico: ['barras', 'tabla', 'gauge'],
    exportable: true,
    categoria: 'inventario'
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
  // Hook personalizado de reportes
  const {
    datos,
    datosComparacion,
    isLoading,
    error,
    cargarDatos,
    exportarDatos,
    clearError,
    refrescar
  } = useReportes();
  
  // Estados principales
  const [reporteActivo, setReporteActivo] = useState<string>('ventas_generales');
  const [tipoVista, setTipoVista] = useState<'dashboard' | 'detalles' | 'comparativo' | 'alertas'>('dashboard');
  const [showFiltros, setShowFiltros] = useState(true);
  const [modoComparacion, setModoComparacion] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  
  // Estados de opciones
  const [opciones, setOpciones] = useState<{
    ubicaciones: any[];
    vendedores: any[];
    productos: any[];
    categorias: any[];
    mediosPago: string[];
  }>({
    ubicaciones: [],
    vendedores: [],
    productos: [],
    categorias: [],
    mediosPago: []
  });

  // Estados de configuración local (simplificado)
  const [configuracionesGuardadas, setConfiguracionesGuardadas] = useState<Array<{
    id: string;
    nombre: string;
    tipoReporte: string;
    filtros: FiltrosReporte;
    fecha: Date;
  }>>([]);
  
  // Filtros
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(new Date(), 'yyyy-MM-dd'),
    sucursalId: '',
    tipoReporte: 'ventas_generales',
    agruparPor: 'dia',
    vendedorId: '',
    productoId: '',
    categoriaId: '',
    mediosPago: [],
    incluirFacturadas: true,
    incluirNoFacturadas: true,
    tipoFactura: []
  });

  // Estados de exportación y configuración
  const [showExportOptions, setShowExportOptions] = useState(false);
  const [exportando, setExportando] = useState(false);
  const [showAlertas, setShowAlertas] = useState(false);

  const reporteConfig = CONFIGURACIONES_REPORTES.find(r => r.id === reporteActivo) || CONFIGURACIONES_REPORTES[0];

  // Cargar opciones iniciales
  useEffect(() => {
    cargarOpcionesIniciales();
  }, []);

  // Auto-refresh cada 30 segundos si está habilitado
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => {
      if (reporteActivo && filtros.fechaInicio && filtros.fechaFin) {
        refrescar(reporteActivo, filtros, modoComparacion);
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, reporteActivo, filtros, modoComparacion, refrescar]);

  // Cargar datos cuando cambian filtros importantes
  useEffect(() => {
    if (reporteActivo && filtros.fechaInicio && filtros.fechaFin) {
      cargarDatos(reporteActivo, filtros, modoComparacion);
    }
  }, [reporteActivo, filtros.fechaInicio, filtros.fechaFin, filtros.sucursalId, filtros.agruparPor, modoComparacion]);

  const cargarOpcionesIniciales = async () => {
    try {
      const [ubicacionesRes, vendedoresRes, productosRes, categoriasRes] = await Promise.all([
        authenticatedFetch('/api/admin/ubicaciones'),
        authenticatedFetch('/api/admin/usuarios?role=vendedor'),
        authenticatedFetch('/api/productos?limit=100'),
        authenticatedFetch('/api/admin/categorias')
      ]);

      const nuevasOpciones = { ...opciones };
      
      if (ubicacionesRes.ok) {
        nuevasOpciones.ubicaciones = await ubicacionesRes.json();
      }
      
      if (vendedoresRes.ok) {
        nuevasOpciones.vendedores = await vendedoresRes.json();
      }
      
      if (productosRes.ok) {
        const prodData = await productosRes.json();
        nuevasOpciones.productos = prodData.data || [];
      }
      
      if (categoriasRes.ok) {
        nuevasOpciones.categorias = await categoriasRes.json();
      }
      
      nuevasOpciones.mediosPago = ['efectivo', 'tarjeta_credito', 'tarjeta_debito', 'transferencia', 'qr'];
      
      setOpciones(nuevasOpciones);
    } catch (error) {
      console.error('Error cargando opciones:', error);
    }
  };

  const aplicarPreset = (preset: any) => {
    const { inicio, fin } = preset.value();
    setFiltros({
      ...filtros,
      fechaInicio: format(inicio, 'yyyy-MM-dd'),
      fechaFin: format(fin, 'yyyy-MM-dd')
    });
  };

  const handleExportar = async (formato: 'pdf' | 'excel' | 'csv') => {
    if (!datos) return;
    
    setExportando(true);
    try {
      await exportarDatos(formato, reporteActivo, filtros, reporteConfig);
    } catch (error) {
      console.error('Error al exportar:', error);
      // Mostrar error al usuario
    } finally {
      setExportando(false);
      setShowExportOptions(false);
    }
  };

  const cambiarReporte = (nuevoTipo: string) => {
    setReporteActivo(nuevoTipo);
    setFiltros({ ...filtros, tipoReporte: nuevoTipo });
    clearError();
  };

  const renderKPIs = () => {
    if (!datos?.resumen && !datos?.estadisticas) return null;

    const kpis = [];
    
    // KPIs según tipo de reporte
    switch (reporteActivo) {
      case 'ventas_generales':
        kpis.push(
          {
            titulo: 'Ventas Totales',
            valor: formatters.moneda(datos.resumen?.ventasTotales || 0),
            subtitulo: `${datos.resumen?.cantidadVentas || 0} transacciones`,
            icono: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            cambio: datosComparacion?.cambios?.ventasTotales?.porcentaje
          },
          {
            titulo: 'Ticket Promedio',
            valor: formatters.moneda(datos.resumen?.ticketPromedio || 0),
            subtitulo: 'Por transacción',
            icono: ShoppingCart,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100'
          }
        );
        break;
        
      case 'productos_rendimiento':
        kpis.push(
          {
            titulo: 'Total Productos',
            valor: datos.estadisticas?.totalProductos || 0,
            subtitulo: 'En catálogo',
            icono: Package,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100'
          },
          {
            titulo: 'Stock Crítico',
            valor: datos.estadisticas?.productosStockCritico || 0,
            subtitulo: 'Requieren reposición',
            icono: AlertTriangle,
            color: 'text-red-600',
            bgColor: 'bg-red-100'
          }
        );
        break;
        
      case 'vendedores_performance':
        kpis.push(
          {
            titulo: 'Vendedores Activos',
            valor: datos.estadisticas?.totalVendedores || 0,
            subtitulo: 'En el período',
            icono: Users,
            color: 'text-indigo-600',
            bgColor: 'bg-indigo-100'
          }
        );
        break;
        
      case 'facturacion_detallada':
        kpis.push(
          {
            titulo: 'Facturación',
            valor: formatters.porcentaje(datos.resumen?.porcentajeFacturacion || 0),
            subtitulo: 'Del total de ventas',
            icono: FileText,
            color: 'text-green-600',
            bgColor: 'bg-green-100'
          }
        );
        break;
    }

    if (kpis.length === 0) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi, index) => (
          <KPICard
            key={index}
            titulo={kpi.titulo}
            valor={kpi.valor}
            subtitulo={kpi.subtitulo}
            icono={kpi.icono}
            color={kpi.color}
            bgColor={kpi.bgColor}
            cambio={kpi.cambio}
            loading={isLoading}
          />
        ))}
      </div>
    );
  };

  const renderGraficos = () => {
    if (!datos || isLoading) {
      return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                <div className="h-64 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const graficos = [];

    // Gráficos según tipo de reporte
    switch (reporteActivo) {
      case 'ventas_generales':
        if (datos.tendencia) {
          graficos.push(
            <GraficoUniversal
              key="tendencia"
              data={datos.tendencia}
              tipo="lineas"
              titulo="Tendencia de Ventas"
              dataKey="total_vendido"
              xKey="periodo"
              colores={colores.paletas.tulum}
            />
          );
        }
        
        if (datos.resumen?.mediosPago) {
          graficos.push(
            <GraficoUniversal
              key="medios-pago"
              data={datos.resumen.mediosPago}
              tipo="dona"
              titulo="Distribución por Medios de Pago"
              dataKey="_sum.monto"
              xKey="medioPago"
              colores={colores.paletas.azul}
            />
          );
        }
        break;
        
      case 'ventas_sucursales':
        if (datos.ventasPorSucursal) {
          graficos.push(
            <GraficoUniversal
              key="sucursales"
              data={datos.ventasPorSucursal}
              tipo="barras"
              titulo="Ventas por Sucursal"
              dataKey="ingresos_totales"
              xKey="sucursal"
              colores={colores.paletas.verde}
            />
          );
        }
        break;
        
      case 'productos_rendimiento':
        if (datos.topProductos) {
          graficos.push(
            <GraficoUniversal
              key="top-productos"
              data={datos.topProductos.slice(0, 10)}
              tipo="barras"
              titulo="Top 10 Productos"
              dataKey="ingresos_totales"
              xKey="nombre"
              colores={colores.paletas.naranja}
            />
          );
        }
        break;
        
      case 'horarios_ventas':
        if (datos.mapaCalor) {
          graficos.push(
            <MapaCalor
              key="mapa-calor"
              data={datos.mapaCalor}
              xKey="hora"
              yKey="nombre_dia"
              valueKey="cantidad_ventas"
              titulo="Mapa de Calor - Ventas por Hora y Día"
            />
          );
        }
        break;
        
      case 'medios_pago':
        if (datos.distribucion) {
          graficos.push(
            <GraficoUniversal
              key="distribucion"
              data={datos.distribucion}
              tipo="dona"
              titulo="Distribución de Medios de Pago"
              dataKey="monto_total"
              xKey="medioPago"
              colores={colores.paletas.purpura}
            />
          );
        }
        break;
    }

    if (graficos.length === 0) {
      return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No hay datos suficientes para mostrar gráficos</p>
        </div>
      );
    }

    return (
      <div className={`grid gap-6 mb-6 ${graficos.length === 1 ? 'grid-cols-1' : 'grid-cols-1 lg:grid-cols-2'}`}>
        {graficos}
      </div>
    );
  };

  const renderTablaDetallada = () => {
    if (!datos) return null;

    let columnas: any[] = [];
    let datosTabla: any[] = [];
    let titulo = '';

    switch (reporteActivo) {
      case 'ventas_generales':
        if (datos.resumen?.porProducto) {
          titulo = 'Detalle de Productos';
          columnas = [
            { header: 'Producto', dataKey: 'nombre' },
            { header: 'Cantidad', dataKey: 'cantidad_vendida' },
            { header: 'Total', dataKey: 'total_vendido', render: (val: number) => formatters.moneda(val) },
            { header: '% Total', dataKey: 'porcentaje', render: (val: number, fila: any) => 
              formatters.porcentaje((fila.total_vendido / datos.resumen.ventasTotales) * 100) }
          ];
          datosTabla = datos.resumen.porProducto.slice(0, 20);
        }
        break;
        
      case 'vendedores_performance':
        if (datos.performance) {
          titulo = 'Performance de Vendedores';
          columnas = [
            { header: 'Vendedor', dataKey: 'name' },
            { header: 'Ventas', dataKey: 'total_ventas' },
            { header: 'Ingresos', dataKey: 'ingresos_totales', render: (val: number) => formatters.moneda(val) },
            { header: 'Ticket Prom.', dataKey: 'ticket_promedio', render: (val: number) => formatters.moneda(val) },
            { header: '% Facturación', dataKey: 'porcentaje_facturacion', render: (val: number) => formatters.porcentaje(val) }
          ];
          datosTabla = datos.performance;
        }
        break;
        
      case 'facturacion_detallada':
        if (datos.facturacionPorSucursal) {
          titulo = 'Facturación por Sucursal';
          columnas = [
            { header: 'Sucursal', dataKey: 'sucursal_nombre' },
            { header: 'Total Ventas', dataKey: 'total_ventas' },
            { header: 'Facturadas', dataKey: 'ventas_facturadas' },
            { header: '% Facturación', dataKey: 'porcentajeFacturacion', render: (val: number) => formatters.porcentaje(val) },
            { header: 'Tasa Éxito', dataKey: 'tasaExito', render: (val: number) => formatters.porcentaje(val) }
          ];
          datosTabla = datos.facturacionPorSucursal;
        }
        break;
    }

    if (columnas.length === 0 || datosTabla.length === 0) return null;

    return (
      <TablaAvanzada
        titulo={titulo}
        columnas={columnas}
        datos={datosTabla}
        paginacion={true}
        itemsPorPagina={10}
        loading={isLoading}
      />
    );
  };

  const renderSelectorReportes = () => (
    <div className="mb-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-900">Tipos de Reportes</h3>
      
      {/* Por categorías */}
      {(['ventas', 'inventario', 'financiero', 'operativo'] as const).map(categoria => {
        const reportesCategoria = CONFIGURACIONES_REPORTES.filter(r => r.categoria === categoria);
        
        return (
          <div key={categoria} className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wide">
              {categoria.charAt(0).toUpperCase() + categoria.slice(1)}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
              {reportesCategoria.map(config => (
                <button
                  key={config.id}
                  onClick={() => cambiarReporte(config.id)}
                  className={`p-4 rounded-lg border-2 transition-all text-left hover:shadow-md ${
                    reporteActivo === config.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center mb-2">
                    <config.icono 
                      className="h-6 w-6 mr-2" 
                      style={{ color: reporteActivo === config.id ? '#3b82f6' : config.color }} 
                    />
                    <span className="font-medium text-sm">{config.nombre}</span>
                  </div>
                  <p className="text-xs text-gray-500">{config.descripcion}</p>
                  {config.exportable && (
                    <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                      Exportable
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header Moderno */}
        <div className="bg-gradient-to-r from-[#311716] via-[#462625] to-[#9c7561] rounded-2xl p-8 text-white shadow-xl">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold mb-3">Centro de Reportes Avanzados</h1>
              <p className="text-white/90 text-lg">
                Análisis integral y personalizable de tu negocio
              </p>
              <p className="text-white/70 mt-2">
                {reporteConfig.nombre} • {format(new Date(), "dd 'de' MMMM, yyyy", { locale: es })}
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Auto-refresh toggle */}
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="auto-refresh"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="rounded border-white/20 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="auto-refresh" className="text-sm text-white/80">
                  Auto-refresh
                </label>
              </div>
              
              {/* Botones de acción */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowFiltros(!showFiltros)}
                  className={`p-2 rounded-lg transition-colors ${showFiltros ? 'bg-white/20 text-white' : 'bg-white/10 text-white/60 hover:bg-white/20'}`}
                >
                  <Filter className="h-5 w-5" />
                </button>
                
                <button
                  onClick={() => setShowAlertas(!showAlertas)}
                  className="p-2 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors"
                >
                  <Bell className="h-5 w-5" />
                </button>
                
                <div className="relative">
                  <button
                    onClick={() => setShowExportOptions(!showExportOptions)}
                    disabled={!datos || isLoading}
                    className="p-2 rounded-lg bg-white text-[#311716] hover:bg-gray-100 disabled:opacity-50 transition-colors"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  
                  {showExportOptions && (
                    <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                      <button
                        onClick={() => handleExportar('pdf')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <FileText className="h-4 w-4 inline mr-2" />
                        Exportar PDF
                      </button>
                      <button
                        onClick={() => handleExportar('excel')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Table className="h-4 w-4 inline mr-2" />
                        Exportar Excel
                      </button>
                      <button
                        onClick={() => handleExportar('csv')}
                        className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      >
                        <Download className="h-4 w-4 inline mr-2" />
                        Exportar CSV
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Selector de Reportes */}
        {renderSelectorReportes()}

        {/* Panel de Filtros Avanzados */}
        {showFiltros && (
          <FiltrosAvanzados
            filtros={filtros}
            onFiltrosChange={setFiltros}
            configuracionReporte={reporteConfig}
            opciones={opciones}
          />
        )}

        {/* Tabs de Vista */}
        <div className="flex justify-between items-center">
          <div className="flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            {[
              { id: 'dashboard', label: 'Dashboard', icono: Grid },
              { id: 'detalles', label: 'Detalles', icono: Table },
              { id: 'comparativo', label: 'Comparativo', icono: BarChart3 },
              { id: 'alertas', label: 'Alertas', icono: Bell }
            ].map(({ id, label, icono: Icono }) => (
              <button
                key={id}
                onClick={() => setTipoVista(id as any)}
                className={`px-4 py-2 text-sm rounded-md transition-all flex items-center space-x-2 ${
                  tipoVista === id 
                    ? 'bg-[#311716] text-white shadow-sm' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                <Icono className="h-4 w-4" />
                <span>{label}</span>
              </button>
            ))}
          </div>
          
          <div className="flex items-center space-x-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={modoComparacion}
                onChange={(e) => setModoComparacion(e.target.checked)}
                className="mr-2 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Modo Comparación</span>
            </label>
            
            <button
              onClick={() => refrescar(reporteActivo, filtros, modoComparacion)}
              disabled={isLoading}
              className="p-2 text-gray-600 hover:text-gray-900 disabled:opacity-50"
            >
              <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Presets de Fecha Rápidos */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-gray-600 self-center mr-2">Períodos rápidos:</span>
          {PRESETS_FECHAS.map(preset => (
            <button
              key={preset.label}
              onClick={() => aplicarPreset(preset)}
              className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Contenido Principal */}
        {error && (
          <AlertaMejorada
            tipo="error"
            titulo="Error al cargar datos"
            mensaje={error}
            accion="Reintentar"
            onAccion={() => refrescar(reporteActivo, filtros, modoComparacion)}
            cerrable={true}
            onCerrar={clearError}
          />
        )}

        {tipoVista === 'dashboard' && (
          <div className="space-y-6">
            {renderKPIs()}
            {renderGraficos()}
          </div>
        )}

        {tipoVista === 'detalles' && (
          <div className="space-y-6">
            {renderKPIs()}
            {renderTablaDetallada()}
          </div>
        )}

        {tipoVista === 'comparativo' && datosComparacion && (
          <AnalisisComparativo
            datosActuales={datos}
            datosAnteriores={datosComparacion.anterior}
            periodoActual={{
              inicio: new Date(filtros.fechaInicio),
              fin: new Date(filtros.fechaFin)
            }}
            periodoAnterior={{
              inicio: new Date(filtros.fechaInicio),
              fin: new Date(filtros.fechaFin)
            }}
            metricas={[
              { key: 'ventasTotales', label: 'Ventas Totales', formato: 'moneda', icono: DollarSign, color: '#16a34a' },
              { key: 'cantidadVentas', label: 'Cantidad de Ventas', formato: 'numero', icono: ShoppingCart, color: '#2563eb' },
              { key: 'ticketPromedio', label: 'Ticket Promedio', formato: 'moneda', icono: Target, color: '#7c3aed' }
            ]}
            mostrarTendencia={true}
          />
        )}

        {tipoVista === 'alertas' && (
          <AlertasInteligentes
            datos={datos}
            onAlertaClick={(alerta) => console.log('Alerta clickeada:', alerta)}
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin text-[#9c7561]" />
              <div>
                <p className="font-semibold">Generando reporte...</p>
                <p className="text-sm text-gray-600">Esto puede tomar unos momentos</p>
              </div>
            </div>
          </div>
        )}

        {/* Estado de exportación */}
        {exportando && (
          <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-xl flex items-center space-x-4">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <div>
                <p className="font-semibold">Exportando reporte...</p>
                <p className="text-sm text-gray-600">Preparando archivo para descarga</p>
              </div>
            </div>
          </div>
        )}

        {/* Configurador Simple Inline */}
        <div className="fixed bottom-6 right-6 z-50">
          <div className="flex flex-col items-end space-y-2">
            {/* Botón de Configuración */}
            <button
              onClick={() => {
                // Lógica simple para guardar configuración actual
                const configActual = {
                  id: `config-${Date.now()}`,
                  nombre: `Config ${reporteConfig.nombre}`,
                  tipoReporte: reporteActivo,
                  filtros: filtros,
                  fecha: new Date()
                };
                setConfiguracionesGuardadas(prev => [...prev, configActual]);
                console.log('Configuración guardada:', configActual);
              }}
              className="bg-[#9c7561] text-white p-3 rounded-full shadow-lg hover:bg-[#8a6550] transition-all"
              title="Guardar configuración actual"
            >
              <Save className="h-5 w-5" />
            </button>
            
            {/* Contador de configuraciones guardadas */}
            {configuracionesGuardadas.length > 0 && (
              <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-3 text-sm">
                <p className="text-gray-600">
                  {configuracionesGuardadas.length} configuración(es) guardada(s)
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}