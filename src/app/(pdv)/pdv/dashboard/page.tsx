// src/app/(pdv)/pdv/dashboard/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/hooks/useOffline';
import { 
  ShoppingBag, 
  DollarSign, 
  AlertTriangle, 
  Book,
  ArrowUpRight,
  Plus,
  Clock,
  Check,
  BarChart2,
  ShoppingCart,
  Archive,
  ReceiptText,
  Coins,
  WifiOff
} from 'lucide-react';

interface DashboardStats {
  ventas: {
    total: number;
    hoy: number;
    semana: number;
  };
  caja: {
    estado: 'abierta' | 'cerrada';
    montoInicial?: number;
    ventasEfectivo?: number;
    ventasDigital?: number;
    totalVentas?: number;
  };
  stock: {
    bajosProductos: Array<{
      id: string;
      nombre: string;
      cantidad: number;
      stockMinimo: number;
    }>;
  };
  contingenciasPendientes: number;
  ventasRecientes: Array<{
    id: string;
    fecha: string;
    total: number;
    medioPago: string;
  }>;
}

export default function PDVDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { isOnline, pendingOperations } = useOffline();
  const sucursalNombre = typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalNombre') : '';

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Si estamos offline, cargar datos simulados
        if (!isOnline) {
          setStats({
            ventas: {
              total: 45,
              hoy: 8,
              semana: 32
            },
            caja: {
              estado: 'abierta',
              montoInicial: 5000,
              ventasEfectivo: 3200,
              ventasDigital: 6800,
              totalVentas: 10000
            },
            stock: {
              bajosProductos: [
                {id: 'prod1', nombre: 'Difusor Bambú', cantidad: 3, stockMinimo: 5}
              ]
            },
            contingenciasPendientes: 2,
            ventasRecientes: [
              {id: 'vnt1', fecha: new Date().toISOString(), total: 800, medioPago: 'efectivo'},
              {id: 'vnt2', fecha: new Date(Date.now() - 3600000).toISOString(), total: 1200, medioPago: 'tarjeta_credito'}
            ]
          });
          return;
        }

        // Cargar estado de caja
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha configurado una sucursal');
        }
        
        const cajaResponse = await authenticatedFetch(`/api/pdv/cierre/resumen?sucursalId=${sucursalId}`);
        const cajaData = await cajaResponse.json();
        
        // Cargar ventas recientes
        const ventasResponse = await authenticatedFetch(`/api/pdv/ventas?sucursalId=${sucursalId}&limit=5`);
        const ventasData = await ventasResponse.json();
        
        // Cargar stock bajo
        const stockResponse = await authenticatedFetch(`/api/reportes/stock/bajo`);
        const stockData = await stockResponse.json();
        
        // Cargar contingencias
        const contingenciasResponse = await authenticatedFetch('/api/contingencias?estado=pendiente&origen=sucursal');
        const contingenciasData = await contingenciasResponse.json();
        
        // Formatear datos
        setStats({
          ventas: {
            total: ventasData.length || 0,
            hoy: ventasData.filter((v: any) => 
              new Date(v.fecha).toDateString() === new Date().toDateString()).length || 0,
            semana: ventasData.filter((v: any) => 
              new Date(v.fecha) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)).length || 0
          },
          caja: cajaData.abierto ? {
            estado: 'abierta',
            montoInicial: cajaData.montoInicial || 0,
            ventasEfectivo: cajaData.ventasEfectivo || 0,
            ventasDigital: cajaData.ventasDigital || 0,
            totalVentas: cajaData.totalVentas || 0
          } : { estado: 'cerrada' },
          stock: {
            bajosProductos: stockData.filter((item: any) => 
              item.sucursalId === sucursalId).slice(0, 3) || []
          },
          contingenciasPendientes: contingenciasData.length || 0,
          ventasRecientes: ventasData.slice(0, 5).map((v: any) => ({
            id: v.id,
            fecha: v.fecha,
            total: v.total,
            medioPago: v.pagos[0]?.medioPago || 'efectivo'
          })) || []
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas del dashboard');
        
        // Datos de fallback para desarrollo
        setStats({
          ventas: {
            total: 45,
            hoy: 8,
            semana: 32
          },
          caja: {
            estado: 'abierta',
            montoInicial: 5000,
            ventasEfectivo: 3200,
            ventasDigital: 6800,
            totalVentas: 10000
          },
          stock: {
            bajosProductos: [
              {id: 'prod1', nombre: 'Difusor Bambú', cantidad: 3, stockMinimo: 5}
            ]
          },
          contingenciasPendientes: 2,
          ventasRecientes: [
            {id: 'vnt1', fecha: new Date().toISOString(), total: 800, medioPago: 'efectivo'},
            {id: 'vnt2', fecha: new Date(Date.now() - 3600000).toISOString(), total: 1200, medioPago: 'tarjeta_credito'}
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isOnline]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Punto de Venta</h1>
          <p className="text-gray-600 mt-1">
            {sucursalNombre ? `${sucursalNombre} - ` : ''}
            Bienvenido al centro de ventas
          </p>
        </div>
        <div className="bg-white px-6 py-3 rounded-lg border border-blue-100 shadow-sm">
          <p className="text-sm font-medium text-gray-800">
            Hola, <span className="text-blue-600 font-bold">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-800">Total Ventas</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.ventas.total || 0}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <ShoppingBag className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <div className="px-6 py-2 bg-blue-50 grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="block text-gray-600 font-semibold">Hoy</span>
              <span className="font-bold text-gray-800">{stats?.ventas.hoy || 0}</span>
            </div>
            <div>
              <span className="block text-gray-600 font-semibold">Esta semana</span>
              <span className="font-bold text-gray-800">{stats?.ventas.semana || 0}</span>
            </div>
          </div>
        </div>

        {/* Estado caja */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-800">Caja</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.caja.estado === 'abierta' ? (
                  <span className="text-green-600">Abierta</span>
                ) : (
                  <span className="text-red-600">Cerrada</span>
                )}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <DollarSign className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          {stats?.caja.estado === 'abierta' && (
            <div className="px-6 py-2 bg-blue-50 grid grid-cols-2 gap-2 text-center text-xs">
              <div>
                <span className="block text-gray-600 font-semibold">Efectivo</span>
                <span className="font-bold text-gray-800">${stats?.caja.ventasEfectivo?.toFixed(2) || 0}</span>
              </div>
              <div>
                <span className="block text-gray-600 font-semibold">Digital</span>
                <span className="font-bold text-gray-800">${stats?.caja.ventasDigital?.toFixed(2) || 0}</span>
              </div>
            </div>
          )}
          {stats?.caja.estado === 'cerrada' && (
            <Link 
              href="/pdv"
              className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
            >
              Abrir Caja
            </Link>
          )}
        </div>

        {/* Alertas Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-800">Alertas Stock</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.stock.bajosProductos.length || 0}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <Link 
            href="/pdv/stock"
            className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
          >
            Ver stock
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Contingencias */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-800">Contingencias</h3>
              <p className="text-3xl font-bold text-gray-800 mt-2">{stats?.contingenciasPendientes || 0}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-blue-500" />
            </div>
          </div>
          <Link 
            href="/pdv/contingencias" 
            className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-50 text-blue-600 font-medium hover:bg-blue-100 transition-colors"
          >
            Ver contingencias
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ventas Recientes */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-800">Ventas Recientes</h3>
            <Link 
              href="/pdv/ventas" 
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center"
            >
              Ver todas <ArrowUpRight className="h-4 w-4 ml-1"/>
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.ventasRecientes && stats.ventasRecientes.length > 0 ? (
              stats.ventasRecientes.map((venta) => (
                <Link key={venta.id} href={`/pdv/ventas/${venta.id}`}>
                  <div className="px-6 py-4 hover:bg-gray-50 flex justify-between items-center transition-colors">
                    <div>
                      <span className={`px-2 py-1 text-xs rounded-full font-medium mr-2 ${
                        venta.medioPago === 'efectivo' ? 'bg-green-100 text-green-800' : 
                        venta.medioPago === 'tarjeta_credito' ? 'bg-blue-100 text-blue-800' : 
                        'bg-purple-100 text-purple-800'
                      }`}>
                        {venta.medioPago === 'efectivo' ? 'Efectivo' : 
                         venta.medioPago === 'tarjeta_credito' ? 'Tarjeta' : 
                         venta.medioPago === 'tarjeta_debito' ? 'Débito' : 'Otro'}
                      </span>
                      <span className="font-medium text-gray-800">Venta #{venta.id.slice(-6)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm text-blue-600 font-bold">${venta.total.toFixed(2)}</span>
                      <span className="text-xs text-gray-500 block">{new Date(venta.fecha).toLocaleDateString()} {new Date(venta.fecha).toLocaleTimeString().substring(0, 5)}</span>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="py-8 text-center">
                <ShoppingBag className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay ventas recientes</p>
              </div>
            )}
          </div>
        </div>

        {/* Sección Stock Bajo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100 bg-blue-50">
            <h3 className="text-lg font-semibold text-gray-800">Stock Crítico</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {stats?.stock && stats.stock.bajosProductos.length > 0 ? (
              <div className="px-6 py-4">
                {stats.stock.bajosProductos.map(producto => (
                  <div key={producto.id} className="mb-3 bg-red-50 rounded-lg p-3 border border-red-100">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-800">{producto.nombre}</span>
                      <span className="text-red-700 text-sm">
                        {producto.cantidad} / {producto.stockMinimo} unidades
                      </span>
                    </div>
                    <div className="w-full bg-red-200 rounded-full h-2">
                      <div 
                        className="bg-red-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (producto.cantidad / producto.stockMinimo) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                <Link 
                  href="/pdv/stock" 
                  className="mt-2 inline-flex w-full items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Archive className="mr-2 h-4 w-4" />
                  Gestionar stock
                </Link>
              </div>
            ) : (
              <div className="py-8 text-center">
                <Check className="w-12 h-12 text-green-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay alertas de stock</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/pdv"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-white transition-colors">
              <ShoppingCart className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Nueva</span>
              <span className="text-sm text-gray-600">Venta</span>
            </div>
          </Link>
          
          <Link
            href="/pdv/cierre"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-white transition-colors">
              <ReceiptText className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Cierre</span>
              <span className="text-sm text-gray-600">de Caja</span>
            </div>
          </Link>
          
          <Link
            href="/pdv/contingencias/nueva"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
          >
            <div className="bg-blue-50 p-3 rounded-lg group-hover:bg-white transition-colors">
              <AlertTriangle className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Reportar</span>
              <span className="text-sm text-gray-600">Contingencia</span>
            </div>
          </Link>
        </div>
      </div>

      {/* Estado Offline */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-4">
          <div className="bg-yellow-100 p-3 rounded-full">
            <WifiOff className="h-6 w-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium text-yellow-800 mb-1">Modo Sin Conexión</h3>
            <p className="text-sm text-yellow-700">
              Estás trabajando en modo offline. Las ventas se sincronizarán automáticamente cuando se restablezca la conexión.
              {pendingOperations > 0 && ` (${pendingOperations} operaciones pendientes)`}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}