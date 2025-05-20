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
  WifiOff,
  Truck,
  Package,
  Users,
  Calendar,
  TrendingUp,
  Loader,
  CreditCard,
  RefreshCw
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
  enviosPendientes?: number;
}

export default function PDVDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const { isOnline, pendingOperations } = useOffline();
  const sucursalNombre = typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalNombre') : '';
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

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
            ],
            enviosPendientes: 0
          });
          return;
        }

        // Obtener ID de sucursal
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha configurado una sucursal');
        }
        
        console.log('Cargando estadísticas para sucursal:', sucursalId);
        
        // Cargar datos en paralelo para mejor rendimiento
        const [cajaResponse, ventasResponse, stockResponse, contingenciasResponse, enviosResponse] = await Promise.all([
          authenticatedFetch(`/api/pdv/cierre/resumen?sucursalId=${sucursalId}`),
          authenticatedFetch(`/api/pdv/ventas?sucursalId=${sucursalId}`),
          authenticatedFetch(`/api/reportes/stock/bajo?sucursalId=${sucursalId}`), 
          authenticatedFetch(`/api/contingencias?estado=pendiente&origen=sucursal&ubicacionId=${sucursalId}`),
          authenticatedFetch(`/api/envios?destinoId=${sucursalId}&estado=pendiente,enviado,en_transito`)
        ]);
        
        // Verificar cada respuesta individualmente para mejor manejo de errores
        if (!cajaResponse.ok) console.warn('Error al cargar datos de caja:', await cajaResponse.text());
        if (!ventasResponse.ok) console.warn('Error al cargar ventas:', await ventasResponse.text());
        if (!stockResponse.ok) console.warn('Error al cargar stock bajo:', await stockResponse.text());
        if (!contingenciasResponse.ok) console.warn('Error al cargar contingencias:', await contingenciasResponse.text());
        if (!enviosResponse.ok) console.warn('Error al cargar envíos:', await enviosResponse.text());
        
        // Procesar respuestas
        const cajaData = cajaResponse.ok ? await cajaResponse.json() : { abierto: false };
        const ventasData = ventasResponse.ok ? await ventasResponse.json() : [];
        const stockData = stockResponse.ok ? await stockResponse.json() : [];
        const contingenciasData = contingenciasResponse.ok ? await contingenciasResponse.json() : [];
        const enviosData = enviosResponse.ok ? await enviosResponse.json() : [];
        
        // Extraer datos de ventas según la estructura
        const ventas = Array.isArray(ventasData) ? ventasData : 
                      (ventasData.data ? ventasData.data : []);
        
        // Calcular métricas de ventas
        const hoy = new Date().toDateString();
        const fechaSemanaAtras = new Date();
        fechaSemanaAtras.setDate(fechaSemanaAtras.getDate() - 7);
        
        const ventasHoy = ventas.filter((v: any) => 
          new Date(v.fecha).toDateString() === hoy
        ).length;
        
        const ventasSemana = ventas.filter((v: any) => 
          new Date(v.fecha) > fechaSemanaAtras
        ).length;

        console.log(`Datos cargados - Ventas: ${ventas.length}, Stock bajo: ${stockData.length}, Contingencias: ${contingenciasData.length}, Envíos pendientes: ${enviosData.length}`);
        
        // Formatear datos para el state
        setStats({
          ventas: {
            total: ventas.length || 0,
            hoy: ventasHoy || 0,
            semana: ventasSemana || 0
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
              item.sucursalId === sucursalId || item.ubicacionId === sucursalId).slice(0, 5) || []
          },
          contingenciasPendientes: contingenciasData.length || 0,
          ventasRecientes: ventas.slice(0, 5).map((v: any) => ({
            id: v.id,
            fecha: v.fecha,
            total: v.total,
            medioPago: v.pagos && v.pagos.length > 0 ? v.pagos[0].medioPago : 'efectivo'
          })) || [],
          enviosPendientes: enviosData.length || 0
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
          ],
          enviosPendientes: 0
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, [isOnline, refreshTrigger]);

  const handleRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

 // Función para abrir caja
