'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ArrowLeft, Send, Package } from 'lucide-react';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCTextarea, HCLabel } from '@/components/ui/HighContrastComponents';

// Interfaces
interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
}

interface Usuario {
  id: string;
  name: string;
  email: string;
}

interface Insumo {
  id: string;
  nombre: string;
  unidadMedida: string;
}

interface ItemEnvio {
  id: string;
  insumoId: string;
  cantidad: number;
  cantidadRecibida?: number | null;
  insumo: Insumo;
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  usuarioId: string;
  estado: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  observaciones?: string | null;
  origen: Ubicacion;
  destino: Ubicacion;
  usuario: Usuario;
  items: ItemEnvio[];
}

const envioSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      cantidad: z.number()
        .nonnegative("La cantidad no puede ser negativa")
    })
  ),
  observaciones: z.string().optional()
});

type EnvioFormData = z.infer<typeof envioSchema>;

export default function DetalleEnvioPage() {
  // Usar useParams en lugar de recibir params como prop
  const params = useParams();
  const id = params.id as string;
  
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    watch,
    control,
    setValue,
    formState: { errors } 
  } = useForm<EnvioFormData>({
    resolver: zodResolver(envioSchema),
    defaultValues: {
      items: [],
      observaciones: ''
    }
  });
  
  const { fields } = useFieldArray({
    control,
    name: "items"
  });
  
  useEffect(() => {
    const fetchEnvio = async () => {
      try {
        setIsLoading(true);
        
        const response = await authenticatedFetch(`/api/admin/envios-insumos/${id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar envío');
        }
        
        const data = await response.json();
        setEnvio(data);
        
        // Inicializar formulario con los items - IMPORTANTE: usar las cantidades originales
        setValue('items', data.items.map((item: ItemEnvio) => ({
          id: item.id,
          cantidad: item.cantidad // Usar cantidad completa por defecto
        })));
        
        if (data.observaciones) {
          setValue('observaciones', data.observaciones);
        }
      } catch (err: any) {
        console.error('Error:', err);
        setError('Error al cargar el envío');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchEnvio();
  }, [id, setValue]);

// Modificar la función onSubmit
const onSubmit = async (data: EnvioFormData) => {
  try {
    setIsSending(true);
    setError(null);
    
    console.log('Enviando datos:', data); // Para depuración
    
    const response = await authenticatedFetch(`/api/admin/envios-insumos/${id}/enviar`, {
      method: 'POST',
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al procesar envío');
    }
    
    // Redireccionar a la lista
    router.push('/admin/envios-insumos');
    router.refresh();
  } catch (err: any) {
    console.error('Error:', err);
    setError(err.message || 'Error al procesar el envío');
  } finally {
    setIsSending(false);
  }
};
  
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };
  
  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="flex justify-center items-center h-48">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        </div>
      </ContrastEnhancer>
    );
  }
  
  if (!envio) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <p className="text-red-500">{error || 'Envío no encontrado'}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded"
          >
            Volver
          </button>
        </div>
      </ContrastEnhancer>
    );
  }
  
  // Si el envío ya fue procesado, mostrar vista de solo lectura
  if (envio.estado !== 'pendiente') {
    return (
      <ContrastEnhancer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-black">Detalle de Envío #{envio.id.substr(-6)}</h1>
            <button
              onClick={() => router.back()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm rounded-md text-black bg-white hover:bg-gray-50"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </button>
          </div>
          
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-blue-50">
              <h3 className="text-lg leading-6 font-medium text-blue-900">
                Envío {envio.estado === 'enviado' ? 'Procesado' : 'Recibido'}
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-blue-500">
                Este envío ya ha sido {envio.estado === 'enviado' ? 'procesado' : 'recibido por la fábrica'}.
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Destino</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {envio.destino.nombre}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Estado</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      envio.estado === 'enviado' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'
                    }`}>
                      {envio.estado === 'enviado' ? 'Enviado' : 'Recibido'}
                    </span>
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Fecha de creación</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaCreacion)}
                  </dd>
                </div>
                {envio.fechaEnvio && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-black">Fecha de envío</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                      {formatDate(envio.fechaEnvio)}
                    </dd>
                  </div>
                )}
                {envio.observaciones && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-black">Observaciones</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                      {envio.observaciones}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-indigo-50">
              <h3 className="text-lg leading-6 font-medium text-indigo-900">
                Insumos Enviados
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Insumo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Unidad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {envio.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                        {item.insumo.nombre}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {item.cantidad}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                        {item.insumo.unidadMedida}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }
  
  // Formulario de envío para estado pendiente
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Procesar Envío #{envio.id.substr(-6)}</h1>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm rounded-md text-black bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </button>
        </div>
        
        {error && (
          <div className="bg-red-100 p-4 rounded-md text-red-700">
            {error}
          </div>
        )}
        
        <div className="bg-white shadow sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-yellow-50">
            <h3 className="text-lg leading-6 font-medium text-yellow-900">
              <Package className="inline-block h-5 w-5 mr-2" />
              Solicitud de Insumos
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-yellow-500">
              Ajuste las cantidades según disponibilidad y procese el envío.
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-6">
            <div className="overflow-x-auto bg-gray-50 rounded-lg p-4">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Insumo
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Cantidad Solicitada
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Cantidad a Enviar
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-black uppercase tracking-wider">
                      Unidad
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {fields.map((field, index) => {
                    const itemOriginal = envio.items.find(i => i.id === field.id);
                    const solicitado = itemOriginal ? itemOriginal.cantidad : 0;
                    const unidad = itemOriginal?.insumo?.unidadMedida || '';
                    
                    return (
                      <tr key={field.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-black">
                          {itemOriginal?.insumo?.nombre || ''}
                          <input type="hidden" {...register(`items.${index}.id`)} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {solicitado}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <HCInput
                            type="number"
                            min="0"
                            className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                            {...register(`items.${index}.cantidad`, { 
                              valueAsNumber: true,
                              min: { value: 0, message: "La cantidad no puede ser negativa" }
                            })}
                          />
                          {errors.items?.[index]?.cantidad && (
                            <p className="mt-1 text-xs text-red-600">{errors.items[index]?.cantidad?.message}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-black">
                          {unidad}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            <div>
              <HCLabel htmlFor="observaciones" className="block text-sm font-medium mb-1">
                Observaciones
              </HCLabel>
              <HCTextarea
                id="observaciones"
                rows={3}
                className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="Observaciones sobre el envío..."
                {...register('observaciones')}
              ></HCTextarea>
            </div>
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSending}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    Procesando...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Procesar Envío
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