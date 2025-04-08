// src/app/(fabrica)/produccion/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

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
  
  // Cargar recetas
  useEffect(() => {
    const fetchRecetas = async () => {
      try {
        setIsLoading(true);
        
        // Simulamos datos para desarrollo
        await new Promise(resolve => setTimeout(resolve, 800));
        
        const mockRecetas: Receta[] = [
          {
            id: '1',
            nombre: 'Aceite esencial de lavanda',
            rendimiento: 10,
            items: [
              {
                id: 'ri1',
                insumoId: 'i1',
                insumo: { nombre: 'Flores de lavanda', unidadMedida: 'kg' },
                cantidad: 2
              },
              {
                id: 'ri2',
                insumoId: 'i2',
                insumo: { nombre: 'Aceite base', unidadMedida: 'litro' },
                cantidad: 0.5
              }
            ]
          },
          {
            id: '2',
            nombre: 'Vela aromática de vainilla',
            rendimiento: 5,
            items: [
              {
                id: 'ri3',
                insumoId: 'i3',
                insumo: { nombre: 'Cera de soja', unidadMedida: 'kg' },
                cantidad: 1
              },
              {
                id: 'ri4',
                insumoId: 'i4',
                insumo: { nombre: 'Esencia de vainilla', unidadMedida: 'ml' },
                cantidad: 20
              }
            ]
          }
        ];
        
        setRecetas(mockRecetas);
        
        // Si hay recetaId en la URL, seleccionarla
        const initialRecetaId = searchParams.get('recetaId');
        if (initialRecetaId) {
          const receta = mockRecetas.find(r => r.id === initialRecetaId);
          if (receta) {
            setSelectedReceta(receta);
            setValue('recetaId', receta.id);
            
            // Cargar stock de insumos para esta receta
            await fetchInsumosStock(receta.id);
          }
        }
      } catch (err) {
        console.error('Error al cargar recetas:', err);
        setError('No se pudieron cargar las recetas');
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecetas();
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
  
  // Función para cargar stock de insumos
  const fetchInsumosStock = async (recetaId: string) => {
    try {
      // Simulamos datos para desarrollo
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const receta = recetas.find(r => r.id === recetaId);
      if (!receta) return;
      
      // Simular stock de insumos
      const mockStock: InsumoStock[] = receta.items.map(item => ({
        insumoId: item.insumoId,
        nombre: item.insumo.nombre,
        unidadMedida: item.insumo.unidadMedida,
        // Simular valores aleatorios de stock
        cantidad: Math.floor(Math.random() * 10) + 1
      }));
      
      setInsumosStock(mockStock);
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
  
  const onSubmit = async (data: ProduccionFormData) => {
    // Verificar stock suficiente
    if (!verificarStock()) {
      setError('No hay suficiente stock de insumos para esta producción');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      console.log('Datos de producción:', data);
      
      // Simular guardado exitoso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Redireccionar a lista de producciones
      router.push('/fabrica/produccion');
    } catch (err) {
      console.error('Error al crear producción:', err);
      setError('Error al crear la producción');
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