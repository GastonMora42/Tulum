'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Package, ChevronLeft, Save, Loader2, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel, HCSelect, HCTextarea } from '@/components/ui/HighContrastComponents';

interface Insumo {
  id: string;
  nombre: string;
  descripcion: string | null;
  unidadMedida: string;
  stockMinimo: number;
  proveedorId: string | null;
  activo: boolean;
  proveedor?: {
    id: string;
    nombre: string;
  } | null;
}

interface Proveedor {
  id: string;
  nombre: string;
}

// Esquema de validación
const insumoSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional().nullable(),
  unidadMedida: z.string().min(1, { message: 'La unidad de medida es requerida' }),
  stockMinimo: z.number().nonnegative({ message: 'El stock mínimo debe ser mayor o igual a 0' }),
  proveedorId: z.string().optional().nullable(),
  activo: z.boolean()
});

// Definir el tipo InsumoFormData
type InsumoFormData = z.infer<typeof insumoSchema>;

export default function EditarInsumoPage({ params }: { params: { id: string } }) {
  const [insumo, setInsumo] = useState<Insumo | null>(null);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset
  } = useForm<InsumoFormData>({
    resolver: zodResolver(insumoSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      unidadMedida: '',
      stockMinimo: 0,
      proveedorId: null,
      activo: true
    }
  });
  
  // Cargar insumo y proveedores
  useEffect(() => {
    // Captura el id fuera de la dependencia para evitar el warning
    const insumoId = params.id;
    
    const fetchData = async () => {
      try {
        setIsFetchingData(true);
        
        // Cargar insumo
        const insumoResponse = await authenticatedFetch(`/api/admin/insumos/${insumoId}`);
        if (!insumoResponse.ok) {
          throw new Error('Error al cargar insumo');
        }
        const insumoData = await insumoResponse.json();
        setInsumo(insumoData);
        
        // Establecer valores en el formulario
        reset({
          nombre: insumoData.nombre,
          descripcion: insumoData.descripcion,
          unidadMedida: insumoData.unidadMedida,
          stockMinimo: insumoData.stockMinimo,
          proveedorId: insumoData.proveedorId,
          activo: insumoData.activo
        });
        
        try {
          // Cargar proveedores
          const proveedoresResponse = await authenticatedFetch('/api/admin/proveedores');
          if (!proveedoresResponse.ok) {
            console.error('Error al cargar proveedores:', await proveedoresResponse.text());
            setProveedores([]);
          } else {
            const proveedoresData = await proveedoresResponse.json();
            setProveedores(proveedoresData || []);
          }
        } catch (provError) {
          console.error('Error en carga de proveedores:', provError);
          setProveedores([]);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos del insumo');
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchData();
  }, [reset]); // Eliminamos params.id de las dependencias para evitar el warning
  
  const onSubmit: SubmitHandler<InsumoFormData> = async (data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/insumos/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar insumo');
      }
      
      // Redirigir a la lista de insumos
      router.push('/admin/insumos');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al actualizar insumo');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea desactivar este insumo?')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await fetch(`/api/admin/insumos/${params.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al desactivar insumo');
      }
      
      // Redirigir a la lista de insumos
      router.push('/admin/insumos');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al desactivar insumo');
    } finally {
      setIsDeleting(false);
    }
  };
  
  if (isFetchingData) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center p-8">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
            <p className="text-sm text-black">Cargando datos del insumo...</p>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }
  
  if (!insumo && !isFetchingData) {
    return (
      <ContrastEnhancer>
        <div className="flex flex-col items-center justify-center p-8">
          <p className="text-destructive font-medium text-black">Insumo no encontrado</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Volver
          </button>
        </div>
      </ContrastEnhancer>
    );
  }
  
  return (
    <ContrastEnhancer>
      <div className="flex flex-col gap-6 p-4 md:gap-8 md:p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight text-black">Editar Insumo</h1>
          </div>
          <button
            type="button"
            onClick={() => router.back()}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-background border px-4 py-2 text-sm font-medium text-black hover:bg-muted"
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
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <HCLabel htmlFor="nombre" className="text-sm font-medium leading-none">
                  Nombre
                </HCLabel>
                <HCInput
                  id="nombre"
                  type="text"
                  {...register('nombre')}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.nombre && (
                  <p className="text-sm text-destructive">{errors.nombre.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <HCLabel htmlFor="unidadMedida" className="text-sm font-medium leading-none">
                  Unidad de Medida
                </HCLabel>
                <HCInput
                  id="unidadMedida"
                  type="text"
                  {...register('unidadMedida')}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.unidadMedida && (
                  <p className="text-sm text-destructive">{errors.unidadMedida.message}</p>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <HCLabel htmlFor="descripcion" className="text-sm font-medium leading-none">
                Descripción (opcional)
              </HCLabel>
              <HCTextarea
                id="descripcion"
                rows={3}
                {...register('descripcion')}
                className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              ></HCTextarea>
              {errors.descripcion && (
                <p className="text-sm text-destructive">{errors.descripcion.message}</p>
              )}
            </div>
            
            <div className="grid gap-6 sm:grid-cols-2">
              <div className="space-y-2">
                <HCLabel htmlFor="stockMinimo" className="text-sm font-medium leading-none">
                  Stock Mínimo
                </HCLabel>
                <HCInput
                  id="stockMinimo"
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('stockMinimo', { valueAsNumber: true })}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                />
                {errors.stockMinimo && (
                  <p className="text-sm text-destructive">{errors.stockMinimo.message}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <HCLabel htmlFor="proveedorId" className="text-sm font-medium leading-none">
                  Proveedor (opcional)
                </HCLabel>
                <HCSelect
                  id="proveedorId"
                  {...register('proveedorId')}
                  className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="">Seleccionar proveedor</option>
                  {proveedores.map(proveedor => (
                    <option key={proveedor.id} value={proveedor.id}>
                      {proveedor.nombre}
                    </option>
                  ))}
                </HCSelect>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <input
                id="activo"
                type="checkbox"
                {...register('activo')}
                className="h-4 w-4 rounded border-input accent-accent"
              />
              <HCLabel htmlFor="activo" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Activo
              </HCLabel>
            </div>
            
            <div className="flex justify-between">
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Desactivando...
                  </>
                ) : (
                  <>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Desactivar Insumo
                  </>
                )}
              </button>
              
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
                    Guardar Cambios
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}