// src/app/(admin)/admin/reportes/page.tsx - VERSIÓN PROFESIONAL
'use client';

import { useState, useEffect } from 'react';
import { 
  BarChart3, TrendingUp, Package, Users, Calendar, Download,
  Filter, Printer, Eye, DollarSign, ShoppingCart, Clock,
  AlertTriangle, CheckCircle, ChevronRight, Loader2,
  FileText, PieChart, Activity, Target
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { es } from 'date-fns/locale';
import { authenticatedFetch } from '@/hooks/useAuth';
import { exportToPdf } from '@/lib/utils/pdfExport';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';

// Componentes de gráficos usando recharts
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart as RePieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

interface FiltrosReporte {
  fechaInicio: string;
  fechaFin: string;
  sucursalId: string;
  tipoReporte: 'ventas' | 'inventario' | 'rendimiento' | 'personalizado';
  agruparPor: 'dia' | 'semana' | 'mes';
}

const COLORES = ['#311716', '#9c7561', '#eeb077', '#462625', '#8a6550', '#d4a574'];

export default function ReportesPage() {
  // Estados
  const [filtros, setFiltros] = useState<FiltrosReporte>({
    fechaInicio: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    fechaFin: format(endOfMonth(new Date()), 'yyyy-MM-dd'),
    sucursalId: '',
    tipoReporte: 'ventas',
    agruparPor: 'dia'
  });
  
  const [datos, setDatos] = useState<any>(null);
  const [ubicaciones, setUbicaciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showFiltros, setShowFiltros] = useState(true);
  
  // Presets de fechas
  const presetsFecha = [
    { label: 'Hoy', value: () => ({ inicio: new Date(), fin: new Date() }) },
    { label: 'Ayer', value: () => ({ inicio: subDays(new Date(), 1), fin: subDays(new Date(), 1) }) },
    { label: 'Últimos 7 días', value: () => ({ inicio: subDays(new Date(), 6), fin: new Date() }) },
    { label: 'Últimos 30 días', value: () => ({ inicio: subDays(new Date(), 29), fin: new Date() }) },
    { label: 'Este mes', value: () => ({ inicio: startOfMonth(new Date()), fin: new Date() }) },
    { label: 'Mes pasado', value: () => {
      const inicio = startOfMonth(subDays(startOfMonth(new Date()), 1));
      const fin = endOfMonth(inicio);
      return { inicio, fin };
    }}
  ];
  
  // Cargar ubicaciones
  useEffect(() => {
    cargarUbicaciones();
  }, []);
  
  // Cargar datos cuando cambian los filtros
  useEffect(() => {
    if (filtros.tipoReporte) {
      cargarDatos();
    }
  }, [filtros]);
  
  const cargarUbicaciones = async () => {
    try {
      const response = await authenticatedFetch('/api/admin/ubicaciones');
      if (response.ok) {
        const data = await response.json();
        setUbicaciones(data);
      }
    } catch (error) {
      console.error('Error al cargar ubicaciones:', error);
    }
  };
  
  const cargarDatos = async () => {
    setIsLoading(true);
    try {
      let endpoint = '';
      const params = new URLSearchParams({
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        ...(filtros.sucursalId && { sucursalId: filtros.sucursalId }),
        agruparPor: filtros.agruparPor
      });
      
      switch (filtros.tipoReporte) {
        case 'ventas':
          endpoint = `/api/reportes/ventas-detallado?${params}`;
          break;
        case 'inventario':
          endpoint = `/api/reportes/inventario?${params}`;
          break;
        case 'rendimiento':
          endpoint = `/api/reportes/rendimiento?${params}`;
          break;
        default:
          endpoint = `/api/reportes/ventas-detallado?${params}`;
      }
      
      const response = await authenticatedFetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setDatos(data);
      }
    } catch (error) {
      console.error('Error al cargar datos:', error);
    } finally {
      setIsLoading(false);
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
  
  const exportarReporte = (formato: 'pdf' | 'excel') => {
    if (!datos) return;
    
    // Implementar exportación según el tipo de reporte
    if (formato === 'pdf') {
      exportToPdf({
        title: `Reporte de ${filtros.tipoReporte}`,
        subtitle: `Del ${format(new Date(filtros.fechaInicio), 'dd/MM/yyyy')} al ${format(new Date(filtros.fechaFin), 'dd/MM/yyyy')}`,
        fileName: `reporte-${filtros.tipoReporte}-${format(new Date(), 'yyyyMMdd')}`,
        columns: [
          { header: 'Métrica', dataKey: 'metrica' },
          { header: 'Valor', dataKey: 'valor' }
        ],
        data: [
          { metrica: 'Ventas Totales', valor: `$${datos.resumen?.ventasTotales?.toFixed(2) || 0}` },
          { metrica: 'Cantidad de Ventas', valor: datos.resumen?.cantidadVentas || 0 },
          { metrica: 'Ticket Promedio', valor: `$${datos.resumen?.ticketPromedio?.toFixed(2) || 0}` }
        ]
      });
    }
  };
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#311716] to-[#462625] rounded-lg p-6 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Centro de Reportes</h1>
              <p className="text-white/80">Análisis detallado y métricas de tu negocio</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowFiltros(!showFiltros)}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition"
              >
                <Filter className="h-5 w-5" />
                {showFiltros ? 'Ocultar' : 'Mostrar'} Filtros
              </button>
              <button
                onClick={() => exportarReporte('pdf')}
                disabled={!datos || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white text-[#311716] rounded-lg hover:bg-gray-100 disabled:opacity-50"
              >
                <Download className="h-5 w-5" />
                Exportar
              </button>
            </div>
          </div>
        </div>
        
        {/* Panel de Filtros */}
        {showFiltros && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Configurar Reporte</h3>
            
            {/* Tipo de Reporte */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {[
                { id: 'ventas', label: 'Ventas', icon: ShoppingCart },
                { id: 'inventario', label: 'Inventario', icon: Package },
                { id: 'rendimiento', label: 'Rendimiento', icon: TrendingUp },
                { id: 'personalizado', label: 'Personalizado', icon: FileText }
              ].map(tipo => (
                <button
                  key={tipo.id}
                  onClick={() => setFiltros({ ...filtros, tipoReporte: tipo.id as any })}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    filtros.tipoReporte === tipo.id
                      ? 'border-[#9c7561] bg-[#9c7561]/10 text-[#311716]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <tipo.icon className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">{tipo.label}</p>
                </button>
              ))}
            </div>
            
            {/* Filtros de Fecha y Ubicación */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Inicio
                </label>
                <input
                  type="date"
                  value={filtros.fechaInicio}
                  onChange={(e) => setFiltros({ ...filtros, fechaInicio: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha Fin
                </label>
                <input
                  type="date"
                  value={filtros.fechaFin}
                  onChange={(e) => setFiltros({ ...filtros, fechaFin: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sucursal
                </label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Agrupar por
                </label>
                <select
                  value={filtros.agruparPor}
                  onChange={(e) => setFiltros({ ...filtros, agruparPor: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561]/20 focus:border-[#9c7561]"
                >
                  <option value="dia">Día</option>
                  <option value="semana">Semana</option>
                  <option value="mes">Mes</option>
                </select>
              </div>
            </div>
            
            {/* Presets de Fecha */}
            <div className="flex gap-2 flex-wrap">
              {presetsFecha.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => aplicarPreset(preset)}
                  className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Contenido del Reporte */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#9c7561]" />
            <span className="ml-3 text-lg">Generando reporte...</span>
          </div>
        ) : datos ? (
          <div className="space-y-6">
            {/* KPIs principales */}
            {filtros.tipoReporte === 'ventas' && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <DollarSign className="h-6 w-6 text-green-600" />
                      </div>
                      <span className="text-sm text-gray-500">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      ${datos.resumen?.ventasTotales?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {datos.resumen?.cantidadVentas || 0} ventas
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <ShoppingCart className="h-6 w-6 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-500">Ticket Promedio</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-800">
                      ${datos.resumen?.ticketPromedio?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Por transacción
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-purple-100 rounded-lg">
                        <Users className="h-6 w-6 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-500">Top Vendedor</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {datos.resumen?.porUsuario?.[0]?.usuario?.name || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      ${datos.resumen?.porUsuario?.[0]?._sum?.total?.toFixed(2) || '0'}
                    </p>
                  </div>
                  
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-orange-100 rounded-lg">
                        <Target className="h-6 w-6 text-orange-600" />
                      </div>
                      <span className="text-sm text-gray-500">Producto Estrella</span>
                    </div>
                    <p className="text-lg font-bold text-gray-800">
                      {datos.resumen?.porProducto?.[0]?.nombre || 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {datos.resumen?.porProducto?.[0]?.cantidad_vendida || 0} unidades
                    </p>
                  </div>
                </div>
                
                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                        <YAxis />
                        <Tooltip 
                          formatter={(value: any) => `$${value.toFixed(2)}`}
                          labelFormatter={(label: string | number | Date) => format(new Date(label), 'dd/MM/yyyy')}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="total_vendido" 
                          stroke="#9c7561" 
                          name="Ventas"
                          strokeWidth={2}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Gráfico de Medios de Pago */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <PieChart className="h-5 w-5 mr-2 text-gray-600" />
                      Distribución por Medio de Pago
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <RePieChart>
                        <Pie
                          data={datos.resumen?.mediosPago || []}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ medioPago, percent }: { medioPago: string; percent: number }) => `${medioPago}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="_sum.monto"
                        >
                          {(datos.resumen?.mediosPago || []).map((entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={COLORES[index % COLORES.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                
                {/* Tablas de Detalle */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top Productos */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Package className="h-5 w-5 mr-2 text-gray-600" />
                      Productos Más Vendidos
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead>
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                              Producto
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Cantidad
                            </th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                              Total
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {(datos.resumen?.porProducto || []).slice(0, 10).map((producto: any, idx: number) => (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-sm text-gray-900">
                                {producto.nombre}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                {producto.cantidad_vendida}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-900 text-right">
                                ${producto.total_vendido?.toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* Ventas por Hora */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Clock className="h-5 w-5 mr-2 text-gray-600" />
                      Ventas por Hora del Día
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={datos.resumen?.porHora || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="hora" />
                        <YAxis />
                        <Tooltip formatter={(value: any) => `$${value.toFixed(2)}`} />
                        <Bar dataKey="total_vendido" fill="#9c7561" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
            
            {/* Reporte de Inventario */}
            {filtros.tipoReporte === 'inventario' && datos && (
              <>
                {/* Resumen de Inventario */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {(datos.resumen?.valorInventario || []).map((ubicacion: any) => (
                    <div key={ubicacion.ubicacion_id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                      <h4 className="font-semibold text-gray-800 mb-3">{ubicacion.ubicacion}</h4>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Valor Total:</span>
                          <span className="font-semibold">${ubicacion.valor_total?.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Productos:</span>
                          <span>{ubicacion.productos_distintos}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">Unidades:</span>
                          <span>{ubicacion.unidades_totales}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Productos con Stock Bajo */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-orange-600" />
                    Productos con Stock Bajo ({datos.resumen?.totalProductosStockBajo || 0})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Producto
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                            Ubicación
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Stock Actual
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Stock Mínimo
                          </th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">
                            Diferencia
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(datos.resumen?.productosStockBajo || []).map((producto: any, idx: number) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 text-sm text-gray-900">
                              {producto.nombre}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-600">
                              {producto.ubicacion}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              <span className="text-red-600 font-semibold">
                                {producto.stock_actual}
                              </span>
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              {producto.stockMinimo}
                            </td>
                            <td className="px-4 py-2 text-sm text-gray-900 text-right">
                              <span className="text-red-600">
                                -{producto.stockMinimo - producto.stock_actual}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">
              Selecciona los filtros y tipo de reporte para comenzar
            </p>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}