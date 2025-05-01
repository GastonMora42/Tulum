'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Plus, Minus, Trash2, ArrowLeft, TruckIcon } from 'lucide-react';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCSelect, HCInput, HCButton } from '@/components/ui/HighContrastComponents';

// Interfaces
interface Producto {
  id: string;
  nombre: string;
  stockMinimo: number;
  cantidad?: number; // Para mantener el stock disponible
}

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
}

// Esquema de validación
const envioSchema = z.object({
  destinoId: z.string().min(1, { message: 'Debe seleccionar un destino' }),
  items: z.array(
    z.object({
      productoId: z.string().min(1, { message: 'Debe seleccionar un producto' }),
      cantidad: z.number().positive({ message: 'La cantidad debe ser mayor a 0' })
    })
  ).min(1, { message: 'Debe agregar al menos un producto' })
});

type EnvioFormData = z.infer<typeof envioSchema>;

export default function NuevoEnvioPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [sucursales, setSucursales] = useState<Ubicacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    watch,
    control,
    setValue,
    formState: { errors } 
  } = useForm<EnvioFormData>({
    resolver: zodResolver(envioSchema),
    defaultValues: {
      destinoId: '',
      items: [{ productoId: '', cantidad: 1 }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });
  
  // Obtener productos y destinos disponibles
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Obtener sucursales 
        const sucursalesResponse = await authenticatedFetch('/api/admin/ubicaciones?tipo=sucursal');
        if (!sucursalesResponse.ok) {
          throw new Error('Error al cargar sucursales');
        }
        const sucursalesData = await sucursalesResponse.json();
        setSucursales(sucursalesData);
        
        // Obtener productos con stock
        const productosResponse = await authenticatedFetch('/api/fabrica/stock?ubicacionId=ubicacion-fabrica&tipo=producto');
        if (!productosResponse.ok) {
          throw new Error('Error al cargar productos');
        }
        const productosData = await productosResponse.json();
        
        // Transformar productos
        const productosConStock = productosData.map((item: any) => ({
          id: item.producto.id,
          nombre: item.producto.nombre,
          stockMinimo: item.producto.stockMinimo,
          cantidad: item.cantidad
        }));
        
        setProductos(productosConStock);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar datos iniciales');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Obtener stock disponible para un producto
  const getProductoStock = (productoId: string): number => {
    const producto = productos.find(p => p.id === productoId);
    return producto?.cantidad || 0;
  };
  
  // Verificar si hay suficiente stock para todos los productos
  const verificarStock = (): boolean => {
    const items = watch('items');
    
    for (const item of items) {
      if (!item.productoId) continue;
      
      const stockDisponible = getProductoStock(item.productoId);
      if (stockDisponible < item.cantidad) {
        return false;
      }
    }
    
    return true;
  };
  
  const onSubmit = async (data: EnvioFormData) => {
    // Verificar stock
    if (!verificarStock()) {
      setError('No hay suficiente stock para alguno de los productos seleccionados');
      return;
    }
    
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/fabrica/envios/nuevo', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear envío');
      }
      
      // Redireccionar a la lista de envíos
      router.push('/fabrica/envios');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear envío');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Nuevo Envío</h1>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm rounded-md text-black bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </button>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
              {error}
            </div>
          )}
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
              <span className="ml-2 text-black">Cargando datos...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Selección de destino */}
              <div>
                <HCLabel htmlFor="destinoId">Destino</HCLabel>
                <HCSelect
                  id="destinoId"
                  {...register('destinoId')}
                >
                  <option value="">Seleccionar destino</option>
                  {sucursales.map(sucursal => (
                    <option key={sucursal.id} value={sucursal.id}>{sucursal.nombre}</option>
                  ))}
                </HCSelect>
                {errors.destinoId && (
                  <p className="mt-1 text-sm text-red-600">{errors.destinoId.message}</p>
                )}
              </div>
              
              {/* Productos */}
              <div>
                <h3 className="text-md font-medium text-black mb-2">Productos a enviar</h3>
                
                {errors.items && typeof errors.items === 'object' && 'message' in errors.items && (
                  <p className="mb-2 text-sm text-red-600">{errors.items.message as string}</p>
                )}
                
                <div className="space-y-4">
                  {fields.map((field, index) => {
                    const productoId = watch(`items.${index}.productoId`);
                    const cantidad = watch(`items.${index}.cantidad`);
                    const stockDisponible = getProductoStock(productoId);
                    const exceedsStock = productoId && cantidad > stockDisponible;
                    
                    return (
                      <div key={field.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-md bg-gray-50">
                        <div className="sm:w-1/2">
                          <HCLabel htmlFor={`items.${index}.productoId`}>Producto</HCLabel>
                          <HCSelect
                            id={`items.${index}.productoId`}
                            {...register(`items.${index}.productoId`)}
                          >
                            <option value="">Seleccionar producto</option>
                            {productos.map(producto => (
                              <option key={producto.id} value={producto.id}>
                                {producto.nombre} (Stock: {producto.cantidad || 0})
                              </option>
                            ))}
                          </HCSelect>
                          {errors.items?.[index]?.productoId && (
                            <p className="mt-1 text-sm text-red-600">{errors.items[index]?.productoId?.message}</p>
                          )}
                        </div>
                        
                        <div className="sm:w-1/4">
                          <HCLabel htmlFor={`items.${index}.cantidad`}>Cantidad</HCLabel>
                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => {
                                const currentValue = watch(`items.${index}.cantidad`);
                                if (currentValue > 1) {
                                  setValue(`items.${index}.cantidad`, currentValue - 1);
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
                              className={`border-y border-gray-300 text-center ${exceedsStock ? 'border-red-300 bg-red-50' : ''}`}
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const currentValue = watch(`items.${index}.cantidad`);
                                setValue(`items.${index}.cantidad`, currentValue + 1);
                              }}
                              className="p-2 border border-gray-300 rounded-r-md bg-gray-100 hover:bg-gray-200"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          {errors.items?.[index]?.cantidad && (
                            <p className="mt-1 text-sm text-red-600">{errors.items[index]?.cantidad?.message}</p>
                          )}
                          {exceedsStock && (
                            <p className="mt-1 text-sm text-red-600">
                              Excede el stock disponible ({stockDisponible})
                            </p>
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
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => append({ productoId: '', cantidad: 1 })}
                    className="inline-flex items-center px-3 py-2 border border-dashed border-gray-300 shadow-sm text-sm rounded-md text-black bg-white hover:bg-gray-50 w-full justify-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Producto
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                <HCButton
                  type="submit"
                  disabled={isSaving || !verificarStock()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                      Creando...
                    </>
                  ) : (
                    <>
                      <TruckIcon className="h-4 w-4 mr-2" />
                      Crear Envío
                    </>
                  )}
                </HCButton>
              </div>
            </form>
          )}
        </div>
      </div>
    </ContrastEnhancer>
  );
}