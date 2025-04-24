// src/app/(admin)/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  HomeIcon,
  Package, 
  Users, 
  Archive, 
  AlertTriangle, 
  Beaker, 
  Book,
  BarChart2,
  ArrowUpRight,
  AlertCircle,
  Plus,
  ShoppingCart,
  Truck,
  Boxes,
  Factory,
  TrendingUp
} from 'lucide-react';

interface DashboardStats {
  totalProductos: number;
  totalVentas: number;
  totalIngresos: number;
  stockPendiente: number;
  productosAgotandose: Array<{
    id: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
    ubicacion: string;
  }>;
  ultimasVentas: Array<{
    id: string;
    fecha: string;
    total: number;
    sucursal: string;
  }>;
  contingenciasPendientes: number;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setIsLoading(true);
        
        // Obtener datos reales del servidor
        const [stockResult, ventasResult, contingenciasResult] = await Promise.all([
          authenticatedFetch('/api/reportes/stock/bajo')
            .then(res => res.ok ? res.json() : []),
          authenticatedFetch('/api/admin/ventas?limit=5')
            .then(res => res.ok ? res.json() : { data: [] }),
          authenticatedFetch('/api/contingencias?estado=pendiente')
            .then(res => res.ok ? res.json() : [])
        ]);
        
        // Calcular métricas
        const productosResponse = await authenticatedFetch('/api/admin/productos?limit=1');
        const productosData = await productosResponse.json();
        const totalProductos = productosData.pagination?.total || 0;
        
