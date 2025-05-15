// src/app/(pdv)/pdv/contingencias/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuthStore } from '@/stores/authStore';
import { authenticatedFetch } from '@/hooks/useAuth';
import { MediaUploader } from '@/components/ui/MediaUploader';
import { HCLabel } from '@/components/ui/HighContrastComponents';

// Interfaces
interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  estado: string;
  fechaCreacion: string;
}

// Esquema de validación
const contingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  envioId: z.string().optional()
});

type ContingenciaFormData = z.infer<typeof contingenciaSchema>;

export default function NuevaContingenciaPDVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEnvios, setIsFetchingEnvios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const router = useRouter();
  const { user } = useAuthStore();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');

  const { 
    register, 
    handleSubmit, 
    formState: { errors }
  } = useForm<ContingenciaFormData>({
    resolver: zodResolver(contingenciaSchema),
    defaultValues: {
      titulo: '',
      descripcion: ''
    }
  });

  // Cargar envíos recientes para esta sucursal
  useEffect(() => {
    const fetchEnvios = async () => {
      if (!user?.sucursalId) return;
      
      try {
        setIsFetchingEnvios(true);
        const response = await authenticatedFetch(`/api/envios?destinoId=${user.sucursalId}&estado=recibido,en_transito`);
        
        if (!response.ok) {
          throw new Error('Error al cargar envíos');
        }
        
        const data = await response.json();
        setEnvios(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsFetchingEnvios(false);
      }
    };

    fetchEnvios();
  }, [user]);
  
  const onSubmit = async (data: ContingenciaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Añadir origen 'sucursal' automáticamente
      const payload = {
        ...data,
        origen: 'sucursal{user.sucursalId}',
        imagenUrl: mediaType === 'image' ? mediaUrl : undefined,
        videoUrl: mediaType === 'video' ? mediaUrl : undefined,
        mediaType: mediaUrl ? mediaType : undefined
      };
      
      const response = await authenticatedFetch('/api/contingencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contingencia');
      }
      
      // Redirigir a la lista de contingencias
      router.push('/pdv/contingencias');
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
        <h1 className="text-2xl font-bold">Reportar Contingencia</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-blue-600 hover:text-blue-900"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Describa detalladamente el problema que ha encontrado"
            ></textarea>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="envioId" className="block text-sm font-medium text-gray-700">
              Envío relacionado (opcional)
            </label>
            <select
              id="envioId"
              {...register('envioId')}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            >
              <option value="">Ninguno</option>
              {isFetchingEnvios ? (
                <option disabled>Cargando envíos...</option>
              ) : (
                envios.map(envio => (
                  <option key={envio.id} value={envio.id}>
                    Envío #{envio.id.slice(-6)} - {new Date(envio.fechaCreacion).toLocaleDateString()}
                  </option>
                ))
              )}
            </select>
          </div>

          <div className="space-y-2">
  <HCLabel htmlFor="adjunto" className="block text-sm font-medium">
    Archivo Adjunto (opcional)
  </HCLabel>
  <MediaUploader
    type="contingency"
    onMediaUpload={(url, type) => {
      setMediaUrl(url);
      setMediaType(type);
      console.log(`Archivo ${type} recibido:`, url);
    }}
  />
  <p className="text-xs text-gray-500">
    Los archivos adjuntos se eliminarán automáticamente cuando se resuelva la contingencia
    o después de 30 días si no se resuelve.
  </p>
</div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              {isLoading ? 'Enviando...' : 'Reportar Contingencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}