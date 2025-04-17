'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, TagIcon, Save, Loader2 } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Esquema de validación
const categoriaSchema = z.object({
  nombre: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres' })
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;

export default function NuevaCategoriaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    formState: { errors }
  } = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nombre: ''
    }
  });

  const onSubmit = async (data: CategoriaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/admin/categorias', {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear categoría');
      }
      
      // Redireccionar a la lista de categorías
      router.push('/admin/categorias');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear categoría');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <TagIcon className="h-6 w-6 text-indigo-600 mr-2" />
          <h1 className="text-2xl font-bold">Nueva Categoría</h1>
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
              placeholder="Ej: Velas aromáticas"
            />
            {errors.nombre && (
              <p className="mt-1 text-sm text-red-600">{errors.nombre.message}</p>
            )}
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
                  Creando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Guardar categoría
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}