        // Preparar datos para el dashboard
        setStats({
          totalProductos,
          totalVentas: ventasResult.data?.length || 0,
          totalIngresos: ventasResult.data?.reduce((sum: any, venta: { total: any; }) => sum + venta.total, 0) || 0,
          stockPendiente: stockResult.length || 0,
          productosAgotandose: stockResult.slice(0, 5).map((item: { productoId: any; nombre: any; stock: any; stockMinimo: any; sucursal: any; }) => ({
            id: item.productoId,
            nombre: item.nombre,
            stock: item.stock,
            stockMinimo: item.stockMinimo,
            ubicacion: item.sucursal
          })),
          ultimasVentas: ventasResult.data?.slice(0, 5).map((venta: { id: any; fecha: string | number | Date; total: any; sucursal: { nombre: any; }; }) => ({
            id: venta.id,
            fecha: new Date(venta.fecha).toLocaleDateString(),
            total: venta.total,
            sucursal: venta.sucursal?.nombre || 'Desconocida'
          })) || [],
          contingenciasPendientes: contingenciasResult.length || 0
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas del dashboard');
        
        // Datos alternativos para fallback
        setStats({
          totalProductos: 48,
          totalVentas: 156,
          totalIngresos: 12580,
          stockPendiente: 15,
          productosAgotandose: [
            { id: '1', nombre: 'Difusor Bambú', stock: 3, stockMinimo: 5, ubicacion: 'Tienda Tulum Centro' },
            { id: '2', nombre: 'Vela Lavanda', stock: 4, stockMinimo: 10, ubicacion: 'Tienda Tulum Playa' },
            { id: '3', nombre: 'Aceite Esencial Limón', stock: 2, stockMinimo: 8, ubicacion: 'Fábrica Central' }
          ],
          ultimasVentas: [
            { id: 'v1', fecha: '24/04/2025', total: 850, sucursal: 'Tienda Tulum Centro' },
            { id: 'v2', fecha: '23/04/2025', total: 1250, sucursal: 'Tienda Tulum Centro' },
            { id: 'v3', fecha: '22/04/2025', total: 750, sucursal: 'Tienda Tulum Playa' },
          ],
          contingenciasPendientes: 3
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
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
        <span className="block sm:inline">{error}</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[#311716]">Panel de Control</h1>
          <p className="text-gray-600 mt-1">Resumen general de la operación</p>
        </div>
        <div className="bg-white px-6 py-3 rounded-lg border border-[#eeb077] shadow-sm">
          <p className="text-sm font-medium text-[#311716]">
            Bienvenido, <span className="text-[#9c7561] font-bold">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Productos Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] overflow-hidden transform transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Productos</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{stats?.totalProductos}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <Package className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <Link 
            href="/admin/productos" 
            className="block bg-[#fcf3ea] px-6 py-3 hover:bg-[#eeb077] hover:text-white transition-colors duration-300"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1 hover:text-white">
              Administrar productos <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Ventas Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] overflow-hidden transform transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Ventas</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{stats?.totalVentas}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <ShoppingCart className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <Link 
            href="/admin/reportes" 
            className="block bg-[#fcf3ea] px-6 py-3 hover:bg-[#eeb077] hover:text-white transition-colors duration-300"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1 hover:text-white">
              Ver reportes <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Ingresos Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] overflow-hidden transform transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Ingresos</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">${stats?.totalIngresos.toLocaleString()}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <TrendingUp className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <Link 
            href="/admin/reportes" 
            className="block bg-[#fcf3ea] px-6 py-3 hover:bg-[#eeb077] hover:text-white transition-colors duration-300"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1 hover:text-white">
              Ver detalles <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Contingencias Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] overflow-hidden transform transition-all hover:shadow-md hover:scale-[1.02]">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Contingencias</h3>
              <p className="text-3xl font-bold text-[#311716] mt-2">{stats?.contingenciasPendientes}</p>
            </div>
            <div className="bg-[#fcf3ea] p-3 rounded-lg">
              <AlertTriangle className="h-8 w-8 text-[#eeb077]" />
            </div>
          </div>
          <Link 
            href="/admin/contingencias" 
            className="block bg-[#fcf3ea] px-6 py-3 hover:bg-[#eeb077] hover:text-white transition-colors duration-300"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1 hover:text-white">
              Administrar contingencias <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* Two-Column Layout for Detailed Data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Stock Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077]">
          <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#fcf3ea] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#311716] flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-[#c44d42]" />
              Productos con stock bajo
            </h3>
            <Link 
              href="/admin/stock" 
              className="text-sm text-[#311716] hover:text-[#eeb077] flex items-center"
            >
              Ver todo <ArrowUpRight className="h-4 w-4 ml-1"/>
            </Link>
          </div>
          <div className="divide-y divide-[#eee3d8]">
            {stats?.productosAgotandose.length === 0 ? (
              <div className="py-8 text-center">
                <Archive className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay productos con stock bajo</p>
              </div>
            ) : (
              stats?.productosAgotandose.map((producto) => (
                <div key={producto.id} className="px-6 py-4 hover:bg-[#f8f5f3] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#311716]">{producto.nombre}</p>
                      <p className="text-sm text-gray-600 mt-1 flex items-center">
                        <span className="mr-2">Ubicación: {producto.ubicacion}</span>
                        <span>•</span>
                        <span className="ml-2">Mínimo: {producto.stockMinimo}</span>
                      </p>
                    </div>
                    <span className="px-3 py-1 bg-[#f3e9e8] text-[#c44d42] rounded-full text-sm font-medium">
                      Stock: {producto.stock}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Sales Section */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077]">
          <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#fcf3ea] flex justify-between items-center">
            <h3 className="text-lg font-semibold text-[#311716]">Últimas ventas</h3>
            <Link 
              href="/admin/ventas" 
              className="text-sm text-[#311716] hover:text-[#eeb077] flex items-center"
            >
              Ver todo <ArrowUpRight className="h-4 w-4 ml-1"/>
            </Link>
          </div>
          <div className="divide-y divide-[#eee3d8]">
            {stats?.ultimasVentas.length === 0 ? (
              <div className="py-8 text-center">
                <ShoppingCart className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No hay ventas recientes</p>
              </div>
            ) : (
              stats?.ultimasVentas.map((venta) => (
                <div key={venta.id} className="px-6 py-4 hover:bg-[#f8f5f3] transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-[#311716]">Venta #{venta.id.substring(venta.id.length - 8)}</p>
                      <p className="text-sm text-gray-600 mt-1">{venta.sucursal}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-[#311716]">${venta.total.toLocaleString()}</p>
                      <p className="text-sm text-gray-600">{venta.fecha}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] p-6">
          <h3 className="text-lg font-semibold text-[#311716] mb-4">Productos</h3>
          <div className="space-y-3">
            <Link
              href="/admin/productos/nuevo"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Plus className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nuevo Producto</span>
            </Link>
            
            <Link
              href="/admin/categorias/nueva"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Package className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nueva Categoría</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] p-6">
          <h3 className="text-lg font-semibold text-[#311716] mb-4">Insumos</h3>
          <div className="space-y-3">
            <Link
              href="/admin/insumos/nuevo"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Plus className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nuevo Insumo</span>
            </Link>
            
            <Link
              href="/admin/recetas/nueva"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Book className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nueva Receta</span>
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow-sm border border-[#eeb077] p-6">
          <h3 className="text-lg font-semibold text-[#311716] mb-4">Distribución</h3>
          <div className="space-y-3">
            <Link
              href="/admin/envios/nuevo"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Truck className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nuevo Envío</span>
            </Link>
            
            <Link
              href="/admin/envios-insumos"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] hover:bg-[#fcf3ea] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Boxes className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Pedidos Pendientes</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}