// src/app/(fabrica)/fabrica/produccion/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Receta {
  id: string;
  nombre: string;
  rendimiento: number;
  items: {
    id: string;
    insumoId: string;
    insumo: {
      nombre: string;
      unidadMedida: string;
    };
    cantidad: number;
  }[];
}

interface InsumoStock {
  insumoId: string;
  cantidad: number;
  nombre: string;
  unidadMedida: string;
}

// Esquema de validación
const produccionSchema = z.object({
  recetaId: z.string().min(1, { message: 'Debe seleccionar una receta' }),
  cantidad: z.number().min(1, { message: 'La cantidad debe ser al menos 1' }),
  observaciones: z.string().optional(),
});

type ProduccionFormData = z.infer<typeof produccionSchema>;

export default function NuevaProduccionPage() {
  const [recetas, setRecetas] = useState<Receta[]>([]);
  const [selectedReceta, setSelectedReceta] = useState<Receta | null>(null);
  const [insumosStock, setInsumosStock] = useState<InsumoStock[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { 
    register, 
    handleSubmit, 
    watch,
    setValue,
    formState: { errors } 
  } = useForm<ProduccionFormData>({
    resolver: zodResolver(produccionSchema),
    defaultValues: {
      recetaId: searchParams.get('recetaId') || '',
      cantidad: 1,
      observaciones: ''
    }
  });
  
  const recetaId = watch('recetaId');
  const cantidad = watch('cantidad');

useEffect(() => {
  const fetchData = async () => {
    try {
      setIsLoading(true);
      
      // Reemplazar fetch con authenticatedFetch
      const response = await authenticatedFetch(`/api/fabrica/produccion/init${
        searchParams.get('recetaId') ? `?recetaId=${searchParams.get('recetaId')}` : ''
      }`);
      
      if (!response.ok) {
        throw new Error('Error al cargar datos iniciales');
      }
      
      const data = await response.json();
      setRecetas(data.recetas || []);
      
      // Si hay recetaId y datos de stock
      const initialRecetaId = searchParams.get('recetaId');
      if (initialRecetaId) {
        const receta = data.recetas.find((r: { id: string; }) => r.id === initialRecetaId);
        if (receta) {
          setSelectedReceta(receta);
          setValue('recetaId', receta.id);
          
          // Usar los datos de stock ya incluidos en la respuesta
          if (data.stockInsumos) {
            setInsumosStock(data.stockInsumos);
          }
        }
      }
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar datos iniciales');
    } finally {
      setIsLoading(false);
    }
  };

  fetchData();
}, [searchParams, setValue]);

  // Cargar stock de insumos cuando cambia la receta
  useEffect(() => {
    if (recetaId) {
      const receta = recetas.find(r => r.id === recetaId);
      setSelectedReceta(receta || null);
      
      if (receta) {
        fetchInsumosStock(receta.id);
      }
    }
  }, [recetaId, recetas]);
  

const fetchInsumosStock = async (recetaId: string) => {
  try {
    const receta = recetas.find(r => r.id === recetaId);
    if (!receta) return;
    
    const stockPromises = receta.items.map(async (item) => {
      console.log(`Consultando stock para insumo: ${item.insumoId}`);
      const response = await authenticatedFetch(`/api/stock?insumoId=${item.insumoId}&ubicacionId=ubicacion-fabrica`);
      
      if (!response.ok) {
        throw new Error(`Error al obtener stock para insumo ${item.insumoId}`);
      }
      
      const stockData = await response.json();
      console.log(`Respuesta de stock para ${item.insumoId}:`, stockData);
      
      // Asegurar que tomamos el stock real
      const stock = stockData.find((s: { insumoId: string; }) => s.insumoId === item.insumoId);
      
      return {
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        unidadMedida: item.insumo.unidadMedida,
        cantidad: stock ? stock.cantidad : 0
      };
    });
    
    const stockResults = await Promise.all(stockPromises);
    console.log("Stock de insumos obtenido:", stockResults);
    setInsumosStock(stockResults);
  } catch (err) {
    console.error('Error al cargar stock de insumos:', err);
  }
};
  
  // Verificar si hay suficiente stock para producir
  const verificarStock = () => {
    if (!selectedReceta) return true;
    
    for (const item of selectedReceta.items) {
      const stockItem = insumosStock.find(stock => stock.insumoId === item.insumoId);
      if (!stockItem) return false;
      
      // Calcular cantidad necesaria según cantidad a producir
      const cantidadNecesaria = item.cantidad * cantidad;
      if (stockItem.cantidad < cantidadNecesaria) {
        return false;
      }
    }
    
    return true;
  };
  
  // En src/app/(fabrica)/fabrica/produccion/nueva/page.tsx
const fetchStockEficiente = async (recetaId: string) => {
  try {
    const receta = recetas.find(r => r.id === recetaId);
    if (!receta) return;
    
    // Extraer todos los IDs de insumos
    const insumoIds = receta.items.map(item => item.insumoId).join(',');
    
    // Hacer una sola llamada API para todos los insumos
    const response = await authenticatedFetch(`/api/stock/batch?ubicacionId=ubicacion-fabrica&insumoIds=${insumoIds}`);
    
    if (!response.ok) {
      throw new Error('Error al obtener stock de insumos');
    }
    
    const stockData = await response.json();
    
    // Crear un mapa para búsqueda rápida
    const stockMap = new Map();
    stockData.forEach((stock: { insumoId: any; }) => {
      stockMap.set(stock.insumoId, stock);
    });
    
    // Mapear los datos de stock a nuestro formato
    const stockResults = receta.items.map(item => {
      const stock = stockMap.get(item.insumoId);
      return {
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        unidadMedida: item.insumo.unidadMedida,
        cantidad: stock ? stock.cantidad : 0
      };
    });
    
    setInsumosStock(stockResults);
  } catch (err) {
    console.error('Error al cargar stock de insumos:', err);
  }
};

// Reemplazar el efecto de carga de receta
useEffect(() => {
  if (recetaId) {
    const receta = recetas.find(r => r.id === recetaId);
    setSelectedReceta(receta || null);
    
    if (receta) {
      fetchStockEficiente(receta.id);
    }
  }
}, [recetaId, recetas]);

// En la función onSubmit, reemplazar con:
const onSubmit = async (data: ProduccionFormData) => {
  // Verificar stock suficiente
  if (!verificarStock()) {
    setError('No hay suficiente stock de insumos para esta producción');
    return;
  }
  
  try {
    setIsSaving(true);
    setError(null);
    
    const response = await authenticatedFetch('/api/fabrica/produccion', {
        method: 'POST',
        body: JSON.stringify({
          recetaId: data.recetaId,
          cantidad: data.cantidad,
          ubicacionId: 'ubicacion-fabrica',
          observaciones: data.observaciones
        })
      });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al crear producción');
    }
    
    // Redireccionar a lista de producciones
    router.push('/fabrica/produccion');
  } catch (err: any) {
    console.error('Error al crear producción:', err);
    setError(err.message || 'Error al crear la producción');
  } finally {
    setIsSaving(false);
  }
};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Producción</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Volver
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="recetaId" className="block text-sm font-medium text-gray-700">
              Receta
            </label>
            <select
              id="recetaId"
              {...register('recetaId')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Seleccionar receta</option>
              {recetas.map(receta => (
                <option key={receta.id} value={receta.id}>{receta.nombre}</option>
              ))}
            </select>
            {errors.recetaId && (
              <p className="mt-1 text-sm text-red-600">{errors.recetaId.message}</p>
            )}
          </div>
          
          {selectedReceta && (
            <>
              <div>
                <label htmlFor="cantidad" className="block text-sm font-medium text-gray-700">
                  Cantidad a producir
                </label>
                <input
                  id="cantidad"
                  type="number"
                  min="1"
                  {...register('cantidad', { valueAsNumber: true })}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
                {errors.cantidad && (
                  <p className="mt-1 text-sm text-red-600">{errors.cantidad.message}</p>
                )}
                <p className="mt-1 text-sm text-gray-500">
                  Rendimiento esperado: {cantidad * selectedReceta.rendimiento} unidades
                </p>
              </div>
              
              <div>
                <h3 className="text-md font-medium text-gray-700 mb-2">Insumos requeridos</h3>
                <div className="bg-gray-50 p-4 rounded-md">
                  <ul className="space-y-3">
                    {selectedReceta.items.map(item => {
                      const stockItem = insumosStock.find(stock => stock.insumoId === item.insumoId);
                      const cantidadNecesaria = item.cantidad * cantidad;
                      const stockSuficiente = stockItem && stockItem.cantidad >= cantidadNecesaria;
                      
                      return (
                        <li key={item.id} className="flex justify-between">
                          <div>
                            <span className="font-medium">{item.insumo.nombre}:</span> 
                            <span className="ml-2">{cantidadNecesaria} {item.insumo.unidadMedida}</span>
                          </div>
                          <div className={`text-sm ${stockSuficiente ? 'text-green-600' : 'text-red-600'}`}>
                            Stock disponible: {stockItem?.cantidad || 0} {item.insumo.unidadMedida}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            </>
          )}
          
          <div>
            <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700">
              Observaciones
            </label>
            <textarea
              id="observaciones"
              rows={3}
              {...register('observaciones')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Observaciones o notas adicionales"
            />
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving || !verificarStock()}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Guardando...' : 'Iniciar Producción'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}