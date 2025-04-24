// src/app/(fabrica)/fabrica/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { 
  Factory, 
  Beaker, 
  Archive, 
  AlertTriangle, 
  Book,
  ArrowUpRight,
  AlertCircle,
  Plus,
  Clock,
  TruckIcon,
  Clipboard,
  ArrowRight,
  CheckCircle,
  PackageCheck,
  PackageOpen,
  Layers,
  BarChart2
} from 'lucide-react';

interface DashboardStats {
  producciones: {
    total: number;
    pendientes: number;
    enProceso: number;
    completadas: number;
  };
  envios: {
    pendientes: number;
    enTransito: number;
  };
  stock: {
    bajosInsumos: Array<{
      id: string;
      nombre: string;
      cantidad: number;
      unidadMedida: string;
      stockMinimo: number;
    }>;
    bajosProductos: Array<{
      id: string;
      nombre: string;
      cantidad: number;
      stockMinimo: number;
    }>;
  };
  produccionesRecientes: Array<{
    id: string;
    receta: {
      nombre: string;
    };
    cantidad: number;
    fechaInicio: string;
    estado: string;
  }>;
  contingenciasPendientes: number;
}

export default function FabricaDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);

        // Cargar producción para estadísticas
        const produccionResponse = await authenticatedFetch('/api/fabrica/produccion');
        const produccionData = await produccionResponse.json();
        
        // Tomar solo las 5 producciones más recientes
        const produccionesRecientes = [...produccionData]
          .sort((a, b) => new Date(b.fechaInicio).getTime() - new Date(a.fechaInicio).getTime())
          .slice(0, 5);
        
        // Cargar envíos pendientes
        const enviosPendientesResponse = await authenticatedFetch('/api/fabrica/envios-pendientes');
        const enviosPendientes = await enviosPendientesResponse.json();
        
        // Cargar envíos en tránsito
        const enviosResponse = await authenticatedFetch('/api/fabrica/envios?estado=en_transito');
        const enviosTransito = await enviosResponse.json();
        
        // Cargar stock para mostrar insumos y productos con bajo stock
        const stockInsumosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=insumo');
        const stockInsumos = await stockInsumosResponse.json();
        
        const stockProductosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=producto');
        const stockProductos = await stockProductosResponse.json();
        
        // Cargar contingencias
        const contingenciasResponse = await authenticatedFetch('/api/contingencias?estado=pendiente&origen=fabrica');
        const contingenciasData = await contingenciasResponse.json();
        
        // Preparar datos para el dashboard
        const statsData: DashboardStats = {
          producciones: {
            total: produccionData.length || 0,
            pendientes: produccionData.filter((p: any) => p.estado === 'pendiente').length || 0,
            enProceso: produccionData.filter((p: any) => p.estado === 'en_proceso').length || 0,
            completadas: produccionData.filter((p: any) => p.estado === 'finalizada').length || 0
          },
          envios: {
            pendientes: enviosPendientes.length || 0,
            enTransito: enviosTransito.length || 0
          },
          stock: {
            bajosInsumos: stockInsumos
              .filter((item: any) => {
                const insumo = item.insumo;
                return item.cantidad < (insumo?.stockMinimo || 0);
              })
              .map((item: any) => ({
                id: item.insumoId,
                nombre: item.insumo?.nombre || 'Sin nombre',
                cantidad: item.cantidad,
                unidadMedida: item.insumo?.unidadMedida || '',
                stockMinimo: item.insumo?.stockMinimo || 0
              })),
            bajosProductos: stockProductos
              .filter((item: any) => {
                const producto = item.producto;
                return item.cantidad < (producto?.stockMinimo || 0);
              })
              .map((item: any) => ({
                id: item.productoId,
                nombre: item.producto?.nombre || 'Sin nombre',
                cantidad: item.cantidad,
                stockMinimo: item.producto?.stockMinimo || 0
              }))
          },
          produccionesRecientes,
          contingenciasPendientes: contingenciasData.length || 0
        };
        
        setStats(statsData);
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas del dashboard');
        
        // Datos fallback para desarrollo
        setStats({
          producciones: {
            total: 45,
            pendientes: 3,
            enProceso: 8,
            completadas: 34
          },
          envios: {
            pendientes: 4,
            enTransito: 2
          },
          stock: {
            bajosInsumos: [
              {id: 'ins1', nombre: 'Aceite base', cantidad: 8, unidadMedida: 'litro', stockMinimo: 10},
              {id: 'ins2', nombre: 'Esencia de lavanda', cantidad: 150, unidadMedida: 'ml', stockMinimo: 200}
            ],
            bajosProductos: [
              {id: 'prod1', nombre: 'Difusor Bambú', cantidad: 3, stockMinimo: 5}
            ]
          },
          produccionesRecientes: [
            {id: 'prod1', receta: {nombre: 'Vela Aromática Lavanda'}, cantidad: 25, fechaInicio: new Date().toISOString(), estado: 'en_proceso'},
            {id: 'prod2', receta: {nombre: 'Difusor Bambú'}, cantidad: 15, fechaInicio: new Date(Date.now() - 86400000).toISOString(), estado: 'finalizada'}
          ],
          contingenciasPendientes: 2
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-[#eeb077] border-t-transparent rounded-full animate-spin"></div>
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
          <h1 className="text-3xl font-bold text-[#311716]">Dashboard de Fabricación</h1>
          <p className="text-[#9c7561] mt-1">Bienvenido al centro de control de producción</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-lg border border-[#eeb077] shadow-sm">
          <p className="text-sm font-medium text-[#311716]">
            Hola, <span className="text-[#9c7561] font-bold">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Quick Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total producciones */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Total Producciones</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{stats?.producciones.total || 0}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <Factory className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <div className="px-6 py-2 bg-[#fcf3ea] grid grid-cols-3 gap-2 text-center text-xs">
            <div>
              <span className="block text-[#9c7561] font-semibold">Pendientes</span>
              <span className="font-bold text-[#311716]">{stats?.producciones.pendientes}</span>
            </div>
            <div>
              <span className="block text-[#9c7561] font-semibold">En Proceso</span>
              <span className="font-bold text-[#311716]">{stats?.producciones.enProceso}</span>
            </div>
            <div>
              <span className="block text-[#9c7561] font-semibold">Finalizadas</span>
              <span className="font-bold text-[#311716]">{stats?.producciones.completadas}</span>
            </div>
          </div>
        </div>

        {/* Envíos */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Envíos</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{(stats?.envios.pendientes || 0) + (stats?.envios.enTransito || 0)}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <TruckIcon className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <div className="px-6 py-2 bg-[#fcf3ea] grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="block text-[#9c7561] font-semibold">Pendientes</span>
              <span className="font-bold text-[#311716]">{stats?.envios.pendientes}</span>
            </div>
            <div>
              <span className="block text-[#9c7561] font-semibold">En Tránsito</span>
              <span className="font-bold text-[#311716]">{stats?.envios.enTransito}</span>
            </div>
          </div>
        </div>

        {/* Alertas Stock */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Alertas Stock</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">
                {(stats?.stock.bajosInsumos.length || 0) + (stats?.stock.bajosProductos.length || 0)}
              </p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <div className="px-6 py-2 bg-[#fcf3ea] grid grid-cols-2 gap-2 text-center text-xs">
            <div>
              <span className="block text-[#9c7561] font-semibold">Insumos</span>
              <span className="font-bold text-[#311716]">{stats?.stock.bajosInsumos.length}</span>
            </div>
            <div>
              <span className="block text-[#9c7561] font-semibold">Productos</span>
              <span className="font-bold text-[#311716]">{stats?.stock.bajosProductos.length}</span>
            </div>
          </div>
        </div>

        {/* Contingencias */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden transform hover:shadow-md transition-all">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Contingencias</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{stats?.contingenciasPendientes || 0}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <Link 
            href="/fabrica/contingencias" 
            className="flex items-center justify-center gap-2 px-6 py-2 bg-[#fcf3ea] text-[#9c7561] font-medium hover:bg-[#eeb077] hover:text-white transition-colors"
          >
            Ver detalles
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main Dashboard Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
{/* Producciones Recientes */}
<div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-[#eee3d8]">
  <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#fcf3ea] flex justify-between items-center">
    <h3 className="text-lg font-semibold text-[#311716]">Producciones Recientes</h3>
    <Link 
      href="/fabrica/produccion" 
      className="text-sm text-[#9c7561] hover:text-[#eeb077] flex items-center"
    >
      Ver todas <ArrowUpRight className="h-4 w-4 ml-1"/>
    </Link>
  </div>
  <div className="divide-y divide-[#eee3d8]">
    {stats?.produccionesRecientes && stats.produccionesRecientes.length > 0 ? (
      stats.produccionesRecientes.map((produccion) => (
        <Link key={produccion.id} href={`/fabrica/produccion/${produccion.id}`}>
          <div className="px-6 py-4 hover:bg-[#f8f5f3] flex justify-between items-center transition-colors">
            <div>
              <span className={`px-2 py-1 text-xs rounded-full font-medium mr-2 ${
                produccion.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' : 
                produccion.estado === 'en_proceso' ? 'bg-blue-100 text-blue-800' : 
                'bg-green-100 text-green-800'
              }`}>
                {produccion.estado === 'pendiente' ? 'Pendiente' : 
                 produccion.estado === 'en_proceso' ? 'En proceso' : 'Finalizada'}
              </span>
              <span className="font-medium text-[#311716]">{produccion.receta.nombre}</span>
            </div>
            <div className="text-right">
              <span className="text-sm text-[#9c7561]">{produccion.cantidad} lotes</span>
              <span className="text-xs text-gray-500 block">{new Date(produccion.fechaInicio).toLocaleDateString()}</span>
            </div>
          </div>
        </Link>
      ))
    ) : (
      <div className="py-8 text-center">
        <Beaker className="w-12 h-12 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500">No hay producciones recientes</p>
      </div>
    )}
  </div>
</div>

{/* Sección Stock Bajo */}
<div className="bg-white rounded-xl shadow-sm border border-[#eee3d8]">
  <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#fcf3ea]">
    <h3 className="text-lg font-semibold text-[#311716]">Stock Crítico</h3>
  </div>
  <div className="divide-y divide-[#eee3d8]">
    {stats?.stock && (stats.stock.bajosInsumos.length > 0 || stats.stock.bajosProductos.length > 0) ? (
      <div className="px-6 py-4">
        {stats.stock.bajosInsumos.slice(0, 3).map(insumo => (
          <div key={insumo.id} className="mb-3 bg-orange-50 rounded-lg p-3 border border-orange-100">
            <div className="flex justify-between mb-1">
              <span className="font-medium text-[#311716]">{insumo.nombre}</span>
              <span className="text-orange-700 text-sm">
                {insumo.cantidad} / {insumo.stockMinimo} {insumo.unidadMedida}
              </span>
            </div>
            <div className="w-full bg-orange-200 rounded-full h-2">
              <div 
                className="bg-orange-500 h-2 rounded-full" 
                style={{ width: `${Math.min(100, (insumo.cantidad / insumo.stockMinimo) * 100)}%` }}
              ></div>
            </div>
          </div>
        ))}
        
        {stats.stock.bajosProductos.slice(0, 2).map(producto => (
          <div key={producto.id} className="mb-3 bg-red-50 rounded-lg p-3 border border-red-100">
            <div className="flex justify-between mb-1">
              <span className="font-medium text-[#311716]">{producto.nombre}</span>
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
          href="/fabrica/stock" 
          className="mt-2 inline-flex w-full items-center justify-center px-4 py-2 bg-[#eeb077] text-white rounded-lg hover:bg-[#9c7561] transition-colors"
        >
          <Archive className="mr-2 h-4 w-4" />
          Gestionar stock
        </Link>
      </div>
    ) : (
      <div className="py-8 text-center">
        <CheckCircle className="w-12 h-12 text-green-300 mx-auto mb-2" />
        <p className="text-gray-500">No hay alertas de stock</p>
      </div>
    )}
  </div>
</div>
      </div>

      {/* Acciones Rápidas */}
      <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] p-6">
        <h3 className="text-lg font-semibold text-[#311716] mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/fabrica/produccion/nueva"
            className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
          >
            <div className="bg-[#fcf3ea] p-3 rounded-lg group-hover:bg-white transition-colors">
              <Beaker className="h-6 w-6 text-[#9c7561]" />
            </div>
            <div>
              <span className="font-medium text-[#311716] block">Nueva</span>
              <span className="text-sm text-[#9c7561]">Producción</span>
            </div>
          </Link>
          
          <Link
            href="/fabrica/stock/solicitud"
            className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
          >
            <div className="bg-[#fcf3ea] p-3 rounded-lg group-hover:bg-white transition-colors">
              <PackageOpen className="h-6 w-6 text-[#9c7561]" />
            </div>
            <div>
              <span className="font-medium text-[#311716] block">Solicitar</span>
              <span className="text-sm text-[#9c7561]">Insumos</span>
            </div>
          </Link>
          
          <Link
            href="/fabrica/envios/nuevo"
            className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors group"
          >
            <div className="bg-[#fcf3ea] p-3 rounded-lg group-hover:bg-white transition-colors">
              <TruckIcon className="h-6 w-6 text-[#9c7561]" />
            </div>
            <div>
              <span className="font-medium text-[#311716] block">Preparar</span>
              <span className="text-sm text-[#9c7561]">Envío</span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}