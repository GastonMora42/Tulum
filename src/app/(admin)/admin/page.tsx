// src/app/(admin)/admin/page.tsx (VERSIÓN COMPLETAMENTE MEJORADA)
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Store,
  Factory,
  Building,
  ArrowUpRight,
  RefreshCw,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

interface DashboardStats {
  totalVentas: number;
  ventasHoy: number;
  ventasAyer: number;
  ventasMesActual: number;
  ventasMesAnterior: number;
  totalProductos: number;
  productosAgotandose: number;
  contingenciasPendientes: number;
  usuariosActivos: number;
  sucursales: SucursalMetrics[];
  ventasPorHora: HourlyMetric[];
  topProductos: ProductMetric[];
  alertas: Alert[];
}

interface SucursalMetrics {
  id: string;
  nombre: string;
  tipo: string;
  ventasHoy: number;
  ventasAyer: number;
  variacion: number;
  metaMensual: number;
  progresoMeta: number;
  stockBajo: number;
  contingencias: number;
  ultimaVenta: string;
  estado: 'excelente' | 'bien' | 'atencion' | 'critico';
}

interface HourlyMetric {
  hora: string;
  ventas: number;
  transacciones: number;
}

interface ProductMetric {
  id: string;
  nombre: string;
  ventasHoy: number;
  ingresos: number;
  variacion: number;
}

