'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, TagIcon, Save, Trash, Loader2, AlertCircle } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface Categoria {
  id: string;
  nombre: string;
}

// Esquema de validación
const categoriaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;

export default function EditarCategoriaPage({ params }: { params: { id: string } }) {
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFetching, setIsFetching] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    reset
  } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: ''
    }
  });

  // Cargar categoría
  useEffect(() => {
    const fetchCategoria = async () => {
      try {
        setIsFetching(true);
        
        const response = await authenticatedFetch(`/api/admin/categorias/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar categoría');
        }
        
        const data = await response.json();
        setCategoria(data);
        
        // Establecer valores del formulario
        reset({
          nombre: data.nombre
        });
      } catch (err) {
        console.error('Error:', err);
        setError('Error al cargar categoría');
      } finally {
        setIsFetching(false);
      }
    };

    fetchCategoria();
  }, [params.id, reset]);

  const onSubmit = async (data: CategoriaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/categorias/${params.id}`, {
        method: 'PATCH',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar categoría');
      }
      
      // Actualizar datos locales
      const updatedCategoria = await response.json();
      setCategoria(updatedCategoria);
      
      // Mostrar mensaje de éxito
      alert('Categoría actualizada correctamente');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al actualizar categoría');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('¿Está seguro de que desea eliminar esta categoría? Esta acción no se puede deshacer y puede afectar a productos existentes.')) {
      return;
    }
    
    try {
      setIsDeleting(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/categorias/${params.id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar categoría');
      }
      
      // Redireccionar a la lista de categorías
      router.push('/admin/categorias');
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al eliminar categoría');
    } finally {
      setIsDeleting(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Cargando categoría...</span>
      </div>
    );
  }

  if (!categoria && !isFetching) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Categoría no encontrada</h2>
        <p className="text-gray-500 mb-4">La categoría que estás buscando no existe o ha sido eliminada.</p>
        <button
          onClick={() => router.push('/admin/categorias')}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Volver a categorías
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <TagIcon className="h-6 w-6 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold">Editar Categoría</h1>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la categoría *
            </label>
            <input
              id="nombre"
              type="text"
              {...register('nombre')}
              className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash className="h-4 w-4 mr-2" />
                  Eliminar categoría
                </>
              )}
            </button>
            
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}