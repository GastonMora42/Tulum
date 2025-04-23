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
  const [inconsistencias, setInconsistencias] = useState<any[]>([]);
  const [mostrarAlerta, setMostrarAlerta] = useState(false);
  const [corrigiendo, setCorrigiendo] = useState(false);
  
  useEffect(() => {
    const fetchStock = async () => {
      try {
        setIsLoading(true);
        
        // Cargar stock de insumos con authenticatedFetch
        const insumosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=insumo');
        
        if (!insumosResponse.ok) {
          throw new Error('Error al cargar stock de insumos');
        }
        
        const insumosData = await insumosResponse.json();
        console.log("Stock de insumos cargado:", insumosData);
        setStockInsumos(insumosData);
        
        // Cargar stock de productos con authenticatedFetch
        const productosResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=producto');
        
        if (!productosResponse.ok) {
          throw new Error('Error al cargar stock de productos');
        }
        
        const productosData = await productosResponse.json();
        console.log("Stock de productos cargado:", productosData);
        setStockProductos(productosData);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar el stock');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchStock();
    
    // Agregar un intervalo para actualizar periódicamente el stock
    const intervalId = setInterval(fetchStock, 30000); // Actualizar cada 30 segundos
    
    return () => clearInterval(intervalId); // Limpiar al desmontar
  }, []);
  
  useEffect(() => {
    const verificarConsistencia = async () => {
      try {
        const response = await authenticatedFetch('/api/stock/verificar-consistencia');
        if (response.ok) {
          const data = await response.json();
          if (data.hayInconsistencias) {
            setInconsistencias(data.inconsistencias);
            setMostrarAlerta(true);
          }
        } else {
          console.error('Error en la respuesta:', await response.text());
        }
      } catch (error) {
        console.error('Error al verificar consistencia:', error);
      }
    };
  
    verificarConsistencia();
  }, []);

  return (
    <div className="space-y-6">
        {mostrarAlerta && (
  <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
    <div className="flex">
      <div className="flex-shrink-0">
        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="ml-3">
        <p className="text-sm text-yellow-700">
          Se detectaron <strong>{inconsistencias.length}</strong> inconsistencias en el stock.
        </p>
        <div className="mt-2">
          <button
            onClick={async () => {
              try {
                setCorrigiendo(true);
                const resp = await authenticatedFetch('/api/stock/verificar-consistencia', {
                  method: 'POST'
                });
                if (resp.ok) {
                  const result = await resp.json();
                  alert(`Inconsistencias corregidas: ${result.corregidas} de ${result.totalInconsistencias}`);
                  setMostrarAlerta(false);
                } else {
                  alert('Error al corregir inconsistencias');
                }
              } catch (error) {
                console.error('Error:', error);
              } finally {
                setCorrigiendo(false);
              }
            }}
            disabled={corrigiendo}
            className="text-sm font-medium text-yellow-700 hover:text-yellow-600"
          >
            {corrigiendo ? 'Corrigiendo...' : 'Corregir automáticamente'}
          </button>
        </div>
      </div>
    </div>
  </div>
)}
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