// src/app/(admin)/admin/recetas/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Book, ChevronLeft, Plus, Trash, Save, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

// Interfaces
interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
}

// Esquema de validación
const recetaSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  rendimiento: z.number().int().min(1, { message: 'El rendimiento debe ser al menos 1' }),
  items: z.array(
    z.object({
      insumoId: z.string().min(1, { message: 'Debe seleccionar un insumo' }),
      cantidad: z.number().min(0.01, { message: 'La cantidad debe ser mayor a 0' })
    })
  ).min(1, { message: 'Debe agregar al menos un insumo' })
});

type RecetaFormData = z.infer<typeof recetaSchema>;

export default function NuevaRecetaPage() {
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingInsumos, setIsFetchingInsumos] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors },
    watch
  } = useForm<RecetaFormData>({
    resolver: zodResolver(recetaSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      rendimiento: 1,
      items: [{ insumoId: '', cantidad: 1 }]
    }
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });
  
  // Cargar insumos disponibles
  useEffect(() => {
    const fetchInsumos = async () => {
      try {
        setIsFetchingInsumos(true);
        const response = await authenticatedFetch('/api/admin/recetas/insumos');
        
        if (!response.ok) {
          throw new Error('Error al cargar insumos');
        }
        
        const data = await response.json();
        setInsumos(data);
      } catch (err) {
        console.error('Error al cargar insumos:', err);
        setError('No se pudieron cargar los insumos disponibles');
      } finally {
        setIsFetchingInsumos(false);
      }
    };

    fetchInsumos();
  }, []);
  
  // Manejar envío del formulario
  const onSubmit = async (data: RecetaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/admin/recetas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear receta');
      }
      
      // Redirigir a la lista de recetas
      router.push('/admin/recetas');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear receta');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Obtener unidad de medida del insumo seleccionado
  const getUnidadMedida = (insumoId: string) => {
    const insumo = insumos.find(i => i.id === insumoId);
    return insumo ? insumo.unidadMedida : '';
  };
  
  return (
    <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Book className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold tracking-tight">Nueva Receta</h1>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-background border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Volver
        </button>
      </div>
      
      <div className="rounded-lg border bg-card shadow p-6">
        {error && (
          <div className="mb-6 rounded-md bg-destructive/10 p-4 text-destructive">
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        
        {isFetchingInsumos ? (
          <div className="flex items-center justify-center p-8">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-accent" />
              <p className="text-sm text-muted-foreground">Cargando insumos...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <label htmlFor="nombre" className="text-sm font-medium leading-none">
                  Nombre de la receta
                </label>
                <input
                  id="nombre"
                  type="text"
                  {...register('nombre')}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                  placeholder="Ej: Difusor de Bambú"
                />
                {errors.nombre && (
                  <p className="text-sm text-destructive">{errors.nombre.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <label htmlFor="rendimiento" className="text-sm font-medium leading-none">
                  Rendimiento (unidades producidas)
                </label>
                <input
                  id="rendimiento"
                  type="number"
                  min="1"
                  {...register('rendimiento', { valueAsNumber: true })}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.rendimiento && (
                  <p className="text-sm text-destructive">{errors.rendimiento.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <label htmlFor="descripcion" className="text-sm font-medium leading-none">
                Descripción (opcional)
              </label>
              <textarea
                id="descripcion"
                rows={3}
                {...register('descripcion')}
                className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Describa el proceso de elaboración u otras notas relevantes"
              ></textarea>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-md font-medium">Insumos</h3>
                <button
                  type="button"
                  onClick={() => append({ insumoId: '', cantidad: 1 })}
                  className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary px-3 py-1 text-sm"
                >
                  <Plus className="mr-1 h-4 w-4" />
                  Agregar insumo
                </button>
              </div>
              
              {errors.items && !Array.isArray(errors.items) && (
                <p className="text-sm text-destructive">{errors.items.message}</p>
              )}
              
              <div className="space-y-3">
                {fields.map((field, index) => {
                  const insumoId = watch(`items.${index}.insumoId`);
                  return (
                    <div key={field.id} className="flex items-end gap-4 border-b pb-3">
                      <div className="flex-1 space-y-2">
                        <label htmlFor={`items.${index}.insumoId`} className="text-sm font-medium leading-none">
                          Insumo
                        </label>
                        <select
                          id={`items.${index}.insumoId`}
                          {...register(`items.${index}.insumoId`)}
                          className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                          <option value="">Seleccionar insumo</option>
                          {insumos.map(insumo => (
                            <option key={insumo.id} value={insumo.id}>
                              {insumo.nombre} ({insumo.unidadMedida})
                            </option>
                          ))}
                        </select>
                        {errors.items?.[index]?.insumoId && (
                          <p className="text-sm text-destructive">{errors.items[index]?.insumoId?.message}</p>
                        )}
                      </div>
                      
                      <div className="w-32 space-y-2">
                        <label htmlFor={`items.${index}.cantidad`} className="text-sm font-medium leading-none">
                          Cantidad
                        </label>
                        <div className="flex items-center">
                          <input
                            id={`items.${index}.cantidad`}
                            type="number"
                            step="0.01"
                            min="0.01"
                            {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                            className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                          />
                          <span className="ml-2 text-sm text-muted-foreground">
                            {getUnidadMedida(insumoId)}
                          </span>
                        </div>
                        {errors.items?.[index]?.cantidad && (
                          <p className="text-sm text-destructive">{errors.items[index]?.cantidad?.message}</p>
                        )}
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length <= 1}
                        className="mb-2 p-2 text-destructive hover:text-destructive/90 disabled:text-muted-foreground"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Guardar Receta
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}