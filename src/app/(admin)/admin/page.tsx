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
  FileText, 
  Beaker, 
  Book,
  BarChart2,
  ArrowUpRight,
  AlertCircle
} from 'lucide-react';

// Tipos para estadísticas
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
        // En producción, llamaríamos a una API real
        // Por ahora, simulamos datos
        
        // Simular carga
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

  // Tarjetas de navegación rápida
  const quickCards = [
    { href: '/admin/productos', label: 'Productos', icon: <Package className="h-6 w-6" />, color: 'bg-blue-50 text-blue-600' },
    { href: '/admin/insumos', label: 'Insumos', icon: <Beaker className="h-6 w-6" />, color: 'bg-purple-50 text-purple-600' },
    { href: '/admin/recetas', label: 'Recetas', icon: <Book className="h-6 w-6" />, color: 'bg-indigo-50 text-indigo-600' },
    { href: '/admin/usuarios', label: 'Usuarios', icon: <Users className="h-6 w-6" />, color: 'bg-emerald-50 text-emerald-600' },
    { href: '/admin/stock', label: 'Stock', icon: <Archive className="h-6 w-6" />, color: 'bg-amber-50 text-amber-600' },
    { href: '/admin/contingencias', label: 'Contingencias', icon: <AlertTriangle className="h-6 w-6" />, color: 'bg-rose-50 text-rose-600' },
    { href: '/admin/reportes', label: 'Reportes', icon: <FileText className="h-6 w-6" />, color: 'bg-teal-50 text-teal-600' },
  ];

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-96">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard de Administración</h1>
        <span className="text-sm text-gray-500">Bienvenido, {user?.name}</span>
      </div>
      
      {/* Tarjetas de navegación rápida */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {quickCards.map((card) => (
          <Link 
            key={card.href} 
            href={card.href}
            className={`${card.color} flex flex-col justify-between p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow`}
          >
            <div className="mb-4">{card.icon}</div>
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">{card.label}</h3>
              <ArrowUpRight className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
      
      {/* Resumen de métricas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Productos</h3>
              <p className="text-3xl font-bold text-indigo-600 mt-2">{stats?.totalProductos}</p>
            </div>
            <Package className="h-12 w-12 text-indigo-200" />
          </div>
          <div className="bg-indigo-50 px-5 py-3">
            <Link href="/admin/productos" className="text-sm text-indigo-600 font-medium flex items-center">
              Ver detalles
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Ventas</h3>
              <p className="text-3xl font-bold text-green-600 mt-2">{stats?.totalVentas}</p>
            </div>
            <BarChart2 className="h-12 w-12 text-green-200" />
          </div>
          <div className="bg-green-50 px-5 py-3">
            <Link href="/admin/reportes" className="text-sm text-green-600 font-medium flex items-center">
              Ver reportes
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Alertas</h3>
              <p className="text-3xl font-bold text-red-600 mt-2">{stats?.productosAgotandose.length}</p>
            </div>
            <AlertCircle className="h-12 w-12 text-red-200" />
          </div>
          <div className="bg-red-50 px-5 py-3">
            <Link href="/admin/stock" className="text-sm text-red-600 font-medium flex items-center">
              Ver stock bajo
              <ArrowUpRight className="h-4 w-4 ml-1" />
            </Link>
          </div>
        </div>
      </div>
      
      {/* Productos con stock bajo */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-red-50">
          <h3 className="text-lg leading-6 font-medium text-red-900 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Productos con stock bajo
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {stats?.productosAgotandose.map((producto) => (
              <li key={producto.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {producto.nombre}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Stock: {producto.stock} / Min: {producto.stockMinimo}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {stats?.productosAgotandose.length === 0 && (
              <li>
                <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No hay productos con stock bajo
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Últimas ventas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Últimas ventas
          </h3>
        </div>
        <div className="border-t border-gray-200">
          <ul className="divide-y divide-gray-200">
            {stats?.ultimasVentas.map((venta) => (
              <li key={venta.id}>
                <div className="px-4 py-4 sm:px-6 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-indigo-600 truncate">
                        Venta #{venta.id}
                      </p>
                      <p className="ml-4 text-sm text-gray-500">
                        {venta.fecha}
                      </p>
                    </div>
                    <div className="ml-2 flex-shrink-0 flex items-center">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                        ${venta.total.toLocaleString()}
                      </p>
                      <p className="ml-2 text-sm text-gray-500">
                        {venta.sucursal}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Acciones adicionales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Acciones rápidas</h3>
          <div className="space-y-3">
            <Link 
              href="/admin/productos/nuevo" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 items-center"
            >
              <div className="p-2 rounded-full bg-blue-50 mr-3">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              Crear nuevo producto
            </Link>
            
            <Link 
              href="/admin/insumos/nuevo" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 items-center"
            >
              <div className="p-2 rounded-full bg-purple-50 mr-3">
                <Beaker className="h-5 w-5 text-purple-600" />
              </div>
              Registrar nuevo insumo
            </Link>
            
            <Link 
              href="/admin/recetas/nueva" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 items-center"
            >
              <div className="p-2 rounded-full bg-indigo-50 mr-3">
                <Book className="h-5 w-5 text-indigo-600" />
              </div>
              Crear nueva receta
            </Link>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Informes recientes</h3>
          <div className="space-y-3">
            <Link 
              href="/admin/reportes?tipo=ventas" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 justify-between items-center"
            >
              <span>Informe de ventas semanal</span>
              <span className="text-xs text-gray-500">Hace 2 días</span>
            </Link>
            
            <Link 
              href="/admin/reportes?tipo=stock" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 justify-between items-center"
            >
              <span>Informe de inventario</span>
              <span className="text-xs text-gray-500">Hace 5 días</span>
            </Link>
            
            <Link 
              href="/admin/reportes?tipo=produccion" 
              className="block w-full text-left px-4 py-3 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50 justify-between items-center"
            >
              <span>Informe de producción</span>
              <span className="text-xs text-gray-500">Hace 1 semana</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}