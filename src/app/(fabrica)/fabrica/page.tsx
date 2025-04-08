// src/app/(fabrica)/fabrica/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Simulamos datos para desarrollo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        setStats({
          producciones: {
            total: 120,
            pendientes: 3,
            enProceso: 5,
            completadas: 112
          },
          envios: {
            pendientes: 2,
            enTransito: 3
          },
          stock: {
            bajosInsumos: [
              { id: 'i1', nombre: 'Aceite base', cantidad: 2.5, unidadMedida: 'litro', stockMinimo: 5 },
              { id: 'i2', nombre: 'Esencia de lavanda', cantidad: 150, unidadMedida: 'ml', stockMinimo: 200 }
            ],
            bajosProductos: [
              { id: 'p1', nombre: 'Difusor Bambú', cantidad: 3, stockMinimo: 5 },
              { id: 'p2', nombre: 'Vela Lavanda', cantidad: 4, stockMinimo: 10 }
            ]
          }
        });
      } catch (err) {
        console.error('Error al cargar estadísticas:', err);
        setError('No se pudieron cargar las estadísticas');
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
      <h1 className="text-2xl font-bold">Dashboard de Fábrica</h1>
      
      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-green-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Producciones totales
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.producciones.total}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link href="/fabrica/produccion" className="font-medium text-green-600 hover:text-green-500">
                Ver todas
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-yellow-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Producciones pendientes
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.producciones.pendientes}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link href="/fabrica/produccion?estado=pendiente" className="font-medium text-yellow-600 hover:text-yellow-500">
                Ver detalles
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-blue-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Envíos pendientes
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.envios.pendientes}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link href="/fabrica/envios?estado=pendiente" className="font-medium text-blue-600 hover:text-blue-500">
                Ver detalles
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0 bg-purple-500 rounded-md p-3">
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Envíos en tránsito
                  </dt>
                  <dd>
                    <div className="text-lg font-medium text-gray-900">
                      {stats?.envios.enTransito}
                    </div>
                  </dd>
                </dl>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-4 sm:px-6">
            <div className="text-sm">
              <Link href="/fabrica/envios?estado=transito" className="font-medium text-purple-600 hover:text-purple-500">
                Ver detalles
              </Link>
            </div>
          </div>
        </div>
      </div>
      
      {/* Stock bajo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Insumos con stock bajo */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 bg-red-50">
            <h3 className="text-lg leading-6 font-medium text-red-900">
              Insumos con stock bajo
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats?.stock.bajosInsumos.map((insumo) => (
              <li key={insumo.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {insumo.nombre}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                        Stock: {insumo.cantidad} {insumo.unidadMedida} / Min: {insumo.stockMinimo} {insumo.unidadMedida}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {stats?.stock.bajosInsumos.length === 0 && (
              <li>
                <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No hay insumos con stock bajo
                </div>
              </li>
            )}
          </ul>
        </div>

        {/* Productos con stock bajo */}
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <div className="px-4 py-5 sm:px-6 bg-orange-50">
            <h3 className="text-lg leading-6 font-medium text-orange-900">
              Productos con stock bajo
            </h3>
          </div>
          <ul className="divide-y divide-gray-200">
            {stats?.stock.bajosProductos.map((producto) => (
              <li key={producto.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-indigo-600 truncate">
                      {producto.nombre}
                    </p>
                    <div className="ml-2 flex-shrink-0 flex">
                      <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-orange-100 text-orange-800">
                        Stock: {producto.cantidad} / Min: {producto.stockMinimo}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
            {stats?.stock.bajosProductos.length === 0 && (
              <li>
                <div className="px-4 py-4 sm:px-6 text-center text-gray-500">
                  No hay productos con stock bajo
                </div>
              </li>
            )}
          </ul>
        </div>
      </div>
      
      {/* Acciones rápidas */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg leading-6 font-medium text-gray-900">
            Acciones rápidas
          </h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <Link href="/fabrica/produccion/nueva" className="bg-green-50 hover:bg-green-100 p-4 rounded-lg transition-colors duration-200">
            <h4 className="font-medium text-green-700">Nueva producción</h4>
            <p className="text-sm text-gray-600 mt-1">Iniciar proceso de fabricación</p>
          </Link>
          
          <Link href="/fabrica/envios/nuevo" className="bg-blue-50 hover:bg-blue-100 p-4 rounded-lg transition-colors duration-200">
            <h4 className="font-medium text-blue-700">Nuevo envío</h4>
            <p className="text-sm text-gray-600 mt-1">Crear envío a sucursal</p>
          </Link>
          
          <Link href="/fabrica/stock/ajuste" className="bg-purple-50 hover:bg-purple-100 p-4 rounded-lg transition-colors duration-200">
            <h4 className="font-medium text-purple-700">Ajustar stock</h4>
            <p className="text-sm text-gray-600 mt-1">Realizar ajuste de inventario</p>
          </Link>
        </div>
      </div>
    </div>
  );
}