'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft, Clipboard, Check, AlertTriangle, Loader2, Package } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

interface ItemEnvio {
  id: string;
  insumoId: string;
  cantidad: number;
  cantidadRecibida: number | null;
  insumo: {
    id: string;
    nombre: string;
    unidadMedida: string;
  };
}

interface Envio {
  id: string;
  origenId: string;
  destinoId: string;
  fechaCreacion: string;
  fechaEnvio: string | null;
  fechaRecepcion: string | null;
  estado: string;
  observaciones: string | null;
  usuarioId: string;
  origen: {
    id: string;
    nombre: string;
    tipo: string;
  };
  destino: {
    id: string;
    nombre: string;
    tipo: string;
  };
  usuario: {
    id: string;
    name: string;
    email: string;
  };
  items: ItemEnvio[];
}

// Esquema de validación
const recepcionSchema = z.object({
  observaciones: z.string().optional(),
  items: z.array(
    z.object({
      itemEnvioId: z.string(),
      cantidadRecibida: z.number().min(0, { message: 'La cantidad no puede ser negativa' })
    })
  )
});

type RecepcionFormData = z.infer<typeof recepcionSchema>;

export default function RecibirEnvioPage({ params }: { params: { id: string } }) {
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const { 
    register, 
    handleSubmit, 
    control,
    watch,
    setValue,
    formState: { errors }
  } = useForm<RecepcionFormData>({
    resolver: zodResolver(recepcionSchema),
    defaultValues: {
      observaciones: '',
      items: []
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
        
        const response = await authenticatedFetch(`/api/envios/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar el envío');
        }
        
        const data = await response.json();
        setEnvio(data);
        
        // Inicializar campos del formulario
        const itemsInitial = data.items.map((item: ItemEnvio) => ({
          itemEnvioId: item.id,
          cantidadRecibida: item.cantidad // Por defecto se recibe la misma cantidad
        }));
        
        setValue('items', itemsInitial);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar el envío');
      } finally {
        setIsLoading(false);
      }
    };

    fetchEnvio();
  }, [params.id, setValue]);

  const onSubmit = async (data: RecepcionFormData) => {
    if (!envio) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      // Verificar si hay discrepancias
      const hayDiscrepancias = data.items.some(item => {
        const envioItem = envio.items.find(i => i.id === item.itemEnvioId);
        return envioItem && envioItem.cantidad !== item.cantidadRecibida;
      });
      
      // Confirmar si hay discrepancias
      if (hayDiscrepancias) {
        const confirmar = window.confirm(
          'Se han detectado diferencias entre las cantidades enviadas y recibidas. ' +
          'Esto generará una contingencia que deberá ser resuelta. ¿Desea continuar?'
        );
        
        if (!confirmar) {
          setIsSubmitting(false);
          return;
        }
      }
      
      // Enviar datos al servidor
      const response = await authenticatedFetch(`/api/fabrica/envios/${envio.id}/recibir`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al recibir el envío');
      }
      
      const resultado = await response.json();
      
      // Redireccionar según si hay contingencias o no
      if (resultado.hayDiscrepancias) {
        // Mostrar alerta y redireccionar a contingencias
        alert('Se ha generado una contingencia debido a las diferencias detectadas.');
        router.push('/fabrica/contingencias');
      } else {
        // Redireccionar a la lista de envíos
        router.push('/fabrica/envios');
      }
      
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al recibir el envío');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-yellow-800';
      case 'enviado':
        return 'bg-blue-100 text-blue-800';
      case 'en_transito':
        return 'bg-indigo-100 text-indigo-800';
      case 'recibido':
        return 'bg-green-100 text-green-800';
      case 'con_contingencia':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-';
    try {
      return format(new Date(dateString), 'dd/MM/yyyy HH:mm');
    } catch (e) {
      return dateString;
    }
  };

  // Verificar si un item tiene diferencia con la cantidad original
  const tieneDiferencia = (itemEnvioId: string, cantidadRecibida: number) => {
    if (!envio) return false;
    const item = envio.items.find(i => i.id === itemEnvioId);
    return item && item.cantidad !== cantidadRecibida;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-green-500" />
        <span className="ml-2 text-gray-500">Cargando envío...</span>
      </div>
    );
  }

  if (error || !envio) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <div className="text-red-500 mb-4">{error || 'Envío no encontrado'}</div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </button>
      </div>
    );
  }

  // No permitir recibir si el estado no es "enviado"
  if (envio.estado !== 'enviado') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold mr-3">Detalle de Envío #{envio.id.slice(-6)}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(envio.estado)}`}>
              {envio.estado === 'pendiente' ? 'Pendiente' : 
               envio.estado === 'enviado' ? 'Enviado' : 
               envio.estado === 'en_transito' ? 'En tránsito' : 
               envio.estado === 'recibido' ? 'Recibido' : 
               'Con contingencia'}
            </span>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </button>
        </div>

        <div className="bg-yellow-50 p-4 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Este envío no puede ser recibido actualmente
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>
                  {envio.estado === 'pendiente' 
                    ? 'El envío aún no ha sido marcado como enviado por el origen.'
                    : envio.estado === 'recibido' 
                    ? 'Este envío ya ha sido recibido anteriormente.'
                    : envio.estado === 'con_contingencia'
                    ? 'Este envío tiene contingencias pendientes de resolver.'
                    : 'El envío no está en un estado válido para recepción.'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Detalles del envío */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Información del Envío</h3>
          </div>
          <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Origen</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {envio.origen.nombre} ({envio.origen.tipo})
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Destino</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {envio.destino.nombre} ({envio.destino.tipo})
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Estado</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoBadge(envio.estado)}`}>
                    {envio.estado === 'pendiente' ? 'Pendiente' : 
                     envio.estado === 'enviado' ? 'Enviado' : 
                     envio.estado === 'en_transito' ? 'En tránsito' : 
                     envio.estado === 'recibido' ? 'Recibido' : 
                     'Con contingencia'}
                  </span>
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fecha de creación</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(envio.fechaCreacion)}
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500">Fecha de envío</dt>
                <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                  {formatDate(envio.fechaEnvio)}
                </dd>
              </div>
              {envio.fechaRecepcion && (
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Fecha de recepción</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaRecepcion)}
                  </dd>
                </div>
              )}
            </dl>
          </div>
        </div>

        {/* Tabla de insumos */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
              <Package className="h-5 w-5 mr-2 text-gray-500" />
              Insumos
            </h3>
          </div>
          <div className="border-t border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Insumo
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Cantidad enviada
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {envio.items.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {item.insumo.nombre}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.cantidad} {item.insumo.unidadMedida}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold mr-3">Recibir Envío #{envio.id.slice(-6)}</h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(envio.estado)}`}>
          if (envio.estado !== 'enviado' && envio.estado !== 'en_transito') {
             envio.estado === 'enviado' ? 'Enviado' : 
             envio.estado === 'en_transito' ? 'En tránsito' : 
             envio.estado === 'recibido' ? 'Recibido' : 
             envio.estado === 'contingencia' ? 'Con contingencia' : 
             'Estado desconocido'}
          </span>
        </div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Volver
        </button>
      </div>

      {/* Información del envío */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-gray-50">
          <h3 className="text-lg leading-6 font-medium text-gray-900">Información del Envío</h3>
        </div>
        <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
          <dl className="sm:divide-y sm:divide-gray-200">
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Origen</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {envio.origen.nombre} ({envio.origen.tipo})
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Destino</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {envio.destino.nombre} ({envio.destino.tipo})
              </dd>
            </div>
            <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
              <dt className="text-sm font-medium text-gray-500">Fecha de envío</dt>
              <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                {formatDate(envio.fechaEnvio)}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      {/* Formulario de recepción */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        <div className="px-4 py-5 sm:px-6 bg-green-50">
          <h3 className="text-lg leading-6 font-medium text-green-900 flex items-center">
            <Clipboard className="h-5 w-5 mr-2 text-green-600" />
            Formulario de Recepción
          </h3>
          <p className="mt-1 max-w-2xl text-sm text-green-700">
            Verifique las cantidades recibidas y reporte cualquier discrepancia.
          </p>
        </div>
        <div className="border-t border-gray-200 p-4">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-4">
              <h4 className="text-md font-medium text-gray-900">Insumos Recibidos</h4>
              <p className="text-sm text-gray-500">
                Si las cantidades recibidas difieren de las enviadas, se generará automáticamente una contingencia.
              </p>

              <div className="bg-gray-50 p-4 rounded-md">
                {fields.map((field, index) => {
                  const itemEnvioId = field.itemEnvioId;
                  const cantidadRecibida = watch(`items.${index}.cantidadRecibida`);
                  const envioItem = envio.items.find(i => i.id === itemEnvioId);
                  const hayDiferencia = tieneDiferencia(itemEnvioId, cantidadRecibida);

                  return (
                    <div key={field.id} className="flex flex-col md:flex-row gap-4 mb-4 pb-4 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Insumo
                        </label>
                        <div className="flex items-center bg-gray-100 p-2 rounded">
                          <span className="text-sm font-medium">
                            {envioItem?.insumo.nombre}
                          </span>
                        </div>
                      </div>
                      
                      <div className="md:w-1/4">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad enviada
                        </label>
                        <div className="flex items-center bg-gray-100 p-2 rounded">
                          <span className="text-sm font-medium">
                            {envioItem?.cantidad} {envioItem?.insumo.unidadMedida}
                          </span>
                        </div>
                      </div>
                      
                      <div className="md:w-1/4">
                        <label htmlFor={`items.${index}.cantidadRecibida`} className="block text-sm font-medium text-gray-700 mb-1">
                          Cantidad recibida
                        </label>
                        <div className="flex items-center">
                          <input
                            id={`items.${index}.cantidadRecibida`}
                            type="number"
                            min="0"
                            step="0.01"
                            {...register(`items.${index}.cantidadRecibida`, { valueAsNumber: true })}
                            className={`block w-full py-2 px-3 border rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm ${hayDiferencia ? 'border-orange-300 bg-orange-50' : 'border-gray-300'}`}
                          />
                          {envioItem && (
                            <span className="ml-2 text-sm text-gray-500">{envioItem.insumo.unidadMedida}</span>
                          )}
                        </div>
                        {errors.items?.[index]?.cantidadRecibida && (
                          <p className="mt-1 text-sm text-red-600">{errors.items[index]?.cantidadRecibida?.message}</p>
                        )}
                        {hayDiferencia && (
                          <p className="mt-1 text-sm text-orange-600">
                            Diferencia detectada: {cantidadRecibida < (envioItem?.cantidad || 0) ? 'faltante' : 'excedente'}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <label htmlFor="observaciones" className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones (opcional)
              </label>
              <textarea
                id="observaciones"
                rows={3}
                {...register('observaciones')}
                className="block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm"
                placeholder="Indique cualquier novedad observada durante la recepción..."
              ></textarea>
            </div>

            <div className="flex justify-end pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4 mr-2" /> 
                    Procesando...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Confirmar Recepción
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}