const handleAbrirCaja = async () => {
  try {
    setIsLoading(true); // Si tienes un estado de carga
    
    const sucursalId = localStorage.getItem('sucursalId');
    
    if (!sucursalId) {
      // Usa una alerta si no tienes acceso a setNotification
      alert('No se ha definido una sucursal para este punto de venta');
      return;
    }
    
    // Solicitar monto inicial
    const montoInicial = prompt('Ingrese el monto inicial de la caja:');
    
    if (montoInicial === null) return; // Usuario canceló
    
    const montoInicialNum = parseFloat(montoInicial);
    
    if (isNaN(montoInicialNum) || montoInicialNum < 0) {
      alert('El monto inicial debe ser un número válido mayor o igual a cero');
      return;
    }
    
    // Crear caja
    const response = await authenticatedFetch('/api/pdv/cierre', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sucursalId,
        montoInicial: montoInicialNum
      })
    });
    
    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Error al abrir la caja');
    }
    
    alert('Caja abierta correctamente');
    
    // Refrescar la página para mostrar el estado actualizado
    setTimeout(() => {
      setRefreshTrigger(prev => prev + 1);
    }, 1500);
  } catch (error) {
    console.error('Error al abrir caja:', error);
    alert('Error al abrir la caja: ' + (error instanceof Error ? error.message : 'Error desconocido'));
  } finally {
    setIsLoading(false); // Si tienes un estado de carga
  }
};

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-[#311716] border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-gray-600">Cargando datos del punto de venta...</p>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span className="block sm:inline">{error}</span>
        </div>
        <button 
          onClick={handleRefresh}
          className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 font-medium py-2 px-4 rounded flex items-center"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section with Refresh Button */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Punto de Venta</h1>
          <p className="text-gray-600 mt-1">
            {sucursalNombre ? `${sucursalNombre} - ` : ''}
            Bienvenido al centro de ventas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            className="bg-[#311716] text-white px-3 py-2 rounded-lg hover:bg-[#462625] transition-colors flex items-center text-sm"
          >
            <RefreshCw className="h-4 w-4 mr-1" />
            Actualizar
          </button>
          <div className="bg-white px-4 py-2 rounded-lg border border-blue-100 shadow-sm">
            <p className="text-sm font-medium text-gray-800">
              Hola, <span className="text-[#311716] font-bold">{user?.name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Estado de Caja y Ventas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Estado de Caja */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#f8f5f3] flex items-center">
            <DollarSign className="h-5 w-5 text-[#9c7561] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Estado de Caja</h2>
          </div>
          
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-gray-700 font-medium">Estado actual:</span>
              {stats?.caja.estado === 'abierta' ? (
                <span className="bg-green-100 text-green-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                  <Check className="h-4 w-4 mr-1" />
                  Caja abierta
                </span>
              ) : (
                <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  Caja cerrada
                </span>
              )}
            </div>
            
            {stats?.caja.estado === 'abierta' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-[#f8f5f3] p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Monto Inicial</p>
                    <p className="text-xl font-bold">${stats.caja.montoInicial?.toFixed(2)}</p>
                  </div>
                  <div className="bg-[#f8f5f3] p-3 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">Total Ventas</p>
                    <p className="text-xl font-bold">${stats.caja.totalVentas?.toFixed(2)}</p>
                  </div>
                </div>
                
                <div className="bg-[#f8f5f3] p-3 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Efectivo</p>
                    <p className="text-lg font-bold">${stats.caja.ventasEfectivo?.toFixed(2)}</p>
                  </div>
                  <div className="h-8 border-r border-gray-300"></div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Digital</p>
                    <p className="text-lg font-bold">${stats.caja.ventasDigital?.toFixed(2)}</p>
                  </div>
                </div>
                
                <Link 
                  href="/pdv/cierre" 
                  className="w-full mt-4 bg-[#311716] text-white py-2 px-4 rounded-lg hover:bg-[#462625] transition-colors flex items-center justify-center"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Ir a Cierre de Caja
                </Link>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No hay una caja abierta actualmente</p>
                <button 
  onClick={handleAbrirCaja}
  className="bg-[#311716] text-white py-2 px-4 rounded-lg hover:bg-[#462625] transition-colors inline-flex items-center"
>
  <Plus className="h-4 w-4 mr-2" />
  Abrir Caja
</button>
              </div>
            )}
          </div>
        </div>
        
        {/* Resumen de Ventas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#f8f5f3] flex items-center">
            <BarChart2 className="h-5 w-5 text-[#9c7561] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Resumen de Ventas</h2>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-[#f8f5f3] p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Hoy</p>
                <p className="text-xl font-bold">{stats?.ventas.hoy}</p>
                <p className="text-xs text-[#9c7561]">ventas</p>
              </div>
              <div className="bg-[#f8f5f3] p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Semana</p>
                <p className="text-xl font-bold">{stats?.ventas.semana}</p>
                <p className="text-xs text-[#9c7561]">ventas</p>
              </div>
              <div className="bg-[#f8f5f3] p-3 rounded-lg text-center">
                <p className="text-xs text-gray-500 mb-1">Total</p>
                <p className="text-xl font-bold">{stats?.ventas.total}</p>
                <p className="text-xs text-[#9c7561]">ventas</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-gray-700 font-medium">Métodos de pago:</span>
            </div>
            
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="bg-[#f8f5f3] p-3 rounded-lg flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <DollarSign className="h-4 w-4 text-green-600 mr-1" />
                  Efectivo
                </span>
                <span className="font-medium">${stats?.caja.ventasEfectivo?.toFixed(2) || "0.00"}</span>
              </div>
              
              <div className="bg-[#f8f5f3] p-3 rounded-lg flex items-center justify-between">
                <span className="flex items-center text-gray-700">
                  <CreditCard className="h-4 w-4 text-blue-600 mr-1" />
                  Digital
                </span>
                <span className="font-medium">${stats?.caja.ventasDigital?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
            
            <Link 
              href="/pdv/ventas" 
              className="w-full mt-6 border border-[#311716] text-[#311716] py-2 px-4 rounded-lg hover:bg-[#f8f5f3] transition-colors flex items-center justify-center"
            >
              <Book className="h-4 w-4 mr-2" />
              Ver Historial de Ventas
            </Link>
          </div>
        </div>
      </div>

      {/* Estado de Stock y Alertas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stock Crítico */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#f8f5f3] flex items-center justify-between">
            <div className="flex items-center">
              <Package className="h-5 w-5 text-[#9c7561] mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Stock Crítico</h2>
            </div>
            <Link 
              href="/pdv/conciliacion" 
              className="text-[#311716] hover:text-[#9c7561] text-sm flex items-center"
            >
              Ver Inventario <ArrowUpRight className="h-3 w-3 ml-1" />
            </Link>
          </div>
          
          <div className="p-6">
            {stats?.stock.bajosProductos && stats.stock.bajosProductos.length > 0 ? (
              <div className="space-y-3">
                {stats.stock.bajosProductos.map(producto => (
                  <div key={producto.id} className="bg-amber-50 rounded-lg p-3 border border-amber-100">
                    <div className="flex justify-between mb-1">
                      <span className="font-medium text-gray-800">{producto.nombre}</span>
                      <span className="text-amber-700 text-sm">
                        {producto.cantidad} / {producto.stockMinimo} unidades
                      </span>
                    </div>
                    <div className="w-full bg-amber-200 rounded-full h-2">
                      <div 
                        className="bg-amber-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(100, (producto.cantidad / producto.stockMinimo) * 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
                
                <div className="pt-3 border-t border-gray-100 mt-4">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-gray-700">Envíos pendientes:</span>
                    <span className="bg-blue-100 text-blue-800 text-sm font-medium px-3 py-1 rounded-full">
                      {stats.enviosPendientes || 0}
                    </span>
                  </div>
                  
                  <Link 
                    href="/pdv/recepcion" 
                    className="w-full bg-[#311716] text-white py-2 px-4 rounded-lg hover:bg-[#462625] transition-colors flex items-center justify-center"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Recibir Envíos
                  </Link>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Check className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-800 mb-2">Stock Adecuado</h3>
                <p className="text-gray-500 mb-6">Todos los productos tienen stock suficiente</p>
                
                <Link 
                  href="/pdv/recepcion" 
                  className="inline-flex items-center text-[#311716] hover:text-[#9c7561]"
                >
                  <Truck className="h-4 w-4 mr-1" />
                  Verificar envíos pendientes ({stats?.enviosPendientes || 0})
                </Link>
              </div>
            )}
          </div>
        </div>
        
        {/* Alertas y Contingencias */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 bg-[#f8f5f3] flex items-center justify-between">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-[#9c7561] mr-2" />
              <h2 className="text-lg font-medium text-gray-900">Alertas</h2>
            </div>
            <span className="bg-red-100 text-red-800 text-sm font-medium px-3 py-1 rounded-full">
              {stats?.contingenciasPendientes || 0}
            </span>
          </div>
          
          <div className="p-6">
            <div className="bg-[#f8f5f3] p-4 rounded-lg mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Contingencias:</span>
                <span className="text-red-600 font-bold">{stats?.contingenciasPendientes}</span>
              </div>
              <p className="text-sm text-gray-600">
                {stats?.contingenciasPendientes 
                  ? `Tienes ${stats.contingenciasPendientes} contingencias pendientes que requieren atención.` 
                  : 'No hay contingencias pendientes.'}
              </p>
            </div>
            
            <Link 
              href="/pdv/contingencias" 
              className="w-full mb-3 bg-amber-100 text-amber-800 border border-amber-200 py-2 px-4 rounded-lg hover:bg-amber-200 transition-colors flex items-center justify-center"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Ver Contingencias
            </Link>
            
            <Link 
              href="/pdv/contingencias/nueva" 
              className="w-full bg-[#311716] text-white py-2 px-4 rounded-lg hover:bg-[#462625] transition-colors flex items-center justify-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Reportar Nueva
            </Link>
          </div>
        </div>
      </div>

      {/* Últimas Ventas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f8f5f3] flex items-center justify-between">
          <div className="flex items-center">
            <ShoppingBag className="h-5 w-5 text-[#9c7561] mr-2" />
            <h2 className="text-lg font-medium text-gray-900">Últimas Ventas</h2>
          </div>
          <Link 
            href="/pdv/ventas" 
            className="text-[#311716] hover:text-[#9c7561] text-sm flex items-center"
          >
            Ver todas <ArrowUpRight className="h-3 w-3 ml-1" />
          </Link>
        </div>
        
        <div className="divide-y divide-gray-100">
          {stats?.ventasRecientes && stats.ventasRecientes.length > 0 ? (
            stats.ventasRecientes.map((venta) => (
              <Link key={venta.id} href={`/pdv/ventas/${venta.id}`} className="block hover:bg-gray-50">
                <div className="px-6 py-4 flex justify-between items-center">
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
                    <span className="text-sm text-[#9c7561] font-bold">${venta.total.toFixed(2)}</span>
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

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
          <Coins className="h-5 w-5 text-[#9c7561] mr-2" />
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Link
            href="/pdv"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#9c7561] hover:bg-[#f8f5f3] transition-colors group"
          >
            <div className="bg-[#f8f5f3] p-3 rounded-lg group-hover:bg-white transition-colors">
              <ShoppingCart className="h-6 w-6 text-[#311716]" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Nueva</span>
              <span className="text-sm text-gray-600">Venta</span>
            </div>
          </Link>
          
          <Link
            href="/pdv/cierre"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#9c7561] hover:bg-[#f8f5f3] transition-colors group"
          >
            <div className="bg-[#f8f5f3] p-3 rounded-lg group-hover:bg-white transition-colors">
              <ReceiptText className="h-6 w-6 text-[#311716]" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Cierre</span>
              <span className="text-sm text-gray-600">de Caja</span>
            </div>
          </Link>
          
          <Link
            href="/pdv/contingencias/nueva"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#9c7561] hover:bg-[#f8f5f3] transition-colors group"
          >
            <div className="bg-[#f8f5f3] p-3 rounded-lg group-hover:bg-white transition-colors">
              <AlertTriangle className="h-6 w-6 text-[#311716]" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Reportar</span>
              <span className="text-sm text-gray-600">Contingencia</span>
            </div>
          </Link>
          
          <Link
            href="/pdv/conciliacion"
            className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-[#9c7561] hover:bg-[#f8f5f3] transition-colors group"
          >
            <div className="bg-[#f8f5f3] p-3 rounded-lg group-hover:bg-white transition-colors">
              <Archive className="h-6 w-6 text-[#311716]" />
            </div>
            <div>
              <span className="font-medium text-gray-800 block">Control</span>
              <span className="text-sm text-gray-600">Inventario</span>
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