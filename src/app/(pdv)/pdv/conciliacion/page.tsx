// src/app/(pdv)/pdv/conciliacion/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { 
  BarChart, CheckCircle, AlertTriangle, 
  Save, Loader, Search, Package, ArrowUp, ArrowDown 
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Conciliacion {
  fecha: string;
  estado: 'pendiente' | 'completada' | 'con_contingencia';
  usuario?: string;
  productos: {
    id: string;
    nombre: string;
    stockTeorico: number;
    stockFisico: number;
    diferencia: number;
  }[];
}

export default function ConciliacionPage() {
  const [conciliacion, setConciliacion] = useState<Conciliacion | null>(null);
  const [stockCounts, setStockCounts] = useState<Record<string, number>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Cargar datos de conciliación
  useEffect(() => {
    const loadConciliacion = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          throw new Error('No se ha definido una sucursal');
        }
        
        // Obtener datos actuales o crear nueva conciliación
        const response = await authenticatedFetch(`/api/pdv/conciliacion?sucursalId=${sucursalId}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            // No hay conciliación activa, crear nueva
            const newResponse = await authenticatedFetch('/api/pdv/conciliacion', {
              method: 'POST',
              body: JSON.stringify({ sucursalId })
            });
            
            if (!newResponse.ok) {
              throw new Error('Error al crear nueva conciliación');
            }
            
            const data = await newResponse.json();
            setConciliacion(data);
            
            // Inicializar conteos con stock teórico
            const initialCounts: Record<string, number> = {};
            data.productos.forEach((producto: any) => {
              initialCounts[producto.id] = producto.stockTeorico;
            });
            setStockCounts(initialCounts);
          } else {
            throw new Error('Error al cargar datos de conciliación');
          }
        } else {
          const data = await response.json();
          setConciliacion(data);
          
          // Inicializar conteos con stock físico si existe, o teórico
          const initialCounts: Record<string, number> = {};
          data.productos.forEach((producto: any) => {
            initialCounts[producto.id] = producto.stockFisico || producto.stockTeorico;
          });
          setStockCounts(initialCounts);
        }
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadConciliacion();
  }, []);
  
  // Actualizar valor de stock
  const handleStockChange = (productoId: string, value: string) => {
    const cantidad = parseInt(value);
    if (!isNaN(cantidad) && cantidad >= 0) {
      setStockCounts(prev => ({
        ...prev,
        [productoId]: cantidad
      }));
    }
  };
  
  // Calcular diferencia
  const calcularDiferencia = (productoId: string, stockTeorico: number): number => {
    const stockFisico = stockCounts[productoId] || 0;
    return stockFisico - stockTeorico;
  };
  
  // Filtrar productos por búsqueda
  const filteredProductos = conciliacion?.productos.filter(producto => 
    producto.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];
  
  // Calcular estadísticas
  const calcularEstadisticas = () => {
    if (!conciliacion) return { total: 0, conDiferencia: 0, porcentaje: 0 };
    
    const total = conciliacion.productos.length;
    const conDiferencia = conciliacion.productos.filter(producto => 
      calcularDiferencia(producto.id, producto.stockTeorico) !== 0
    ).length;
    
    return {
      total,
      conDiferencia,
      porcentaje: total > 0 ? (conDiferencia / total) * 100 : 0
    };
  };
  
  const estadisticas = calcularEstadisticas();
  
  // Guardar conciliación
  const handleSave = async () => {
    if (!conciliacion) return;
    
    try {
      setIsSaving(true);
      setError(null);
      
      // Preparar datos
      const productos = conciliacion.productos.map(producto => ({
        productoId: producto.id,
        stockTeorico: producto.stockTeorico,
        stockFisico: stockCounts[producto.id] || 0
      }));
      
      const response = await authenticatedFetch('/api/pdv/conciliacion/guardar', {
        method: 'POST',
        body: JSON.stringify({
          id: conciliacion.fecha, // Usar fecha como ID
          productos,
          observaciones
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar conciliación');
      }
      
      const result = await response.json();
      
      // Mostrar mensaje según resultado
      if (result.hayDiferencias) {
        setSuccessMessage('Conciliación guardada. Se ha creado una contingencia por las diferencias encontradas.');
      } else {
        setSuccessMessage('Conciliación guardada correctamente.');
      }
      
      // Recargar después de 2 segundos
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al guardar conciliación');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Mostrar carga inicial
  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin h-10 w-10 border-4 border-[#9c7561] border-t-transparent rounded-full"></div>
        <span className="ml-3 text-lg text-gray-700">Cargando datos...</span>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-[#311716]">Conciliación de Inventario</h1>
        
        {conciliacion?.estado === 'completada' && (
          <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full flex items-center">
            <CheckCircle className="h-4 w-4 mr-1" />
            Completada
          </div>
        )}
      </div>
      
      {/* Mensajes */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {successMessage && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700">
          <div className="flex">
            <CheckCircle className="h-5 w-5 mr-2" />
            <p>{successMessage}</p>
          </div>
        </div>
      )}
      
      {/* Estadísticas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-center mb-4">
          <BarChart className="h-5 w-5 text-[#9c7561] mr-2" />
          <h2 className="text-lg font-medium text-gray-900">Resumen de Conciliación</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Fecha</div>
            <div className="text-xl font-semibold">
              {conciliacion ? format(new Date(conciliacion.fecha), 'dd/MM/yyyy') : '-'}
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Productos</div>
            <div className="text-xl font-semibold">{estadisticas.total}</div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="text-sm text-gray-600">Con Diferencias</div>
            <div className="text-xl font-semibold text-yellow-600">
              {estadisticas.conDiferencia} ({estadisticas.porcentaje.toFixed(1)}%)
            </div>
          </div>
        </div>
        
        {conciliacion?.estado !== 'completada' && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-yellow-700">
                  <strong className="font-medium text-yellow-800">Instrucciones:</strong> Realiza el conteo físico de cada producto y registra las cantidades. Las diferencias se enviarán automáticamente como contingencias.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Buscador */}
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar productos..."
          className="w-full p-3 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#9c7561] focus:border-[#9c7561]"
        />
        <Search className="absolute left-3 top-3.5 h-5 w-5 text-gray-400" />
      </div>
      
      {/* Lista de productos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-medium text-gray-900">Lista de Productos</h2>
        </div>
        
        {filteredProductos.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-600">No se encontraron productos</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Teórico
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Físico
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Diferencia
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProductos.map(producto => {
                  const diferencia = calcularDiferencia(producto.id, producto.stockTeorico);
                  
                  return (
                    <tr key={producto.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {producto.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                        {producto.stockTeorico}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        {conciliacion?.estado === 'completada' ? (
                          <span className="font-medium">{stockCounts[producto.id] || 0}</span>
                        ) : (
                          <input
                            type="number"
                            min="0"
                            value={stockCounts[producto.id] || 0}
                            onChange={(e) => handleStockChange(producto.id, e.target.value)}
                            className="w-24 border border-gray-300 rounded-md p-2 text-center"
                          />
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                        <div className={`flex items-center justify-center font-medium ${
                          diferencia > 0 ? 'text-green-600' : 
                          diferencia < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                          {diferencia !== 0 && (
                            diferencia > 0 ? 
                              <ArrowUp className="h-4 w-4 mr-1" /> : 
                              <ArrowDown className="h-4 w-4 mr-1" />
                          )}
                          {diferencia}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Observaciones y Finalizar */}
      {conciliacion?.estado !== 'completada' && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
              Observaciones:
            </label>
            <textarea
              id="observaciones"
              rows={3}
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="w-full border border-gray-300 rounded-md p-2"
              placeholder="Ingrese cualquier observación sobre la conciliación..."
            ></textarea>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625] disabled:opacity-50 flex items-center"
            >
              {isSaving ? (
                <>
                  <Loader className="animate-spin h-4 w-4 mr-2" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Finalizar Conciliación
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}