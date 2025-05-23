// src/app/(fabrica)/fabrica/stock/ajuste/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { authenticatedFetch } from '@/hooks/useAuth';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/authStore';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCSelect, HCLabel, HCButton } from '@/components/ui/HighContrastComponents';

// Interfaces para los tipos de datos
interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
}

interface Producto {
  id: string;
  nombre: string;
}

// Esquema de validación con tipos literales exactos
const ajusteStockSchema = z.object({
  tipo: z.enum(['producto', 'insumo']),
  itemId: z.string().min(1, 'Seleccione un item'),
  cantidad: z.number().int().nonnegative('La cantidad debe ser un número positivo'),
  motivo: z.string().min(5, 'El motivo debe tener al menos 5 caracteres')
});

type FormValues = z.infer<typeof ajusteStockSchema>;

export default function AjusteStockPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const router = useRouter();
  const { user } = useAuthStore();
  
  const { 
    register, 
    handleSubmit, 
    reset,
    watch,
    formState: { errors } 
  } = useForm<FormValues>({
    resolver: zodResolver(ajusteStockSchema),
    defaultValues: {
      tipo: 'insumo',
      itemId: '',
      cantidad: 100, // Cantidad generosa para producción
      motivo: 'Ajuste manual de stock'
    }
  });

  useEffect(() => {
    if (user?.roleId === 'role-fabrica') {
      // Mostrar mensaje y redirigir
      alert('Como operador de fábrica, no puede ajustar el stock directamente. Debe utilizar el flujo de solicitud y recepción de insumos.');
      router.replace('/fabrica/stock/solicitud');
    }
  }, [user, router]);
  
  // Observar el tipo seleccionado
  const tipoSeleccionado = watch('tipo');
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Cargar insumos
        const insumosResponse = await authenticatedFetch('/api/admin/insumos?soloActivos=true');
        if (!insumosResponse.ok) {
          throw new Error('Error al cargar insumos');
        }
        const insumosData = await insumosResponse.json();
        setInsumos(insumosData.data || []);
        
        // Cargar productos
        const productosResponse = await authenticatedFetch('/api/productos');
        if (!productosResponse.ok) {
          throw new Error('Error al cargar productos');
        }
        const productosData = await productosResponse.json();
        setProductos(productosData.data || []);
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar datos iniciales');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  const onSubmit = async (data: FormValues) => {
    try {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);
      
      // Preparar datos para la API
      const payload = {
        ubicacionId: 'ubicacion-fabrica', // Fábrica
        cantidad: data.cantidad,
        motivo: data.motivo,
        ...(data.tipo === 'producto' 
          ? { productoId: data.itemId } 
          : { insumoId: data.itemId })
      };
      
      // Enviar ajuste
      const response = await authenticatedFetch('/api/stock/ajuste', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al ajustar stock');
      }
      
      // Mostrar mensaje de éxito
      setSuccessMessage(`Stock ajustado correctamente: +${data.cantidad} unidades`);
      
      // Resetear formulario
      reset({
        ...data,
        cantidad: 100 // Mantener el mismo tipo y motivo, pero resetear cantidad
      });
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al realizar el ajuste de stock');
    } finally {
      setIsSaving(false);
    }
  };
  
  if (user?.roleId === 'role-fabrica') {
    return (
      <ContrastEnhancer>
        <div className="p-6 bg-red-50 border-l-4 border-red-500 text-black">
          <h2 className="text-lg font-medium mb-2">Acceso restringido</h2>
          <p>Como operador de fábrica, no puede ajustar el stock directamente.</p>
          <p>Debe utilizar el flujo completo de solicitud y recepción de insumos para modificar el inventario.</p>
          <p className="mt-2">Redirigiendo a solicitud de insumos...</p>
        </div>
      </ContrastEnhancer>
    );
  }
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Ajuste de Stock</h1>
          <HCButton
            onClick={() => router.back()}
            className="text-black hover:underline"
          >
            Volver
          </HCButton>
        </div>
        
        <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-100 text-black rounded-md">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-4 bg-green-100 text-black rounded-md">
              {successMessage}
            </div>
          )}
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Tipo de item (producto o insumo) */}
            <div>
              <HCLabel className="block text-sm font-medium mb-1">
                Tipo de item
              </HCLabel>
              <div className="flex space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    {...register('tipo')}
                    value="insumo"
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-black">Insumo</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    {...register('tipo')}
                    value="producto"
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="ml-2 text-black">Producto</span>
                </label>
              </div>
              {errors.tipo && (
                <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
              )}
            </div>
            
            {/* Selector de item */}
            <div>
              <HCLabel htmlFor="itemId" className="block text-sm font-medium text-black">
                {tipoSeleccionado === 'producto' ? 'Producto' : 'Insumo'}
              </HCLabel>
              <HCSelect
                id="itemId"
                {...register('itemId')}
              >
                <option value="">Seleccionar {tipoSeleccionado === 'producto' ? 'producto' : 'insumo'}</option>
                {tipoSeleccionado === 'producto' 
                  ? productos.map(producto => (
                      <option key={producto.id} value={producto.id}>{producto.nombre}</option>
                    ))
                  : insumos.map(insumo => (
                      <option key={insumo.id} value={insumo.id}>{insumo.nombre}</option>
                    ))
                }
              </HCSelect>
              {errors.itemId && (
                <p className="mt-1 text-sm text-red-600">{errors.itemId.message}</p>
              )}
            </div>
            
            {/* Cantidad */}
            <div>
              <HCLabel htmlFor="cantidad" className="block text-sm font-medium text-black">
                Cantidad a agregar
              </HCLabel>
              <HCInput
                id="cantidad"
                type="number"
                min="1"
                {...register('cantidad', { valueAsNumber: true })}
              />
              {errors.cantidad && (
                <p className="mt-1 text-sm text-red-600">{errors.cantidad.message}</p>
              )}
            </div>
            
            {/* Motivo */}
            <div>
              <HCLabel htmlFor="motivo" className="block text-sm font-medium text-black">
                Motivo del ajuste
              </HCLabel>
              <HCInput
                id="motivo"
                type="text"
                {...register('motivo')}
              />
              {errors.motivo && (
                <p className="mt-1 text-sm text-red-600">{errors.motivo.message}</p>
              )}
            </div>
            
            <div className="flex justify-end">
              <HCButton
                type="submit"
                disabled={isLoading || isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-gray-400"
              >
                {isSaving ? 'Guardando...' : 'Ajustar Stock'}
              </HCButton>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}