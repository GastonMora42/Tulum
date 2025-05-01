// src/app/(fabrica)/fabrica/contingencias/nueva/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCSelect, HCTextarea, HCLabel, HCButton } from '@/components/ui/HighContrastComponents';

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
        const prodResponse = await authenticatedFetch('/api/fabrica/produccion?estados=en_proceso,con_contingencia&limit=10');
        if (!prodResponse.ok) throw new Error('Error al cargar producciones');
        const prodData = await prodResponse.json();
        
        console.log('Producciones cargadas:', prodData);
        setProducciones(prodData.filter((p: { id: any; }) => p && p.id) || []);
        
        // Cargar envíos recientes
        const enviosResponse = await authenticatedFetch('/api/fabrica/envios?estados=pendiente,en_transito,con_contingencia&limit=10');
        if (!enviosResponse.ok) throw new Error('Error al cargar envíos');
        const enviosData = await enviosResponse.json();
        
        console.log('Envíos cargados:', enviosData);
        setEnvios(enviosData.filter((e: { id: any; }) => e && e.id) || []);
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
      
      // Limpiar datos vacíos para evitar errores de clave foránea
      const payload = {
        ...data,
        origen: 'fabrica',
        // Asegurarse de que los valores vacíos sean null, no strings vacíos
        produccionId: data.produccionId || null,
        envioId: data.envioId || null
      };
      
      console.log('Enviando contingencia:', payload);
      
      const response = await authenticatedFetch('/api/contingencias', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear contingencia');
      }
      
      // Si hay producción o envío relacionado, actualizar su estado
      if (data.produccionId) {
        await authenticatedFetch(`/api/fabrica/produccion/${data.produccionId}/estado`, {
          method: 'PATCH',
          body: JSON.stringify({ estado: 'con_contingencia' })
        });
      }
      
      if (data.envioId) {
        await authenticatedFetch(`/api/fabrica/envios/${data.envioId}/estado`, {
          method: 'PATCH',
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
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Reportar Contingencia de Fábrica</h1>
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
              <HCLabel htmlFor="titulo">Título</HCLabel>
              <HCInput
                id="titulo"
                type="text"
                {...register('titulo')}
              />
              {errors.titulo && (
                <p className="mt-1 text-sm text-red-600">{errors.titulo.message}</p>
              )}
            </div>
            
            <div>
              <HCLabel htmlFor="descripcion">Descripción</HCLabel>
              <HCTextarea
                id="descripcion"
                rows={4}
                {...register('descripcion')}
                placeholder="Describa detalladamente el problema que ha encontrado"
              ></HCTextarea>
              {errors.descripcion && (
                <p className="mt-1 text-sm text-red-600">{errors.descripcion.message}</p>
              )}
            </div>
            
            <div>
              <HCLabel htmlFor="produccionId">Producción relacionada (opcional)</HCLabel>
              <HCSelect
                id="produccionId"
                {...register('produccionId')}
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
              </HCSelect>
            </div>
            
            <div>
              <HCLabel htmlFor="envioId">Envío relacionado (opcional)</HCLabel>
              <HCSelect
                id="envioId"
                {...register('envioId')}
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
              </HCSelect>
            </div>
            
            <div className="flex justify-end">
              <HCButton
                type="submit"
                disabled={isLoading}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                {isLoading ? 'Enviando...' : 'Reportar Contingencia'}
              </HCButton>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}