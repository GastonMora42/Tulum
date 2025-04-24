// src/app/(fabrica)/fabrica/recetas/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Book, ArrowLeft, ChevronRight, Clock, Calendar, Beaker, ShoppingBag, Check, Package2 } from 'lucide-react';

interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo: {
    id: string;
    nombre: string;
    unidadMedida: string;
  };
}

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items: RecetaItem[];
  productoRecetas: Array<{
    id: string;
    productoId: string;
    producto: {
      id: string;
      nombre: string;
      descripcion?: string;
      precio?: number;
      codigoBarras?: string;
      imagen?: string;
    }
  }>;
}

interface InsumoStock {
  insumoId: string;
  cantidad: number;
}

export default function RecetaDetallesPage({ params }: { params: { id: string } }) {
  const [receta, setReceta] = useState<Receta | null>(null);
  const [stockInsumos, setStockInsumos] = useState<{[key: string]: number}>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchReceta = async () => {
      try {
        setIsLoading(true);
        
        // Cargar receta
        const response = await authenticatedFetch(`/api/admin/recetas/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar la receta');
        }
        
        const data = await response.json();
        setReceta(data);
        
        // Cargar stock de insumos
        if (data && data.items && data.items.length > 0) {
          const insumoIds = data.items.map((item: RecetaItem) => item.insumoId);
          
          // Opción 1: Cargar cada insumo individualmente (menos eficiente)
          const stockData: {[key: string]: number} = {};
          
          for (const insumoId of insumoIds) {
            const stockResponse = await authenticatedFetch(`/api/stock?insumoId=${insumoId}&ubicacionId=ubicacion-fabrica`);
            if (stockResponse.ok) {
              const stockItems = await stockResponse.json();
              if (stockItems && stockItems.length > 0) {
                stockData[insumoId] = stockItems[0].cantidad;
              } else {
                stockData[insumoId] = 0;
              }
            }
          }
          
          setStockInsumos(stockData);
        }
      } catch (err) {
        console.error('Error al cargar receta:', err);
        setError('No se pudo cargar la receta');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReceta();
  }, [params.id]);

  // Verificar si hay suficiente stock para producir una unidad
  const verificarStock = (item: RecetaItem): { suficiente: boolean; disponible: number; requerido: number } => {
    const stockDisponible = stockInsumos[item.insumoId] || 0;
    return {
      suficiente: stockDisponible >= item.cantidad,
      disponible: stockDisponible,
      requerido: item.cantidad
    };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  if (error || !receta) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">{error || 'Receta no encontrada'}</div>
        <button
          onClick={() => router.push('/fabrica/recetas')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver al listado
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Encabezado */}
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Book className="h-6 w-6 text-green-600 mr-2" />
          <h1 className="text-2xl font-bold">{receta.nombre}</h1>
        </div>
        <button
          onClick={() => router.push('/fabrica/recetas')}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver
        </button>
      </div>
      
      {/* Contenido principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna izquierda: Información general */}
        <div className="lg:col-span-2 space-y-6">
          {/* Detalles básicos */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Información de la Receta</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Detalles y especificaciones</p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{receta.nombre}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Descripción</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{receta.descripcion || 'Sin descripción'}</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Rendimiento</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{receta.rendimiento} unidades por lote</dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Productos asociados</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {receta.productoRecetas && receta.productoRecetas.length > 0 ? (
                      <ul className="divide-y divide-gray-200">
                        {receta.productoRecetas.map(pr => (
                          <li key={pr.id} className="py-2 flex items-center">
                            <Package2 className="h-4 w-4 text-gray-400 mr-2" />
                            {pr.producto.nombre}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-gray-500">No hay productos asociados</span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
          
          {/* Ingredientes */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Ingredientes necesarios</h2>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Insumos para producir un lote</p>
            </div>
            <div className="border-t border-gray-200">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Insumo</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cantidad</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock actual</th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {receta.items.map(item => {
                    const stock = verificarStock(item);
                    return (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {item.insumo.nombre}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {item.cantidad} {item.insumo.unidadMedida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {stock.disponible} {item.insumo.unidadMedida}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            stock.suficiente 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {stock.suficiente ? 'Disponible' : 'Insuficiente'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        {/* Columna derecha: Acciones y datos adicionales */}
        <div className="space-y-6">
          {/* Panel de acciones */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Acciones</h2>
            </div>
            <div className="border-t border-gray-200 p-4">
              <Link 
                href={`/fabrica/produccion/nueva?recetaId=${receta.id}`}
                className="w-full mb-3 inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
              >
                <Beaker className="mr-2 h-4 w-4" />
                Iniciar Producción
              </Link>
              
              <Link 
                href={`/fabrica/stock/solicitud?recetaId=${receta.id}`}
                className="w-full inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
              >
                <ShoppingBag className="mr-2 h-4 w-4" />
                Solicitar Insumos
              </Link>
            </div>
          </div>
          
          {/* Panel de información adicional */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Información adicional</h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5">
              <div className="mb-4">
                <div className="flex items-center">
                  <Clock className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-sm font-medium text-gray-700">Tiempo estimado de producción</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 pl-7">
                  {receta.items.length <= 3 ? '1-2 horas' : receta.items.length <= 6 ? '2-4 horas' : '4+ horas'}
                </p>
              </div>
              
              <div className="mb-4">
                <div className="flex items-center">
                  <Calendar className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-sm font-medium text-gray-700">Última producción</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 pl-7">
                  No hay registros recientes
                </p>
              </div>
              
              <div>
                <div className="flex items-center">
                  <Check className="h-5 w-5 text-gray-400 mr-2" />
                  <h3 className="text-sm font-medium text-gray-700">Verificación de calidad</h3>
                </div>
                <p className="mt-1 text-sm text-gray-500 pl-7">
                  Seguir procedimiento estándar
                </p>
              </div>
            </div>
          </div>
          
          {/* Estado de stock */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h2 className="text-lg font-medium text-gray-900">Estado del stock</h2>
            </div>
            <div className="border-t border-gray-200 px-4 py-5">
              {/* Cálculo de cuántos lotes completos se pueden producir */}
              {(() => {
                const lotesDisponibles = receta.items.map(item => {
                  const stockDisponible = stockInsumos[item.insumoId] || 0;
                  return Math.floor(stockDisponible / item.cantidad);
                });
                
                const lotesPosibles = lotesDisponibles.length > 0 ? Math.min(...lotesDisponibles) : 0;
                const produccionPosible = lotesPosibles * receta.rendimiento;
                
                return (
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">Lotes posibles con el stock actual</span>
                      <span className="text-sm font-semibold text-gray-900">{lotesPosibles}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className={`h-2.5 rounded-full ${lotesPosibles > 0 ? 'bg-green-600' : 'bg-red-600'}`}
                        style={{ width: `${Math.min(100, lotesPosibles * 20)}%` }} // 5 lotes o más = 100%
                      ></div>
                    </div>
                    <p className="mt-2 text-sm text-gray-600">
                      Con el stock actual puede producir aproximadamente <span className="font-semibold">{produccionPosible}</span> unidades.
                    </p>
                    
                    {lotesPosibles === 0 && (
                      <div className="mt-3 p-2 bg-red-50 text-red-700 text-sm rounded border border-red-200">
                        No hay suficiente stock de todos los insumos para producir.
                      </div>
                    )}
                    
                    {lotesPosibles > 0 && lotesPosibles < 3 && (
                      <div className="mt-3 p-2 bg-yellow-50 text-yellow-700 text-sm rounded border border-yellow-200">
                        Stock limitado. Considere solicitar más insumos.
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}