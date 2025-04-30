'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Book, ChevronLeft, Plus, Trash, Save, Loader2, Trash2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Producto } from '@prisma/client';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCLabel, HCInput, HCSelect, HCTextarea } from '@/components/ui/HighContrastComponents';

// Interfaces
interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
}

interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo: {
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
  productoRecetas?: Array<{
    id: string;
    productoId: string;
    producto: {
      nombre: string;
    }
  }>;
}

// Esquema de validación
const recetaSchema = z.object({
  nombre: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  descripcion: z.string().optional(),
  rendimiento: z.number().int().min(1, { message: 'El rendimiento debe ser al menos 1' }),
  items: z.array(
    z.object({
      id: z.string().optional(),
      insumoId: z.string().min(1, { message: 'Debe seleccionar un insumo' }),
      cantidad: z.number().min(0.01, { message: 'La cantidad debe ser mayor a 0' })
    })
  ).min(1, { message: 'Debe agregar al menos un insumo' })
});

type RecetaFormData = z.infer<typeof recetaSchema>;

export default function DetalleRecetaPage({ params }: { params: { id: string } }) {
  const [receta, setReceta] = useState<Receta | null>(null);
  const [insumos, setInsumos] = useState<Insumo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [selectedProductos, setSelectedProductos] = useState<string[]>([]);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    control,
    formState: { errors },
    reset,
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
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetchingData(true);
        
        // Cargar receta (código existente)
        const recetaResponse = await authenticatedFetch(`/api/admin/recetas/${params.id}`);
        if (!recetaResponse.ok) {
          throw new Error('Error al cargar receta');
        }
        const recetaData = await recetaResponse.json();
        setReceta(recetaData);
        
        // Establecer productos seleccionados
        if (recetaData.productoRecetas && recetaData.productoRecetas.length > 0) {
          setSelectedProductos(recetaData.productoRecetas.map((pr: any) => pr.productoId));
        }
        
        // Cargar productos disponibles
        const productosResponse = await authenticatedFetch('/api/admin/productos?soloActivos=true');
        if (productosResponse.ok) {
          const productosData = await productosResponse.json();
          setProductos(productosData.data || []);
        }
        
        // Establecer valores del formulario
        reset({
          nombre: recetaData.nombre,
          descripcion: recetaData.descripcion || '',
          rendimiento: recetaData.rendimiento,
          items: recetaData.items.map((item: RecetaItem) => ({
            id: item.id,
            insumoId: item.insumoId,
            cantidad: item.cantidad
          }))
        });

        // Cargar insumos
        const insumosResponse = await authenticatedFetch('/api/admin/recetas/insumos');
        if (insumosResponse.ok) {
          const insumosData = await insumosResponse.json();
          setInsumos(insumosData || []);
        }
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar los datos de la receta');
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchData();
  }, [params.id, reset]);
  
  // Manejar actualización de la receta
  const onSubmit = async (data: RecetaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const requestData = {
        ...data,
        productos: selectedProductos
      };
      
      const response = await authenticatedFetch(`/api/admin/recetas/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar receta');
      }
      
      // Actualizar estado local
      const updatedReceta = await response.json();
      setReceta(updatedReceta);
      
      // Mostrar mensaje de éxito
      alert('Receta actualizada correctamente');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al actualizar receta');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Manejar eliminación de la recetas
  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea eliminar esta receta? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/recetas/${params.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar receta');
      }
      
      // Redirigir a la lista de recetas
      router.push('/admin/recetas');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al eliminar receta');
    } finally {
      setIsDeleting(false);
    }
  };
  
  // Obtener unidad de medida del insumo seleccionado
  const getUnidadMedida = (insumoId: string) => {
    // Primero buscar en insumos cargados
    const insumo = insumos.find(i => i.id === insumoId);
    if (insumo) return insumo.unidadMedida;
 // Si no se encuentra, buscar en los items de la receta original
 const item = receta?.items.find(i => i.insumoId === insumoId);
 return item ? item.insumo.unidadMedida : '';
};

if (isFetchingData) {
 return (
   <ContrastEnhancer>
     <div className="flex items-center justify-center p-8">
       <div className="flex flex-col items-center gap-2">
         <Loader2 className="h-8 w-8 animate-spin text-accent" />
         <p className="text-sm text-black">Cargando datos de la receta...</p>
       </div>
     </div>
   </ContrastEnhancer>
 );
}

if (!receta && !isFetchingData) {
 return (
   <ContrastEnhancer>
     <div className="flex flex-col items-center justify-center p-8">
       <p className="text-destructive font-medium text-black">Receta no encontrada</p>
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
         <Book className="h-6 w-6 text-accent" />
         <h1 className="text-2xl font-bold tracking-tight text-black">Editar Receta</h1>
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
       
       {receta?.productoRecetas && receta.productoRecetas.length > 0 && (
         <div className="mb-6 rounded-md bg-amber-50 p-4">
           <h3 className="text-sm font-medium text-amber-800 mb-2">Productos asociados</h3>
           <p className="text-sm text-amber-700">
             Esta receta se utiliza en los siguientes productos:
           </p>
           <ul className="mt-2 list-disc list-inside text-sm text-amber-700">
             {receta.productoRecetas.map(pr => (
               <li key={pr.id}>{pr.producto.nombre}</li>
             ))}
           </ul>
         </div>
       )}
       
       <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
         <div className="grid gap-6 sm:grid-cols-2">
           <div className="space-y-2">
             <HCLabel htmlFor="nombre" className="text-sm font-medium leading-none">
               Nombre de la receta
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
             <HCLabel htmlFor="rendimiento" className="text-sm font-medium leading-none">
               Rendimiento (unidades producidas)
             </HCLabel>
             <HCInput
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
           <HCLabel htmlFor="descripcion" className="text-sm font-medium leading-none">
             Descripción (opcional)
           </HCLabel>
           <HCTextarea
             id="descripcion"
             rows={3}
             {...register('descripcion')}
             className="flex w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
           ></HCTextarea>
         </div>
         
         <div className="space-y-4">
           <div className="flex items-center justify-between">
             <h3 className="text-md font-medium text-black">Insumos</h3>
             <button
               type="button"
               onClick={() => append({ insumoId: '', cantidad: 1 })}
               className="inline-flex items-center justify-center rounded-md bg-primary/10 text-primary px-3 py-1 text-sm"
             >
               <Plus className="mr-1 h-4 w-4" />
               Agregar insumo
             </button>
           </div>

           <div className="space-y-4 mt-6">
             <div className="flex items-center justify-between">
               <h3 className="text-md font-medium text-black">Productos asociados</h3>
               <p className="text-sm text-black">Seleccione los productos finales que se generan con esta receta</p>
             </div>
             
             <div className="bg-gray-50 p-4 rounded-md">
               {productos.length === 0 ? (
                 <p className="text-sm text-black">Cargando productos disponibles...</p>
               ) : (
                 <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                   {productos.map(producto => (
                     <div key={producto.id} className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-100">
                       <input
                         type="checkbox"
                         id={`producto-${producto.id}`}
                         value={producto.id}
                         checked={selectedProductos.includes(producto.id)}
                         onChange={(e) => {
                           if (e.target.checked) {
                             setSelectedProductos([...selectedProductos, producto.id]);
                           } else {
                             setSelectedProductos(selectedProductos.filter(id => id !== producto.id));
                           }
                         }}
                         className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                       />
                       <label htmlFor={`producto-${producto.id}`} className="text-sm text-black flex-1">
                         {producto.nombre}
                       </label>
                     </div>
                   ))}
                 </div>
               )}
               {selectedProductos.length > 0 && (
                 <div className="mt-3 text-sm text-indigo-600">
                   {selectedProductos.length} producto(s) seleccionado(s)
                 </div>
               )}
             </div>
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
                     <HCLabel htmlFor={`items.${index}.insumoId`} className="text-sm font-medium leading-none">
                       Insumo
                     </HCLabel>
                     <HCSelect
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
                     </HCSelect>
                     {errors.items?.[index]?.insumoId && (
                       <p className="text-sm text-destructive">{errors.items[index]?.insumoId?.message}</p>
                     )}
                   </div>
                   
                   <div className="w-32 space-y-2">
                     <HCLabel htmlFor={`items.${index}.cantidad`} className="text-sm font-medium leading-none">
                       Cantidad
                     </HCLabel>
                     <div className="flex items-center">
                       <HCInput
                         id={`items.${index}.cantidad`}
                         type="number"
                         step="0.01"
                         min="0.01"
                         {...register(`items.${index}.cantidad`, { valueAsNumber: true })}
                         className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                       />
                       <span className="ml-2 text-sm text-black">
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
         
         <div className="flex justify-between">
           <button
             type="button"
             onClick={handleDelete}
             disabled={isDeleting || (receta?.productoRecetas && receta.productoRecetas.length > 0)}
             className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
           >
             {isDeleting ? (
               <>
                 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                 Eliminando...
               </>
             ) : (
               <>
                 <Trash2 className="mr-2 h-4 w-4" />
                 Eliminar Receta
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