interface Alert {
  id: string;
  tipo: 'stock' | 'contingencia' | 'meta' | 'sistema';
  titulo: string;
  descripcion: string;
  urgencia: 'alta' | 'media' | 'baja';
  timestamp: string;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('hoy');
  const [selectedSucursal, setSelectedSucursal] = useState('todas');
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Auto-refresh cada 30 segundos si está habilitado
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(fetchDashboardData, 30000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedPeriod, selectedSucursal, autoRefresh]);

  const fetchDashboardData = async () => {
    try {
      const response = await authenticatedFetch(`/api/admin/dashboard?periodo=${selectedPeriod}&sucursal=${selectedSucursal}`);
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error al cargar dashboard:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (variation < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Activity className="h-4 w-4 text-gray-500" />;
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getSucursalEstadoColor = (estado: string) => {
    switch (estado) {
      case 'excelente': return 'bg-green-100 text-green-800 border-green-200';
      case 'bien': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'atencion': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'critico': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getAlertaColor = (urgencia: string) => {
    switch (urgencia) {
      case 'alta': return 'border-l-red-500 bg-red-50';
      case 'media': return 'border-l-yellow-500 bg-yellow-50';
      case 'baja': return 'border-l-blue-500 bg-blue-50';
      default: return 'border-l-gray-500 bg-gray-50';
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-[#eeb077] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const ventasVariation = stats?.ventasAyer ? ((stats.ventasHoy - stats.ventasAyer) / stats.ventasAyer) * 100 : 0;
  const mesVariation = stats?.ventasMesAnterior ? ((stats.ventasMesActual - stats.ventasMesAnterior) / stats.ventasMesAnterior) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header Moderno */}
      <div className="bg-gradient-to-r from-[#311716] via-[#462625] to-[#9c7561] rounded-2xl p-8 text-white shadow-xl">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-3">Centro de Control Ejecutivo</h1>
            <p className="text-white/90 text-lg">
              Bienvenido, <span className="font-semibold text-[#eeb077]">{user?.name}</span>
            </p>
            <p className="text-white/70 mt-1">
              Monitoreo en tiempo real • {new Date().toLocaleDateString('es-ES', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-[#eeb077]">${stats?.ventasHoy.toLocaleString() || '0'}</div>
              <div className="text-sm text-white/80">Ventas Hoy</div>
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setAutoRefresh(!autoRefresh)}
                className={`p-2 rounded-lg transition-colors ${autoRefresh ? 'bg-green-500/20 text-green-200' : 'bg-white/10 text-white/60'}`}
              >
                <RefreshCw className={`h-5 w-5 ${autoRefresh ? 'animate-spin' : ''}`} />
              </button>
              
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="bg-white/10 border border-white/20 text-white rounded-lg px-3 py-2 text-sm"
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Esta Semana</option>
                <option value="mes">Este Mes</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Métricas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Ventas Hoy */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas Hoy</p>
                <p className="text-3xl font-bold text-gray-900">${stats?.ventasHoy.toLocaleString()}</p>
                <div className={`flex items-center mt-2 ${getVariationColor(ventasVariation)}`}>
                  {getVariationIcon(ventasVariation)}
                  <span className="ml-1 text-sm font-medium">
                    {ventasVariation > 0 ? '+' : ''}{ventasVariation.toFixed(1)}% vs ayer
                  </span>
                </div>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>
          <div className="bg-green-50 px-6 py-3">
            <Link href="/admin/ventas" className="text-sm text-green-700 hover:text-green-900 flex items-center">
              Ver detalles <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Ventas del Mes */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Ventas del Mes</p>
                <p className="text-3xl font-bold text-gray-900">${stats?.ventasMesActual.toLocaleString()}</p>
                <div className={`flex items-center mt-2 ${getVariationColor(mesVariation)}`}>
                  {getVariationIcon(mesVariation)}
                  <span className="ml-1 text-sm font-medium">
                    {mesVariation > 0 ? '+' : ''}{mesVariation.toFixed(1)}% vs mes anterior
                  </span>
                </div>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-6 py-3">
            <Link href="/admin/reportes" className="text-sm text-blue-700 hover:text-blue-900 flex items-center">
              Ver reportes <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Productos */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Productos</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.totalProductos}</p>
                <div className="flex items-center mt-2 text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">
                    {stats?.productosAgotandose} con stock bajo
                  </span>
                </div>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Package className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
          <div className="bg-orange-50 px-6 py-3">
            <Link href="/admin/productos" className="text-sm text-orange-700 hover:text-orange-900 flex items-center">
              Gestionar productos <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>

        {/* Contingencias */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden hover:shadow-xl transition-shadow">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Contingencias</p>
                <p className="text-3xl font-bold text-gray-900">{stats?.contingenciasPendientes}</p>
                <div className="flex items-center mt-2 text-red-600">
                  <Clock className="h-4 w-4" />
                  <span className="ml-1 text-sm font-medium">Pendientes</span>
                </div>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-red-50 px-6 py-3">
            <Link href="/admin/contingencias" className="text-sm text-red-700 hover:text-red-900 flex items-center">
              Revisar contingencias <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>

      {/* Layout de 3 Columnas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna 1: Sucursales */}
        <div className="lg:col-span-2 space-y-6">
          {/* Sucursales Performance */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Performance por Sucursal</h3>
                <div className="flex items-center space-x-2">
                  <select
                    value={selectedSucursal}
                    onChange={(e) => setSelectedSucursal(e.target.value)}
                    className="text-sm border border-gray-300 rounded-md px-2 py-1"
                  >
                    <option value="todas">Todas las sucursales</option>
                    {stats?.sucursales.map(sucursal => (
                      <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="space-y-4">
                {stats?.sucursales.map((sucursal) => (
                  <div key={sucursal.id} className={`border rounded-lg p-4 ${getSucursalEstadoColor(sucursal.estado)}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-white rounded-lg">
                          {sucursal.tipo === 'fabrica' ? <Factory className="h-5 w-5" /> :
                           sucursal.tipo === 'sucursal' ? <Store className="h-5 w-5" /> :
                           <Building className="h-5 w-5" />}
                        </div>
                        <div>
                          <h4 className="font-semibold">{sucursal.nombre}</h4>
                          <p className="text-sm opacity-75">
                            Última venta: {new Date(sucursal.ultimaVenta).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-lg">${sucursal.ventasHoy.toLocaleString()}</p>
                        <div className="flex items-center text-sm">
                          {getVariationIcon(sucursal.variacion)}
                          <span className="ml-1">{sucursal.variacion.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Barra de progreso hacia meta */}
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1">
                        <span>Progreso hacia meta mensual</span>
                        <span>{sucursal.progresoMeta.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-white/50 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full transition-all duration-300 ${
                            sucursal.progresoMeta >= 100 ? 'bg-green-500' :
                            sucursal.progresoMeta >= 80 ? 'bg-blue-500' :
                            sucursal.progresoMeta >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(sucursal.progresoMeta, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                    
                    {/* Indicadores adicionales */}
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{sucursal.stockBajo}</p>
                        <p className="opacity-75">Stock Bajo</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{sucursal.contingencias}</p>
                        <p className="opacity-75">Contingencias</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">${sucursal.metaMensual.toLocaleString()}</p>
                        <p className="opacity-75">Meta Mensual</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Top Productos */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Productos Más Vendidos Hoy</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {stats?.topProductos.map((producto, index) => (
                  <div key={producto.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{producto.nombre}</p>
                        <p className="text-sm text-gray-500">{producto.ventasHoy} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">${producto.ingresos.toLocaleString()}</p>
                      <div className={`flex items-center text-sm ${getVariationColor(producto.variacion)}`}>
                        {getVariationIcon(producto.variacion)}
                        <span className="ml-1">{producto.variacion.toFixed(1)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Columna 2: Alertas y Acciones Rápidas */}
        <div className="space-y-6">
          {/* Alertas */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Alertas del Sistema</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {stats?.alertas.map((alerta) => (
                  <div key={alerta.id} className={`border-l-4 p-3 rounded-r-lg ${getAlertaColor(alerta.urgencia)}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{alerta.titulo}</p>
                        <p className="text-xs text-gray-600 mt-1">{alerta.descripcion}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(alerta.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        alerta.urgencia === 'alta' ? 'bg-red-100 text-red-800' :
                        alerta.urgencia === 'media' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {alerta.urgencia.toUpperCase()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Acciones Rápidas */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <Link
                  href="/admin/productos/nuevo"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
                >
                  <div className="text-center">
                    <Package className="h-6 w-6 text-gray-400 group-hover:text-[#eeb077] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-[#311716]">Nuevo Producto</p>
                  </div>
                </Link>

                <Link
                  href="/admin/envios/nuevo"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
                >
                  <div className="text-center">
                    <Activity className="h-6 w-6 text-gray-400 group-hover:text-[#eeb077] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-[#311716]">Nuevo Envío</p>
                  </div>
                </Link>

                <Link
                  href="/admin/usuarios/nuevo"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
                >
                  <div className="text-center">
                    <Users className="h-6 w-6 text-gray-400 group-hover:text-[#eeb077] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-[#311716]">Nuevo Usuario</p>
                  </div>
                </Link>

                <Link
                  href="/admin/reportes"
                  className="flex items-center justify-center p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
                >
                  <div className="text-center">
                    <BarChart3 className="h-6 w-6 text-gray-400 group-hover:text-[#eeb077] mx-auto mb-2" />
                    <p className="text-sm font-medium text-gray-600 group-hover:text-[#311716]">Ver Reportes</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>

          {/* Métricas Rápidas */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
              <h3 className="text-lg font-semibold text-gray-900">Resumen Ejecutivo</h3>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Usuarios Activos</span>
                <span className="font-semibold">{stats?.usuariosActivos}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Sucursales Operativas</span>
                <span className="font-semibold">{stats?.sucursales.length}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Productos en Catálogo</span>
                <span className="font-semibold">{stats?.totalProductos}</span>
              </div>
              <div className="pt-3 border-t border-gray-200">
                <button className="w-full bg-[#311716] text-white py-2 px-4 rounded-lg hover:bg-[#462625] transition-colors flex items-center justify-center">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}