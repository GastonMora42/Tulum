'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';

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

  if (isLoading) {
    return (
      <div className="text-center py-10">
        <p className="text-lg">Cargando estadísticas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-500">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Dashboard de Administración</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Tarjetas de resumen */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-indigo-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de productos
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.totalProductos}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total de ventas
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.totalVentas}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Productos con stock bajo */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Productos con stock bajo
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {stats?.productosAgotandose.map((producto) => (
            <li key={producto.id}>
              <div className="px-4 py-4 sm:px-6">
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
        </ul>
      </div>

      {/* Últimas ventas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Últimas ventas
          </h3>
        </div>
        <ul className="divide-y divide-gray-200">
          {stats?.ultimasVentas.map((venta) => (
            <li key={venta.id}>
              <div className="px-4 py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      Venta #{venta.id}
                    </p>
                    <p className="ml-4 text-sm text-gray-500">
                      {venta.fecha}
                    </p>
                  </div>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      ${venta.total}
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
  );
}