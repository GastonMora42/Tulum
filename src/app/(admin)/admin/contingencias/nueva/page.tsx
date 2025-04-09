// src/app/(admin)/admin/contingencias/nueva/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Esquema de validación
const contingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  origen: z.enum(['fabrica', 'sucursal', 'oficina'], {
    message: 'Debe seleccionar un origen válido'
  }),
  produccionId: z.string().optional(),
  envioId: z.string().optional()
});

type ContingenciaFormData = z.infer<typeof contingenciaSchema>;

export default function NuevaContingenciaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm<ContingenciaFormData>({
    resolver: zodResolver(contingenciaSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      origen: 'oficina'
    }
  });
  
  const selectedOrigen = watch('origen');
  
  const onSubmit = async (data: ContingenciaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/contingencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contingencia');
      }
      
      // Redirigir a la lista de contingencias
      router.push('/admin/contingencias');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear contingencia');
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nueva Contingencia</h1>
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
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700">
              Título
            </label>
            <input
              id="titulo"
              type="text"
              {...register('titulo')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.titulo && (
              <p className="mt-1 text-sm text-red-600">{errors.titulo.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700">
              Descripción
            </label>
            <textarea
              id="descripcion"
              rows={4}
              {...register('descripcion')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="origen" className="block text-sm font-medium text-gray-700">
              Origen
            </label>
            <select
              id="origen"
              {...register('origen')}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="fabrica">Fábrica</option>
              <option value="sucursal">Sucursal</option>
              <option value="oficina">Oficina</option>
            </select>
            {errors.origen && (
              <p className="mt-1 text-sm text-red-600">{errors.origen.message}</p>
            )}
          </div>
          
          {selectedOrigen === 'fabrica' && (
            <div>
              <label htmlFor="produccionId" className="block text-sm font-medium text-gray-700">
                ID de Producción (opcional)
              </label>
              <input
                id="produccionId"
                type="text"
                {...register('produccionId')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ingresa el ID de producción si es relevante"
              />
            </div>
          )}
          
          {(selectedOrigen === 'fabrica' || selectedOrigen === 'sucursal') && (
            <div>
              <label htmlFor="envioId" className="block text-sm font-medium text-gray-700">
                ID de Envío (opcional)
              </label>
              <input
                id="envioId"
                type="text"
                {...register('envioId')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Ingresa el ID de envío si es relevante"
              />
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              {isLoading ? 'Creando...' : 'Crear Contingencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}