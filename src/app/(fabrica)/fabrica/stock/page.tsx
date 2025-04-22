'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';

interface InsumoStock {
  id: string;
  cantidad: number;
  insumo: {
    id: string;
    nombre: string;
    unidadMedida: string;
    stockMinimo: number;
  };
}

interface ProductoStock {
  id: string;
  cantidad: number;
  producto: {
    id: string;
    nombre: string;
    stockMinimo: number;
  };
}

export default function StockPage() {
  const [stockInsumos, setStockInsumos] = useState<InsumoStock[]>([]);
  const [stockProductos, setStockProductos] = useState<ProductoStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        
        // Cargar stock de insumos
        const insumosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=insumo');
        
        if (!insumosResponse.ok) {
          throw new Error('Error al cargar stock de insumos');
        }
        
        const insumosData = await insumosResponse.json();
        setStockInsumos(insumosData);
        
        // Cargar stock de productos
        const productosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=producto');
        
        if (!productosResponse.ok) {
          throw new Error('Error al cargar stock de productos');
        }
        
        const productosData = await productosResponse.json();
        setStockProductos(productosData);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar el stock');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStock();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Stock</h1>
        <div className="space-x-4">
          <Link 
            href="/fabrica/stock/solicitud" 
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Solicitar Insumos
          </Link>
          <Link 
            href="/fabrica/stock/ajuste" 
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Ajustar Stock
          </Link>
        </div>
      </div>
      
      {/* Stock de Insumos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-blue-50">
          <h2 className="text-xl font-semibold text-blue-900">Stock de Insumos</h2>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando stock...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : stockInsumos.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No hay insumos en stock</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Insumo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Mínimo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockInsumos.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.insumo?.nombre || '(Sin nombre)'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.cantidad} {item.insumo?.unidadMedida || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.insumo?.stockMinimo || 0} {item.insumo?.unidadMedida || ''}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.cantidad <= (item.insumo?.stockMinimo || 0)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.cantidad <= (item.insumo?.stockMinimo || 0) ? 'Bajo' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* Stock de Productos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-green-50">
          <h2 className="text-xl font-semibold text-green-900">Stock de Productos</h2>
        </div>
        
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando stock...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : stockProductos.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-gray-500">No hay productos en stock</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock Mínimo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {stockProductos.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {item.producto?.nombre || '(Sin nombre)'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.cantidad}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {item.producto?.stockMinimo || 0}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      item.cantidad <= (item.producto?.stockMinimo || 0)
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {item.cantidad <= (item.producto?.stockMinimo || 0) ? 'Bajo' : 'Normal'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}