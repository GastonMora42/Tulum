// src/app/(admin)/admin/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { 
  Package, 
  Users, 
  Archive, 
  AlertTriangle, 
  Beaker, 
  Book,
  BarChart2,
  ArrowUpRight,
  AlertCircle,
  Plus
} from 'lucide-react';

// Colores principales del layout
const primaryColor = '#311716';
const accentColor = '#eeb077';

interface DashboardStats {
  totalProductos: number;
  totalVentas: number;
  productosAgotandose: Array<{
    id: string;
    nombre: string;
    stock: number;
    stockMinimo: number;
  }>;
  ultimasVentas: Array<{
    id: string;
    fecha: string;
    total: number;
    sucursal: string;
  }>;
}

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setStats({
          totalProductos: 48,
          totalVentas: 156,
          productosAgotandose: [
            { id: '1', nombre: 'Difusor Bambú', stock: 3, stockMinimo: 5 },
            { id: '2', nombre: 'Vela Lavanda', stock: 4, stockMinimo: 10 },
            { id: '3', nombre: 'Aceite Esencial Limón', stock: 2, stockMinimo: 8 }
          ],
          ultimasVentas: [
            { id: 'v1', fecha: '2025-04-07', total: 850, sucursal: 'Tienda Tulum Centro' },
            { id: 'v2', fecha: '2025-04-06', total: 1250, sucursal: 'Tienda Tulum Centro' },
            { id: 'v3', fecha: '2025-04-05', total: 750, sucursal: 'Tienda Tulum Playa' },
          ]
        });
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
    { href: '/admin/productos', label: 'Productos', icon: <Package className="h-6 w-6" /> },
    { href: '/admin/insumos', label: 'Insumos', icon: <Beaker className="h-6 w-6" /> },
    { href: '/admin/recetas', label: 'Recetas', icon: <Book className="h-6 w-6" /> },
    { href: '/admin/usuarios', label: 'Usuarios', icon: <Users className="h-6 w-6" /> },
    { href: '/admin/stock', label: 'Stock', icon: <Archive className="h-6 w-6" /> },
    { href: '/admin/contingencias', label: 'Contingencias', icon: <AlertTriangle className="h-6 w-6" /> },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-[#311716] border-t-transparent rounded-full animate-spin"></div>
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
          <h1 className="text-3xl font-bold text-[#311716]">Panel de Control</h1>
          <p className="text-gray-600 mt-1">Resumen general de la operación</p>
        </div>
        <div className="bg-[#f8f5f3] px-4 py-2 rounded-lg border border-[#eee3d8]">
          <p className="text-sm font-medium text-[#311716]">
            Bienvenido, <span className="text-[#9c7561]">{user?.name}</span>
          </p>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {quickCards.map((card) => (
          <Link 
            key={card.href} 
            href={card.href}
            className="group bg-white p-6 rounded-xl shadow-sm border border-[#eee3d8] hover:border-[#eeb077] transition-all duration-200 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <div className="bg-[#f8f5f3] p-3 rounded-lg">{card.icon}</div>
              <ArrowUpRight className="h-5 w-5 text-gray-400 group-hover:text-[#eeb077] transition-colors" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-[#311716]">
              {card.label}
            </h3>
          </Link>
        ))}
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Productos Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Productos Totales</h3>
              <p className="text-4xl font-bold text-[#311716] mt-2">{stats?.totalProductos}</p>
            </div>
            <div className="bg-[#f8f5f3] p-3 rounded-lg">
              <Package className="h-8 w-8 text-[#9c7561]" />
            </div>
          </div>
          <Link 
            href="/admin/productos" 
            className="block bg-[#f8f5f3] px-6 py-3 hover:bg-[#eee3d8] transition-colors"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1">
              Administrar productos <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Ventas Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Ventas Mensuales</h3>
              <p className="text-4xl font-bold text-[#311716] mt-2">{stats?.totalVentas}</p>
            </div>
            <div className="bg-[#f8f5f3] p-3 rounded-lg">
              <BarChart2 className="h-8 w-8 text-[#9c7561]" />
            </div>
          </div>
          <Link 
            href="/admin/reportes" 
            className="block bg-[#f8f5f3] px-6 py-3 hover:bg-[#eee3d8] transition-colors"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1">
              Ver reportes <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>

        {/* Alertas Card */}
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] overflow-hidden">
          <div className="p-6 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-[#311716]">Alertas Activas</h3>
              <p className="text-4xl font-bold text-[#311716] mt-2">{stats?.productosAgotandose.length}</p>
            </div>
            <div className="bg-[#f8f5f3] p-3 rounded-lg">
              <AlertCircle className="h-8 w-8 text-[#9c7561]" />
            </div>
          </div>
          <Link 
            href="/admin/stock" 
            className="block bg-[#f8f5f3] px-6 py-3 hover:bg-[#eee3d8] transition-colors"
          >
            <span className="text-sm font-medium text-[#311716] flex items-center gap-1">
              Ver detalles <ArrowUpRight className="h-4 w-4" />
            </span>
          </Link>
        </div>
      </div>

      {/* Stock Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8]">
        <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#f8f5f3]">
          <h3 className="text-lg font-semibold text-[#311716] flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-[#c44d42]" />
            Productos con stock bajo
          </h3>
        </div>
        <div className="divide-y divide-[#eee3d8]">
          {stats?.productosAgotandose.map((producto) => (
            <div key={producto.id} className="px-6 py-4 hover:bg-[#f8f5f3] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#311716]">{producto.nombre}</p>
                  <p className="text-sm text-gray-600 mt-1">Stock mínimo: {producto.stockMinimo}</p>
                </div>
                <span className="px-3 py-1 bg-[#f3e9e8] text-[#c44d42] rounded-full text-sm font-medium">
                  Stock actual: {producto.stock}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Sales Section */}
      <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8]">
        <div className="px-6 py-4 border-b border-[#eee3d8] bg-[#f8f5f3]">
          <h3 className="text-lg font-semibold text-[#311716]">Últimas ventas</h3>
        </div>
        <div className="divide-y divide-[#eee3d8]">
          {stats?.ultimasVentas.map((venta) => (
            <div key={venta.id} className="px-6 py-4 hover:bg-[#f8f5f3] transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[#311716]">Venta #{venta.id}</p>
                  <p className="text-sm text-gray-600 mt-1">{venta.sucursal}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-[#311716]">${venta.total.toLocaleString()}</p>
                  <p className="text-sm text-gray-600">{venta.fecha}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] p-6">
          <h3 className="text-lg font-semibold text-[#311716] mb-4">Acciones rápidas</h3>
          <div className="space-y-3">
            <Link
              href="/admin/productos/nuevo"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Plus className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nuevo Producto</span>
            </Link>
            
            <Link
              href="/admin/insumos/nuevo"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Plus className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nuevo Insumo</span>
            </Link>
            
            <Link
              href="/admin/recetas/nueva"
              className="flex items-center gap-3 p-4 rounded-lg border border-[#eee3d8] hover:border-[#eeb077] transition-colors"
            >
              <div className="bg-[#f8f5f3] p-2 rounded-lg">
                <Plus className="h-5 w-5 text-[#9c7561]" />
              </div>
              <span className="font-medium text-[#311716]">Nueva Receta</span>
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-[#eee3d8] p-6">
          <h3 className="text-lg font-semibold text-[#311716] mb-4">Actividad reciente</h3>
          <div className="space-y-4">
            <div className="p-4 rounded-lg bg-[#f8f5f3]">
              <p className="text-sm font-medium text-[#311716]">Nueva actualización de stock</p>
              <p className="text-sm text-gray-600 mt-1">Hace 2 horas</p>
            </div>
            
            <div className="p-4 rounded-lg bg-[#f8f5f3]">
              <p className="text-sm font-medium text-[#311716]">Reporte de ventas generado</p>
              <p className="text-sm text-gray-600 mt-1">Hace 1 día</p>
            </div>
            
            <div className="p-4 rounded-lg bg-[#f8f5f3]">
              <p className="text-sm font-medium text-[#311716]">Nuevo usuario registrado</p>
              <p className="text-sm text-gray-600 mt-1">Hace 2 días</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}