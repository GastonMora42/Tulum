// src/app/(fabrica)/fabrica/contingencias/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// Interfaces
interface Produccion {
  id: string;
  recetaId: string;
  cantidad: number;
  fechaInicio: string;
  estado: string;
  receta: {
    nombre: string;
  };
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  estado: string;
  fechaCreacion: string;
  destino: {
    nombre: string;
  };
}

// Esquema de validación
const contingenciaSchema = z.object({
  titulo: z.string().min(5, { message: 'El título debe tener al menos 5 caracteres' }),
  descripcion: z.string().min(10, { message: 'La descripción debe tener al menos 10 caracteres' }),
  produccionId: z.string().optional(),
  envioId: z.string().optional()
});

type ContingenciaFormData = z.infer<typeof contingenciaSchema>;

export default function NuevaContingenciaFabricaPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingData, setIsFetchingData] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [producciones, setProducciones] = useState<Produccion[]>([]);
  const [envios, setEnvios] = useState<Envio[]>([]);
  const router = useRouter();
  
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

  // Cargar producciones y envíos recientes
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsFetchingData(true);
        
        // Cargar producciones recientes
        const prodResponse = await fetch('/api/fabrica/produccion?estados=en_proceso,con_contingencia&limit=10');
        if (!prodResponse.ok) throw new Error('Error al cargar producciones');
        const prodData = await prodResponse.json();
        setProducciones(prodData);
        
        // Cargar envíos recientes
        const enviosResponse = await fetch('/api/fabrica/envios?estados=pendiente,en_transito,con_contingencia&limit=10');
        if (!enviosResponse.ok) throw new Error('Error al cargar envíos');
        const enviosData = await enviosResponse.json();
        setEnvios(enviosData);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setIsFetchingData(false);
      }
    };

    fetchData();
  }, []);
  
  const onSubmit = async (data: ContingenciaFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Añadir origen 'fabrica' automáticamente
      const payload = {
        ...data,
        origen: 'fabrica'
      };
      
      const response = await fetch('/api/contingencias', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contingencia');
      }
      
      // Si hay producción o envío relacionado, actualizar su estado
      if (data.produccionId) {
        await fetch(`/api/fabrica/produccion/${data.produccionId}/estado`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ estado: 'con_contingencia' })
        });
      }
      
      if (data.envioId) {
        await fetch(`/api/fabrica/envios/${data.envioId}/estado`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ estado: 'con_contingencia' })
        });
      }
      
      // Redirigir a la lista de contingencias
      router.push('/fabrica/contingencias');
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
        <h1 className="text-2xl font-bold">Reportar Contingencia de Fábrica</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-purple-600 hover:text-purple-900"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
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
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="Describa detalladamente el problema que ha encontrado"
            ></textarea>
            {errors.descripcion && (
              <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="produccionId" className="block text-sm font-medium text-gray-700">
              Producción relacionada (opcional)
            </label>
            <select
              id="produccionId"
              {...register('produccionId')}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              <option value="">Ninguna</option>
              {isFetchingData ? (
                <option disabled>Cargando producciones...</option>
              ) : (
                producciones.map(produccion => (
                  <option key={produccion.id} value={produccion.id}>
                    #{produccion.id.slice(-6)} - {produccion.receta.nombre} ({produccion.cantidad} unidades)
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div>
            <label htmlFor="envioId" className="block text-sm font-medium text-gray-700">
              Envío relacionado (opcional)
            </label>
            <select
              id="envioId"
              {...register('envioId')}
              className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
            >
              <option value="">Ninguno</option>
              {isFetchingData ? (
                <option disabled>Cargando envíos...</option>
              ) : (
                envios.map(envio => (
                  <option key={envio.id} value={envio.id}>
                    Envío #{envio.id.slice(-6)} - {envio.destino.nombre}
                  </option>
                ))
              )}
            </select>
          </div>
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
            >
              {isLoading ? 'Enviando...' : 'Reportar Contingencia'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}