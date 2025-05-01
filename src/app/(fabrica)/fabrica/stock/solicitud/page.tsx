'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Plus, Minus, Trash2 } from 'lucide-react';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCSelect, HCTextarea, HCLabel, HCButton } from '@/components/ui/HighContrastComponents';

// Interfaces para tipado
interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
  stockMinimo: number;
}

interface StockMap {
  [key: string]: number;
}

// Esquema de validación
const solicitudSchema = z.object({
  observaciones: z.string().optional(),
  items: z.array(
    z.object({
      insumoId: z.string().min(1, { message: 'Debe seleccionar un insumo' }),
      cantidad: z.number().positive({ message: 'La cantidad debe ser mayor a 0' })
    })
  ).min(1, { message: 'Debe agregar al menos un insumo' })
});

type SolicitudFormData = z.infer<typeof solicitudSchema>;

export default function SolicitudInsumosPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [insumosStock, setInsumosStock] = useState<StockMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    control,
    handleSubmit,
    reset,
    formState: { errors } 
  } = useForm<SolicitudFormData>({
    resolver: zodResolver(solicitudSchema),
    defaultValues: {
      observaciones: '',
      items: [{ insumoId: '', cantidad: 1 }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });
  
  // Cargar insumos disponibles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Cargar todos los insumos
        const insumosResponse = await authenticatedFetch('/api/admin/insumos?soloActivos=true');
        if (!insumosResponse.ok) {
          throw new Error('Error al cargar insumos');
        }
        const insumosData = await insumosResponse.json();
        setInsumos(insumosData.data || []);
        
        // Cargar stock actual de insumos en fábrica
        const stockResponse = await authenticatedFetch('/api/stock?ubicacionId=ubicacion-fabrica&tipo=insumo');
        if (!stockResponse.ok) {
          throw new Error('Error al cargar stock de insumos');
        }
        
        const stockData = await stockResponse.json();
        
        // Convertir a un objeto para fácil acceso
        const stockMap: StockMap = {};
        stockData.forEach((item: any) => {
          if (item.insumoId) {
            stockMap[item.insumoId] = item.cantidad;
          }
        });
        
        setInsumosStock(stockMap);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const onSubmit = async (data: SolicitudFormData) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);
      
      // Enviar solicitud a la API
      const response = await authenticatedFetch('/api/admin/envios-insumos', {
        method: 'POST',
        body: JSON.stringify({
          origenId: 'ubicacion-sucursal1', // ID de la oficina o almacén central
          destinoId: 'ubicacion-fabrica', // La fábrica es el destino
          observaciones: data.observaciones,
          items: data.items
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al enviar solicitud');
      }
      
      // Mostrar mensaje de éxito
      setSuccess('Solicitud de insumos enviada correctamente. El administrador la procesará pronto.');
      
      // Resetear formulario
      reset({
        observaciones: '',
        items: [{ insumoId: '', cantidad: 1 }]
      });
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al enviar solicitud');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Obtener stock actual para un insumo
  const getStockActual = (insumoId: string): number => {
    return insumosStock[insumoId] || 0;
  };
  
  // Obtener stock mínimo para un insumo
  const getStockMinimo = (insumoId: string): number => {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.stockMinimo : 0;
  };
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Solicitud de Insumos</h1>
          <button
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
          
          {success && (
            <div className="mb-4 p-4 bg-green-100 text-green-700 rounded-md">
              {success}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Lista de insumos solicitados */}
            <div>
              <h3 className="text-lg font-medium text-black mb-4">Insumos a solicitar</h3>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-md bg-gray-50">
                    <div className="sm:w-1/2">
                      <HCLabel 
                        htmlFor={`items.${index}.insumoId`} 
                        className="block text-sm font-medium mb-1"
                      >
                        Insumo
                      </HCLabel>
                      <HCSelect
                        id={`items.${index}.insumoId`}
                        {...register(`items.${index}.insumoId`)}
                      >
                        <option value="">Seleccionar insumo</option>
                        {insumos.map(insumo => {
                          const stockActual = getStockActual(insumo.id);
                          const stockMinimo = insumo.stockMinimo || 0;
                          const needed = stockActual < stockMinimo;
                          
                          return (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.nombre} - Stock: {stockActual} {insumo.unidadMedida} 
                              {needed ? ` (Bajo mínimo: ${stockMinimo})` : ''}
                            </option>
                          );
                        })}
                      </HCSelect>
                      {errors.items?.[index]?.insumoId && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index]?.insumoId?.message}</p>
                      )}
                    </div>
                    
                    <div className="sm:w-1/4">
                      <HCLabel 
                        htmlFor={`items.${index}.cantidad`} 
                        className="block text-sm font-medium mb-1"
                      >
                        Cantidad
                      </HCLabel>
                      <div className="flex items-center">
                        <button
                          type="button"
                          onClick={() => {
                            const itemElement = document.getElementById(`items.${index}.cantidad`) as HTMLInputElement;
                            const currentValue = parseInt(itemElement?.value || '0');
                            if (currentValue > 1) {
                              itemElement.value = (currentValue - 1).toString();
                            }
                          }}
                          className="p-2 border border-gray-300 rounded-l-md bg-gray-100 hover:bg-gray-200"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <HCInput
                          id={`items.${index}.cantidad`}
                          type="number"
                          min="1"
                          {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                          className="border-y border-gray-300 py-2 px-3 text-center"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const itemElement = document.getElementById(`items.${index}.cantidad`) as HTMLInputElement;
                            const currentValue = parseInt(itemElement?.value || '0');
                            itemElement.value = (currentValue + 1).toString();
                          }}
                          className="p-2 border border-gray-300 rounded-r-md bg-gray-100 hover:bg-gray-200"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      {errors.items?.[index]?.cantidad && (
                        <p className="mt-1 text-sm text-red-600">{errors.items[index]?.cantidad?.message}</p>
                      )}
                    </div>
                    
                    <div className="flex items-end sm:w-1/4">
                      <button
                        type="button"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className={`inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm rounded-md text-red-700 bg-white hover:bg-red-50 ${fields.length === 1 ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Eliminar
                      </button>
                    </div>
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={() => append({ insumoId: '', cantidad: 1 })}
                  className="inline-flex items-center px-3 py-2 border border-dashed border-gray-300 shadow-sm text-sm rounded-md text-black bg-white hover:bg-gray-50 w-full justify-center"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Insumo
                </button>
              </div>
            </div>
            
            {/* Observaciones */}
            <div>
              <HCLabel htmlFor="observaciones" className="block text-sm font-medium mb-1">
                Observaciones
              </HCLabel>
              <HCTextarea
                id="observaciones"
                rows={3}
                {...register('observaciones')}
                placeholder="Observaciones adicionales sobre la solicitud..."
              ></HCTextarea>
            </div>
            
            {/* Botón de envío */}
            <div className="flex justify-end">
              <HCButton
                type="submit"
                disabled={isLoading || isSaving}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSaving ? 'Enviando...' : 'Enviar Solicitud'}
              </HCButton>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}