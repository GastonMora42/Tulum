// src/components/pdv/NuevaContingencia.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AlertTriangle, Save, X } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { useOffline } from '@/hooks/useOffline';

// Esquema de validación con Zod
const contingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  tipo: z.enum(['producto', 'stock', 'caja', 'sistema', 'otro']),
  envioId: z.string().optional(),
  urgente: z.boolean().default(false)
});

type ContingenciaFormData = z.infer<typeof contingenciaSchema>;

export function NuevaContingencia() {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const { isOnline } = useOffline();
  
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<ContingenciaFormData>({
    resolver: zodResolver(contingenciaSchema),
    defaultValues: {
      tipo: 'otro',
      urgente: false
    }
  });
  
  const onSubmit = async (data: ContingenciaFormData) => {
    try {
      setIsSaving(true);
      setError(null);
      
      // Preparar datos
      const contingenciaData = {
        ...data,
        origen: 'sucursal'
      };
      
      const response = await authenticatedFetch('/api/contingencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contingenciaData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contingencia');
      }
      
      // Éxito
      setSuccess(true);
      reset(); // Limpiar formulario
      
      // Redireccionar después de 2 segundos
      setTimeout(() => {
        router.push('/pdv/contingencias');
        router.refresh();
      }, 2000);
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear contingencia');
    } finally {
      setIsSaving(false);
    }
  };
  
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="px-6 py-4 bg-[#311716] text-white border-b">
        <h2 className="text-xl font-semibold">Reportar Nueva Contingencia</h2>
      </div>
      
      {/* Mensajes de error/éxito */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-4 bg-green-50 border-l-4 border-green-500 text-green-700 mb-4">
          <div className="flex">
            <Save className="h-5 w-5 mr-2" />
            <p>Contingencia reportada correctamente. Redireccionando...</p>
          </div>
        </div>
      )}
      
      {!isOnline && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-500 text-yellow-700 mb-4">
          <div className="flex">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <p>Estás trabajando en modo offline. La contingencia se enviará cuando recuperes la conexión.</p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit(onSubmit)} className="p-6">
        <div className="space-y-6">
          <div>
            <label htmlFor="titulo" className="block text-sm font-medium text-gray-700 mb-1">
              Título <span className="text-red-500">*</span>
            </label>
            <input
              id="titulo"
              type="text"
              {...register('titulo')}
              className={`w-full p-3 border rounded-md ${
                errors.titulo ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Describe brevemente la contingencia"
            />
            {errors.titulo && (
              <p className="mt-1 text-sm text-red-600">{errors.titulo.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de Contingencia <span className="text-red-500">*</span>
            </label>
            <select
              id="tipo"
              {...register('tipo')}
              className="w-full p-3 border border-gray-300 rounded-md"
            >
              <option value="producto">Producto (calidad, faltante)</option>
              <option value="stock">Stock (diferencia inventario)</option>
              <option value="caja">Caja (diferencia efectivo)</option>
              <option value="sistema">Sistema (error técnico)</option>
              <option value="otro">Otro</option>
            </select>
            {errors.tipo && (
              <p className="mt-1 text-sm text-red-600">{errors.tipo.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
              Descripción Detallada <span className="text-red-500">*</span>
            </label>
            <textarea
              id="descripcion"
              {...register('descripcion')}
              rows={5}
              className={`w-full p-3 border rounded-md ${
                errors.descripcion ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="Explica con detalle lo ocurrido, cuándo sucedió y qué acciones se tomaron"
            ></textarea>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>
          
          <div className="flex items-center">
            <input
              id="urgente"
              type="checkbox"
              {...register('urgente')}
              className="h-4 w-4 text-[#311716] focus:ring-[#9c7561] border-gray-300 rounded"
            />
            <label htmlFor="urgente" className="ml-2 block text-sm text-gray-700">
              Marcar como urgente
            </label>
          </div>
          
          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-3"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 bg-[#311716] text-white rounded-md hover:bg-[#462625] disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Reportar Contingencia'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}