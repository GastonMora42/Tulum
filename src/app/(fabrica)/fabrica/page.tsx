// src/app/(fabrica)/fabrica/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useAuthStore } from '@/stores/authStore';
import { 
  Package, 
  Archive, 
  AlertTriangle, 
  Beaker, 
  Book,
  BarChart2,
  ArrowUpRight,
  AlertCircle,
  Plus,
  Clock,
  TruckIcon,
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
          }
        };
        
        setStats(statsData);
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas del dashboard');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  const quickCards = [
    { href: '/fabrica/produccion', label: 'Producción', icon: <Beaker className="h-6 w-6" />, color: 'bg-green-50 text-green-700 border-green-200' },
    { href: '/fabrica/recetas', label: 'Recetas', icon: <Book className="h-6 w-6" />, color: 'bg-blue-50 text-blue-700 border-blue-200' },
    { href: '/fabrica/stock', label: 'Stock', icon: <Archive className="h-6 w-6" />, color: 'bg-purple-50 text-purple-700 border-purple-200' },
    { href: '/fabrica/envios', label: 'Envíos', icon: <TruckIcon className="h-6 w-6" />, color: 'bg-amber-50 text-amber-700 border-amber-200' },
    { href: '/fabrica/contingencias', label: 'Contingencias', icon: <AlertTriangle className="h-6 w-6" />, color: 'bg-red-50 text-red-700 border-red-200' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard de Fábrica</h1>
          <p className="text-gray-600 mt-1">Resumen general de la operación de fabricación</p>
        </div>
        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100">
          <p className="text-sm font-medium text-green-800">
            Bienvenido, <span className="text-green-600">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {quickCards.map((card) => (
          <Link 
            key={card.href} 
            href={card.href}
            className={`group bg-white p-6 rounded-xl shadow-sm border hover:border-green-400 transition-all duration-200 hover:shadow-md ${card.color}`}
          >
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg">{card.icon}</div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-green-500 transition-colors" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">
              {card.label}
            </h3>
          </Link>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Producciones totales */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Producciones Totales</h3>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.producciones.total || 0}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <Beaker className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <Link 
            href="/fabrica/produccion" 
            className="block bg-gray-50 px-6 py-3 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Ver todas <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Producciones en proceso */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-700">En Proceso</h3>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.producciones.enProceso || 0}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Clock className="h-8 w-8 text-blue-600" />
            </div>
          </div>
          <Link 
            href="/fabrica/produccion?estado=en_proceso" 
            className="block bg-gray-50 px-6 py-3 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Ver en proceso <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Envíos pendientes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Envíos Pendientes</h3>
              <p className="text-4xl font-bold text-gray-900 mt-2">{stats?.envios.pendientes || 0}</p>
            </div>
            <div className="bg-amber-50 p-3 rounded-lg">
              <TruckIcon className="h-8 w-8 text-amber-600" />
            </div>
          </div>
          <Link 
            href="/fabrica/envios" 
            className="block bg-gray-50 px-6 py-3 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Ver envíos <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-700">Alertas</h3>
              <p className="text-4xl font-bold text-gray-900 mt-2">
                {(stats?.stock.bajosInsumos.length || 0) + (stats?.stock.bajosProductos.length || 0)}
              </p>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <Link 
            href="/fabrica/stock" 
            className="block bg-gray-50 px-6 py-3 hover:bg-gray-100 transition-colors"
          >
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              Ver stock bajo <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* Stock Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insumos con stock bajo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-red-50">
            <h3 className="text-lg font-semibold text-red-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Insumos con stock bajo
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.stock.bajosInsumos && stats.stock.bajosInsumos.length > 0 ? (
              stats.stock.bajosInsumos.map((insumo) => (
                <div key={insumo.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{insumo.nombre}</p>
                      <p className="text-sm text-gray-600 mt-1">Stock mínimo: {insumo.stockMinimo} {insumo.unidadMedida}</p>
                    </div>
                    <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-sm font-medium">
                      Stock actual: {insumo.cantidad} {insumo.unidadMedida}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="px-6 py-4 text-center text-gray-500">
                No hay insumos con stock bajo
              </div>
            )}
          </div>
        </div>

        {/* Productos con stock bajo */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 bg-orange-50">
            <h3 className="text-lg font-semibold text-orange-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Productos con stock bajo
            </h3>
          </div>
          <div className="divide-y divide-gray-200">
            {stats?.stock.bajosProductos && stats.stock.bajosProductos.length > 0 ? (
                stats.stock.bajosProductos.map((producto) => (
                  <div key={producto.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">{producto.nombre}</p>
                        <p className="text-sm text-gray-600 mt-1">Stock mínimo: {producto.stockMinimo}</p>
                      </div>
                      <span className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium">
                        Stock actual: {producto.cantidad}
                      </span>
                    </div>
                  </div>
                ))
                ) : (
                  <div className="px-6 py-4 text-center text-gray-500">
                    No hay productos con stock bajo
                  </div>
                )}
                          </div>
                        </div>
                      </div>
                  {/* Quick Actions Section */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                      <Link
                        href="/fabrica/produccion/nueva"
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-green-400 bg-green-50 text-green-700 hover:bg-green-100 transition-colors"
                      >
                        <div className="p-2 rounded-lg">
                          <Plus className="h-5 w-5" />
                        </div>
                        <span className="font-medium">Nueva Producción</span>
                      </Link>
                      
                      <Link
                        href="/fabrica/envios/nuevo"
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors"
                      >
                        <div className="p-2 rounded-lg">
                          <TruckIcon className="h-5 w-5" />
                        </div>
                        <span className="font-medium">Nuevo Envío</span>
                      </Link>
                      
                      <Link
                        href="/fabrica/stock/ajuste"
                        className="flex items-center gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-400 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors"
                      >
                        <div className="p-2 rounded-lg">
                          <Archive className="h-5 w-5" />
                        </div>
                        <span className="font-medium">Ajustar Stock</span>
                      </Link>
                    </div>
                  </div>
                </div>
                );
                }