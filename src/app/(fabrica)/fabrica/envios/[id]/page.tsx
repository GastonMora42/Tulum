'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { ChevronLeft, Clipboard, Check, AlertTriangle, Loader2, Package, CheckCircle } from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import Link from 'next/link';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCTextarea, HCLabel, HCButton, HCTable, HCTh, HCTd } from '@/components/ui/HighContrastComponents';

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
  // Extraer el ID al inicio del componente para evitar accesos directos a params.id
  const envioId = params.id;
  
  const [envio, setEnvio] = useState<Envio | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
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
        
        // Usar envioId en lugar de params.id
        const response = await authenticatedFetch(`/api/envios/${envioId}`);
        
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
  // Usar envioId en lugar de params.id en las dependencias
  }, [envioId, setValue]);

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
      
      // Enviar datos al servidor - usar envioId en lugar de params.id
      const response = await authenticatedFetch(`/api/fabrica/envios/${envioId}/recibir`, {
        method: 'POST',
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al recibir el envío');
      }
      
      const resultado = await response.json();
      
      // Mostrar mensaje de éxito
      setSuccess('Envío recibido correctamente. El stock ha sido actualizado.');
      
      // Redireccionar después de un breve retraso
      setTimeout(() => {
        if (resultado.hayDiscrepancias) {
          router.push('/fabrica/contingencias');
        } else {
          router.push('/fabrica/envios');
        }
        router.refresh();
      }, 2000);
      
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
        return 'bg-yellow-100 text-black';
      case 'enviado':
        return 'bg-blue-100 text-black';
      case 'en_transito':
        return 'bg-indigo-100 text-black';
      case 'recibido':
        return 'bg-green-100 text-black';
      case 'con_contingencia':
        return 'bg-red-100 text-black';
      default:
        return 'bg-gray-100 text-black';
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
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-green-500" />
          <span className="ml-2 text-black">Cargando envío...</span>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error || !envio) {
    return (
      <ContrastEnhancer>
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
      </ContrastEnhancer>
    );
  }

  // Mostrar mensaje de éxito
  if (success) {
    return (
      <ContrastEnhancer>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="bg-green-100 text-green-800 p-4 rounded-lg mb-4 flex items-center">
            <CheckCircle className="h-6 w-6 mr-2" />
            {success}
          </div>
          <p className="text-black mb-4">Redirigiendo...</p>
          <div className="animate-spin h-8 w-8 border-4 border-green-500 border-t-transparent rounded-full"></div>
        </div>
      </ContrastEnhancer>
    );
  }

  // No permitir recibir si el estado no es "enviado"
  if (envio.estado !== 'enviado') {
    return (
      <ContrastEnhancer>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-black mr-3">Detalle de Envío #{envio.id.slice(-6)}</h1>
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
              className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
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
                <h3 className="text-sm font-medium text-black">
                  Este envío no puede ser recibido actualmente
                </h3>
                <div className="mt-2 text-sm text-black">
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
              <h3 className="text-lg leading-6 font-medium text-black">Información del Envío</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Origen</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {envio.origen.nombre} ({envio.origen.tipo})
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Destino</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {envio.destino.nombre} ({envio.destino.tipo})
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Estado</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
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
                  <dt className="text-sm font-medium text-black">Fecha de creación</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaCreacion)}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Fecha de envío</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(envio.fechaEnvio)}
                  </dd>
                </div>
                {envio.fechaRecepcion && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-black">Fecha de recepción</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
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
              <h3 className="text-lg leading-6 font-medium text-black flex items-center">
                <Package className="h-5 w-5 mr-2 text-gray-500" />
                Insumos
              </h3>
            </div>
            <div className="border-t border-gray-200">
              <HCTable>
                <thead>
                  <tr>
                    <HCTh>Insumo</HCTh>
                    <HCTh>Cantidad enviada</HCTh>
                  </tr>
                </thead>
                <tbody>
                  {envio.items.map(item => (
                    <tr key={item.id}>
                      <HCTd>{item.insumo.nombre}</HCTd>
                      <HCTd>{item.cantidad} {item.insumo.unidadMedida}</HCTd>
                    </tr>
                  ))}
                </tbody>
              </HCTable>
            </div>
          </div>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-black mr-3">Recibir Envío #{envio.id.slice(-6)}</h1>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(envio.estado)}`}>
              {envio.estado === 'enviado' ? 'Enviado' : 'En tránsito'}
            </span>
          </div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Volver
          </button>
        </div>

        {/* Información del envío - Panel mejorado */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-blue-100">
          <div className="px-4 py-5 sm:px-6 bg-blue-50">
            <h3 className="text-lg leading-6 font-medium text-black">Información del Envío</h3>
          </div>
          <div className="border-t border-blue-100 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black">Origen</dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  <span className="font-medium">{envio.origen.nombre}</span> ({envio.origen.tipo})
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black">Destino</dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  <span className="font-medium">{envio.destino.nombre}</span> ({envio.destino.tipo})
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-black">Fecha de envío</dt>
                <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                  {formatDate(envio.fechaEnvio)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {/* Formulario de recepción - Mejorado */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden border-2 border-green-100">
          <div className="px-4 py-5 sm:px-6 bg-green-50">
            <h3 className="text-lg leading-6 font-medium text-black flex items-center">
              <Clipboard className="h-5 w-5 mr-2 text-green-600" />
              Formulario de Recepción
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-black">
              Verifique las cantidades recibidas y reporte cualquier discrepancia.
            </p>
          </div>
          <div className="border-t border-green-100 p-6">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-md flex items-start">
                <AlertTriangle className="h-5 w-5 mr-2 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-6">
                <h4 className="text-md font-medium text-black border-b pb-2">Insumos Recibidos</h4>
                <p className="text-sm text-black mb-4">
                  Si las cantidades recibidas difieren de las enviadas, se generará automáticamente una contingencia.
                </p>

                <div className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  {fields.map((field, index) => {
                    const itemEnvioId = field.itemEnvioId;
                    const cantidadRecibida = watch(`items.${index}.cantidadRecibida`);
                    const envioItem = envio.items.find(i => i.id === itemEnvioId);
                    const hayDiferencia = tieneDiferencia(itemEnvioId, cantidadRecibida);

                    return (
                      <div key={field.id} className={`flex flex-col md:flex-row gap-4 mb-6 pb-6 border-b border-gray-200 last:border-0 last:mb-0 last:pb-0 ${hayDiferencia ? 'bg-yellow-50 p-4 rounded-lg' : ''}`}>
                        <div className="flex-1">
                          <HCLabel htmlFor={`items.${index}.insumo`}>Insumo</HCLabel>
                          <div className="flex items-center bg-white p-3 rounded border border-gray-300">
                            <span className="text-sm font-medium text-black">
                              {envioItem?.insumo.nombre}
                            </span>
                          </div>
                        </div>
                        
                        <div className="md:w-1/4">
                          <HCLabel>Cantidad enviada</HCLabel>
                          <div className="flex items-center bg-white p-3 rounded border border-gray-300">
                            <span className="text-sm font-medium text-black">
                              {envioItem?.cantidad} {envioItem?.insumo.unidadMedida}
                            </span>
                          </div>
                        </div>
                        
                        <div className="md:w-1/4">
                          <HCLabel htmlFor={`items.${index}.cantidadRecibida`}>Cantidad recibida</HCLabel>
                          <div className="flex items-center">
                            <HCInput
                              id={`items.${index}.cantidadRecibida`}
                              type="number"
                              min="0"
                              step="0.01"
                              {...register(`items.${index}.cantidadRecibida`, { valueAsNumber: true })}
                              className={hayDiferencia ? 'border-orange-300 bg-orange-50' : ''}
                            />
                            {envioItem && (
                              <span className="ml-2 text-sm text-black">{envioItem.insumo.unidadMedida}</span>
                            )}
                          </div>
                          {errors.items?.[index]?.cantidadRecibida && (
                            <p className="mt-1 text-sm text-red-600">{errors.items[index]?.cantidadRecibida?.message}</p>
                          )}
                          {hayDiferencia && (
                            <p className="mt-1 text-sm text-orange-600 flex items-center">
                              <AlertTriangle className="h-4 w-4 mr-1" />
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
                <HCLabel htmlFor="observaciones">Observaciones (opcional)</HCLabel>
                <HCTextarea
                  id="observaciones"
                  rows={3}
                  {...register('observaciones')}
                  placeholder="Indique cualquier novedad observada durante la recepción..."
                />
              </div>

              <div className="flex justify-end pt-4">
                <HCButton
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin h-5 w-5 mr-2" /> 
                      Procesando...
                    </>
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Confirmar Recepción
                    </>
                  )}
                </HCButton>
              </div>
            </form>
          </div>
        </div>
      </div>
    </ContrastEnhancer>
  );
}