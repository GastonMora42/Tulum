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

const contingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  origen: z.enum(['fabrica', 'sucursal', 'oficina'], {
    message: 'Debe seleccionar un origen válido'
  }),
  // Añadir nuevos campos
  ubicacionId: z.string().optional(),
  conciliacionId: z.string().optional(),
  // Campos existentes
  produccionId: z.string().optional(),
  envioId: z.string().optional()
});

type ContingenciaFormData = z.infer<typeof contingenciaSchema>;

export default function NuevaContingenciaPDVPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingEnvios, setIsFetchingEnvios] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const router = useRouter();
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [ubicaciones, setUbicaciones] = useState<{id: string; nombre: string}[]>([]);
  const { user } = useAuthStore();
  const sucursalId = user?.sucursalId;
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch  // Añadir watch aquí
  } = useForm<ContingenciaFormData>({
    resolver: zodResolver(contingenciaSchema),
    defaultValues: {
      titulo: '',
      descripcion: '',
      origen: 'oficina'
    }
  });

  const selectedOrigen = watch('origen');

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

  useEffect(() => {
    const fetchUbicaciones = async () => {
      try {
        const response = await authenticatedFetch('/api/admin/ubicaciones');
        if (response.ok) {
          const data = await response.json();
          setUbicaciones(data);
        }
      } catch (error) {
        console.error('Error al cargar ubicaciones:', error);
      }
    };
    
    fetchUbicaciones();
  }, []);
  
const onSubmit = async (data: ContingenciaFormData) => {
  try {
    setIsLoading(true);
    setError(null);
    
    // Mejora del manejo de campos
    const payload = {
      ...data,
      origen: 'sucursal', // Asegurar origen correcto para PDV
      
      // Mejor manejo de campos opcionales
      produccionId: data.produccionId || undefined, // Evita enviar string vacío
      envioId: data.envioId || undefined,
      ubicacionId: data.ubicacionId || undefined,
      conciliacionId: data.conciliacionId || undefined,
      
      // Campos multimedia mejorados
      mediaUrl: mediaUrl, // Campo adicional para compatibilidad
      mediaType: mediaUrl ? mediaType : undefined,
      imagenUrl: mediaType === 'image' && mediaUrl ? mediaUrl : undefined,
      videoUrl: mediaType === 'video' && mediaUrl ? mediaUrl : undefined
    };
    
    console.log("Enviando payload de contingencia:", payload);
    
    const response = await authenticatedFetch('/api/contingencias', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });  
    
    const responseData = await response.json();
    
    if (!response.ok) {
      console.error("Error al crear contingencia:", responseData);
      throw new Error(responseData.error || 'Error al crear contingencia');
    }
    
    // Confirmar éxito con ID
    alert(`Contingencia creada correctamente (ID: ${responseData.id})`);
    
    // Redirigir a la lista de contingencias DE PDV (no admin)
    router.push('/pdv/contingencias');
    router.refresh();
  } catch (err: any) {
    console.error('Error detallado:', err);
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
      
      <input 
  type="hidden" 
  {...register('ubicacionId')} 
  value={sucursalId || ''} 
/>

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

          <div>
  <label htmlFor="ubicacionId" className="block text-sm font-medium text-gray-700">
    Ubicación específica (opcional)
  </label>
  <select
    id="ubicacionId"
    {...register('ubicacionId')}
    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
  >
    <option value="">-- Seleccionar ubicación --</option>
    {ubicaciones.map(ubicacion => (
      <option key={ubicacion.id} value={ubicacion.id}>
        {ubicacion.nombre}
      </option>
    ))}
  </select>
  <p className="mt-1 text-xs text-gray-500">
    Si no selecciona ninguna, se considerará una contingencia general
  </p>
</div>

{selectedOrigen === 'sucursal' && (
  <div>
    <label htmlFor="conciliacionId" className="block text-sm font-medium text-gray-700">
      Conciliación relacionada (opcional)
    </label>
    <input
      id="conciliacionId"
      type="text"
      {...register('conciliacionId')}
      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
      placeholder="ID de la conciliación relacionada"
    />
  </div>
)}

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