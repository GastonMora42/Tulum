'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Plus, Trash, Save, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCSelect, HCTextarea, HCInput } from '@/components/ui/HighContrastComponents';

// Interfaces
interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
}

interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
  stock?: {
    cantidad: number;
  };
}

// Esquema de validación
const envioSchema = z.object({
  origenId: z.string().min(1, { message: 'Debe seleccionar un origen' }),
  destinoId: z.string().min(1, { message: 'Debe seleccionar un destino' }),
  observaciones: z.string().optional(),
  items: z.array(
    z.object({
      insumoId: z.string().min(1, { message: 'Debe seleccionar un insumo' }),
      cantidad: z.number().min(1, { message: 'La cantidad debe ser mayor a 0' })
    })
  ).min(1, { message: 'Debe agregar al menos un insumo' })
});

type EnvioFormData = z.infer<typeof envioSchema>;

export default function NuevoEnvioPage() {
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    control,
    watch,
    formState: { errors },
    setValue
  } = useForm<EnvioFormData>({
    resolver: zodResolver(envioSchema),
    defaultValues: {
      origenId: '',
      destinoId: '',
      observaciones: '',
      items: [{ insumoId: '', cantidad: 1 }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const origenId = watch('origenId');
  const destinoId = watch('destinoId');

  // Cargar ubicaciones y insumos
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetching(true);
        
        // Cargar ubicaciones
        const ubicacionesResponse = await authenticatedFetch('/api/admin/ubicaciones');
        if (!ubicacionesResponse.ok) {
          throw new Error('Error al cargar ubicaciones');
        }
        const ubicacionesData = await ubicacionesResponse.json();
        setUbicaciones(ubicacionesData);
        
        // Establecer origen por defecto si hay una fábrica
        const fabrica = ubicacionesData.find((u: { tipo: string; }) => u.tipo === 'fabrica');
        if (fabrica) {
          setValue('origenId', fabrica.id);
        }
        
        // Cargar insumos
        if (origenId) {
          await fetchInsumosStock(origenId);
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar datos iniciales');
      } finally {
        setIsFetching(false);
      }
    };

    fetchData();
  }, [setValue]);

  // Cargar insumos cuando cambia el origen
  useEffect(() => {
    if (origenId) {
      fetchInsumosStock(origenId);
    }
  }, [origenId]);

  const fetchInsumosStock = async (ubicacionId: string) => {
    try {
      setIsFetching(true);
      const response = await authenticatedFetch(`/api/stock?ubicacionId=${ubicacionId}&tipo=insumo`);
      
      if (!response.ok) {
        throw new Error('Error al cargar stock de insumos');
      }
      
      const stockData = await response.json();
      
      // Transformar datos para incluir stock
      const insumosConStock = stockData.map((item: any) => ({
        ...item.insumo,
        stock: { cantidad: item.cantidad }
      }));
      
      setInsumos(insumosConStock);
    } catch (err) {
      console.error('Error:', err);
      setError('Error al cargar stock de insumos');
    } finally {
      setIsFetching(false);
    }
  };

  // Obtener insumo por ID
  const getInsumo = (insumoId: string) => {
    return insumos.find(insumo => insumo.id === insumoId);
  };

  // Verificar si hay suficiente stock
  const hasEnoughStock = (insumoId: string, cantidad: number) => {
    const insumo = getInsumo(insumoId);
    if (!insumo || !insumo.stock) return false;
    return insumo.stock.cantidad >= cantidad;
  };

  const onSubmit = async (data: EnvioFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Verificar que origen y destino sean diferentes
      if (data.origenId === data.destinoId) {
        setError('El origen y destino no pueden ser iguales');
        setIsLoading(false);
        return;
      }
      
      // Verificar stock suficiente para todos los items
      for (const item of data.items) {
        if (!hasEnoughStock(item.insumoId, item.cantidad)) {
          const insumo = getInsumo(item.insumoId);
          setError(`Stock insuficiente para ${insumo?.nombre || 'un insumo'}`);
          setIsLoading(false);
          return;
        }
      }
      
      // Enviar datos al servidor
      const response = await authenticatedFetch('/api/admin/envios-insumos', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear envío');
      }
      
      // Redireccionar a la lista de envíos
      router.push('/admin/envios');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear envío');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Nuevo Envío de Insumos</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </button>
        </div>
  
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}
  
          {isFetching ? (
            <div className="flex justify-center items-center h-40">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
              <span className="ml-2 text-black">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <HCLabel htmlFor="origenId" className="block text-sm font-medium mb-1">
                    Origen
                  </HCLabel>
                  <HCSelect
                    id="origenId"
                    {...register('origenId')}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Seleccionar origen</option>
                    {ubicaciones.map(ubicacion => (
                      <option key={ubicacion.id} value={ubicacion.id}>
                        {ubicacion.nombre} ({ubicacion.tipo})
                      </option>
                    ))}
                  </HCSelect>
                  {errors.origenId && (
                    <p className="mt-1 text-sm text-red-600">{errors.origenId.message}</p>
                  )}
                </div>
                
                <div>
                  <HCLabel htmlFor="destinoId" className="block text-sm font-medium mb-1">
                    Destino
                  </HCLabel>
                  <HCSelect
                    id="destinoId"
                    {...register('destinoId')}
                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                  >
                    <option value="">Seleccionar destino</option>
                    {ubicaciones
                      .filter(ubicacion => ubicacion.id !== origenId)
                      .map(ubicacion => (
                        <option key={ubicacion.id} value={ubicacion.id}>
                          {ubicacion.nombre} ({ubicacion.tipo})
                        </option>
                      ))}
                  </HCSelect>
                  {errors.destinoId && (
                    <p className="mt-1 text-sm text-red-600">{errors.destinoId.message}</p>
                  )}
                </div>
              </div>
  
              <div>
                <HCLabel htmlFor="observaciones" className="block text-sm font-medium mb-1">
                  Observaciones (opcional)
                </HCLabel>
                <HCTextarea
                  id="observaciones"
                  rows={3}
                  {...register('observaciones')}
                  className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                ></HCTextarea>
              </div>
  
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium leading-6 text-black">Insumos</h3>
                  <button
                    type="button"
                    onClick={() => append({ insumoId: '', cantidad: 1 })}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Agregar insumo
                  </button>
                </div>
  
                {errors.items && !Array.isArray(errors.items) && (
                  <p className="text-sm text-red-600">{errors.items.message}</p>
                )}
  
                <div className="bg-gray-50 p-4 rounded-md">
                  {fields.map((field, index) => {
                    const insumoId = watch(`items.${index}.insumoId`);
                    const cantidad = watch(`items.${index}.cantidad`);
                    const insumo = getInsumo(insumoId);
                    const stockDisponible = insumo?.stock?.cantidad || 0;
                    const tieneStockSuficiente = hasEnoughStock(insumoId, cantidad);
  
                    return (
                      <div key={field.id} className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                        <div className="flex-1">
                          <HCLabel htmlFor={`items.${index}.insumoId`} className="block text-sm font-medium mb-1">
                            Insumo
                          </HCLabel>
                          <HCSelect
                            id={`items.${index}.insumoId`}
                            {...register(`items.${index}.insumoId`)}
                            className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                          >
                            <option value="">Seleccionar insumo</option>
                            {insumos.map(insumo => (
                              <option key={insumo.id} value={insumo.id}>
                                {insumo.nombre} - Stock: {insumo.stock?.cantidad || 0} {insumo.unidadMedida}
                              </option>
                            ))}
                          </HCSelect>
                          {errors.items?.[index]?.insumoId && (
                            <p className="mt-1 text-sm text-red-600">{errors.items[index]?.insumoId?.message}</p>
                          )}
                        </div>
                        
                        <div className="md:w-1/4">
                          <HCLabel htmlFor={`items.${index}.cantidad`} className="block text-sm font-medium mb-1">
                            Cantidad
                          </HCLabel>
                          <div className="flex items-center">
                            <HCInput
                              id={`items.${index}.cantidad`}
                              type="number"
                              min="1"
                              {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                              className={`block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm ${!tieneStockSuficiente && insumoId ? 'border-red-300' : 'border-gray-300'}`}
                            />
                            {insumo && (
                              <span className="ml-2 text-sm text-black">{insumo.unidadMedida}</span>
                            )}
                          </div>
                          {errors.items?.[index]?.cantidad && (
                            <p className="mt-1 text-sm text-red-600">{errors.items[index]?.cantidad?.message}</p>
                          )}
                          {insumoId && !tieneStockSuficiente && (
                            <p className="mt-1 text-sm text-red-600">Stock insuficiente (disp: {stockDisponible})</p>
                          )}
                        </div>
                        
                        <div className="flex items-end">
                          <button
                            type="button"
                            onClick={() => remove(index)}
                            disabled={fields.length <= 1}
                            className={`inline-flex items-center justify-center p-2 border border-transparent rounded-md ${fields.length <= 1 ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                          >
                            <Trash className="h-5 w-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
  
              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                      Creando envío...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Crear envío
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}