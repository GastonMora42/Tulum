// src/app/(fabrica)/fabrica/produccion/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Book, ArrowLeft, ChevronRight, Clock, Calendar, Beaker, ShoppingBag, Check, Package2 } from 'lucide-react';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCTextarea, HCTable, HCTh, HCTd, HCButton } from '@/components/ui/HighContrastComponents';
import { useAuthStore } from '@/stores/authStore';

interface RecetaItem {
  id: string;
  insumoId: string;
  cantidad: number;
  insumo: {
    nombre: string;
    unidadMedida: string;
  };
}

interface Receta {
  id: string;
  nombre: string;
  descripcion: string | null;
  rendimiento: number;
  items: RecetaItem[];
  productoRecetas: Array<{
    id: string;
    productoId: string;
    producto: {
      id: string;
      nombre: string;
      descripcion?: string;
      precio?: number;
      codigoBarras?: string;
      imagen?: string;
    }
  }>;
}

interface Contingencia {
  id: string;
  titulo: string;
  estado: string;
  fechaCreacion: string;
}

interface Produccion {
  id: string;
  recetaId: string;
  cantidad: number;
  fechaInicio: string;
  fechaFin: string | null;
  estado: string;
  observaciones: string | null;
  receta: Receta;
  usuario: {
    name: string;
  };
  contingencias: Contingencia[];
}

export default function DetalleProduccionPage({ params }: { params: { id: string } }) {
  const [produccion, setProduccion] = useState<Produccion | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFinalizando, setIsFinalizando] = useState(false);
  const [cantidadProducida, setCantidadProducida] = useState<number>(0);
  const [observaciones, setObservaciones] = useState<string>('');
  const router = useRouter();
  const { hasPermission } = useAuthStore();

  useEffect(() => {
    const fetchProduccion = async () => {
      try {
        setIsLoading(true);
        
        const response = await authenticatedFetch(`/api/fabrica/produccion/${params.id}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar producción');
        }
        
        const data = await response.json();
        setProduccion(data);
        
        // Inicializar cantidad producida con la cantidad esperada
        setCantidadProducida(data.cantidad * data.receta.rendimiento);
      } catch (err) {
        console.error('Error:', err);
        setError('No se pudo cargar la producción');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduccion();
  }, [params.id]);

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-yellow-100 text-black';
      case 'en_proceso':
        return 'bg-blue-100 text-black';
      case 'finalizada':
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

  const handleFinalizar = async () => {
    if (!produccion) return;
    
    try {
      setIsFinalizando(true);
      
      // Seleccionar el primer producto asociado a la receta (en un caso real deberíamos permitir elegir)
      const productoId = produccion.receta.productoRecetas[0]?.productoId;
      
      if (!productoId) {
        throw new Error('No hay productos asociados a esta receta');
      }
      
      const response = await authenticatedFetch(`/api/fabrica/produccion/${params.id}/finalizar`, {
        method: 'POST',
        body: JSON.stringify({
          productoId,
          ubicacionId: 'ubicacion-fabrica', // En un caso real, esto debería venir del contexto o selección
          cantidadProducida,
          observaciones
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al finalizar producción');
      }
      
      // Refrescar datos
      router.refresh();
      
      // Actualizar estado localmente
      setProduccion(prev => prev ? {...prev, estado: 'finalizada', fechaFin: new Date().toISOString()} : null);
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al finalizar la producción');
    } finally {
      setIsFinalizando(false);
    }
  };

  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </ContrastEnhancer>
    );
  }

  if (error || !produccion) {
    return (
      <ContrastEnhancer>
        <div className="flex flex-col items-center justify-center h-64">
          <div className="text-red-500 mb-4">{error || 'Producción no encontrada'}</div>
          <HCButton
            onClick={() => router.push('/fabrica/produccion')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver al listado
          </HCButton>
        </div>
      </ContrastEnhancer>
    );
  }

  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-black mr-3">Producción #{produccion.id.slice(-6)}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getEstadoBadge(produccion.estado)}`}>
              {produccion.estado === 'pendiente' ? 'Pendiente' : 
               produccion.estado === 'en_proceso' ? 'En proceso' : 
               produccion.estado === 'finalizada' ? 'Finalizada' : 
               'Con contingencia'}
            </span>
          </div>
          <button
            onClick={() => router.push('/fabrica/produccion')}
            className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Volver
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Información general */}
          <div className="md:col-span-2 bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-black">Información de la Producción</h3>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:p-0">
              <dl className="sm:divide-y sm:divide-gray-200">
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Receta</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {produccion.receta.nombre}
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Cantidad</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {produccion.cantidad} lotes
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Rendimiento esperado</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {produccion.cantidad * produccion.receta.rendimiento} unidades
                  </dd>
                </div>
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Fecha de inicio</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {formatDate(produccion.fechaInicio)}
                  </dd>
                </div>
                {produccion.fechaFin && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-black">Fecha de finalización</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                      {formatDate(produccion.fechaFin)}
                    </dd>
                  </div>
                )}
                <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-black">Responsable</dt>
                  <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2">
                    {produccion.usuario.name}
                  </dd>
                </div>
                {produccion.observaciones && (
                  <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                    <dt className="text-sm font-medium text-black">Observaciones</dt>
                    <dd className="mt-1 text-sm text-black sm:mt-0 sm:col-span-2 whitespace-pre-line">
                      {produccion.observaciones}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
          
          {/* Acciones y estado */}
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-black">Estado y Acciones</h3>
            </div>
            <div className="border-t border-gray-200 p-4 space-y-4">
            {produccion.estado === 'en_proceso' && (
              <div className="space-y-4">
                <h4 className="font-medium text-lg text-black">Finalizar producción</h4>
                
                <div className="bg-green-50 p-4 rounded-md mb-4">
                  <p className="text-sm text-black mb-2">
                    <span className="font-medium">Rendimiento esperado:</span> {produccion.cantidad * produccion.receta.rendimiento} unidades
                  </p>
                  <p className="text-sm text-black">
                    <span className="font-medium">Producción iniciada el:</span> {formatDate(produccion.fechaInicio)}
                  </p>
                </div>
                
                <div>
                  <label htmlFor="cantidadProducida" className="block text-sm font-medium text-black mb-1 justify-between">
                    <span>Cantidad producida final</span>
                    <span className="text-black text-xs">
                      Cantidad esperada: {produccion.cantidad * produccion.receta.rendimiento}
                    </span>
                  </label>
                  <HCInput
                    type="number"
                    id="cantidadProducida"
                    name="cantidadProducida"
                    min="1"
                    value={cantidadProducida}
                    onChange={(e) => setCantidadProducida(parseInt(e.target.value) || 0)}
                    className={cantidadProducida !== (produccion.cantidad * produccion.receta.rendimiento) 
                      ? 'border-yellow-300 bg-yellow-50' 
                      : ''}
                  />
                  {cantidadProducida < (produccion.cantidad * produccion.receta.rendimiento) && (
                    <p className="mt-1 text-xs text-yellow-600">
                      La cantidad es menor a la esperada. Se registrará una diferencia.
                    </p>
                  )}
                  {cantidadProducida > (produccion.cantidad * produccion.receta.rendimiento) && (
                    <p className="mt-1 text-xs text-green-600">
                      La cantidad es mayor a la esperada. ¡Excelente rendimiento!
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="observaciones" className="block text-sm font-medium text-black mb-1">
                    Observaciones
                  </label>
                  <HCTextarea
                    id="observaciones"
                    name="observaciones"
                    rows={3}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Observaciones sobre la producción final (opcional)"
                  ></HCTextarea>
                </div>
                
                <HCButton
                  onClick={handleFinalizar}
                  disabled={isFinalizando || cantidadProducida <= 0}
                  className="w-full inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {isFinalizando ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Finalizando...
                    </>
                  ) : (
                    <>
                      Finalizar Producción
                    </>
                  )}
                </HCButton>
              </div>
            )}
              
              {produccion.estado === 'con_contingencia' && (
                <div className="bg-red-50 border-l-4 border-red-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-black">
                        Esta producción tiene contingencias pendientes de resolver.
                      </p>
                      <Link
                        href={`/fabrica/contingencias?produccionId=${produccion.id}`}
                        className="mt-2 inline-flex items-center px-2.5 py-1.5 border border-transparent text-xs font-medium rounded text-red-700 bg-red-100 hover:bg-red-200 focus:outline-none"
                      >
                        Ver Contingencias
                      </Link>
                    </div>
                  </div>
                </div>
              )}
              
              {produccion.estado === 'finalizada' && (
                <div className="bg-green-50 border-l-4 border-green-400 p-4">
                  <div className="flex">
                    <div className="ml-3">
                      <p className="text-sm text-black">
                        Producción finalizada correctamente.
                      </p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Enlace al detalle de la receta */}
              <Link
                href={`/fabrica/recetas/${produccion.recetaId}`}
                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-black bg-white hover:bg-gray-50 w-full justify-center mt-4"
              >
                <Book className="mr-2 h-4 w-4" />
                Ver Receta
              </Link>
              
              {/* Reportar contingencia */}
              {['en_proceso', 'pendiente'].includes(produccion.estado) && hasPermission('contingencia:crear') && (
                <Link
                  href={`/fabrica/contingencias/nueva?produccionId=${produccion.id}`}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-red-700 bg-white hover:bg-red-50 w-full justify-center mt-2"
                >
                  Reportar Contingencia
                </Link>
              )}
            </div>
          </div>
        </div>
        
        {/* Insumos utilizados */}
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6 bg-gray-50">
            <h3 className="text-lg leading-6 font-medium text-black">Insumos Utilizados</h3>
          </div>
          <div className="border-t border-gray-200">
            <HCTable>
              <thead>
                <tr>
                  <HCTh>Insumo</HCTh>
                  <HCTh>Cantidad por Lote</HCTh>
                  <HCTh>Cantidad Total</HCTh>
                  <HCTh>Unidad</HCTh>
                </tr>
              </thead>
              <tbody>
                {produccion.receta.items.map((item) => (
                  <tr key={item.id}>
                    <HCTd>{item.insumo.nombre}</HCTd>
                    <HCTd>{item.cantidad}</HCTd>
                    <HCTd>{item.cantidad * produccion.cantidad}</HCTd>
                    <HCTd>{item.insumo.unidadMedida}</HCTd>
                  </tr>
                ))}
              </tbody>
            </HCTable>
          </div>
        </div>
        
        {/* Contingencias */}
        {produccion.contingencias.length > 0 && (
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:px-6 bg-gray-50">
              <h3 className="text-lg leading-6 font-medium text-black">Contingencias</h3>
            </div>
            <div className="border-t border-gray-200">
              <HCTable>
                <thead>
                  <tr>
                    <HCTh>Título</HCTh>
                    <HCTh>Estado</HCTh>
                    <HCTh>Fecha</HCTh>
                    <HCTh>Acciones</HCTh>
                  </tr>
                </thead>
                <tbody>
                  {produccion.contingencias.map((contingencia) => (
                    <tr key={contingencia.id}>
                      <HCTd>{contingencia.titulo}</HCTd>
                      <HCTd>
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          contingencia.estado === 'pendiente' ? 'bg-yellow-100 text-black' :
                          contingencia.estado === 'en_revision' ? 'bg-blue-100 text-black' :
                          contingencia.estado === 'resuelto' ? 'bg-green-100 text-black' :
                          'bg-red-100 text-black'
                        }`}>
                          {contingencia.estado === 'pendiente' ? 'Pendiente' : 
                           contingencia.estado === 'en_revision' ? 'En revisión' :
                           contingencia.estado === 'resuelto' ? 'Resuelto' :
                           'Rechazado'}
                        </span>
                      </HCTd>
                      <HCTd>{formatDate(contingencia.fechaCreacion)}</HCTd>
                      <HCTd>
                        <Link
                          href={`/fabrica/contingencias/${contingencia.id}`}
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Ver detalles
                        </Link>
                      </HCTd>
                    </tr>
                  ))}
                </tbody>
              </HCTable>
            </div>
          </div>
        )}
      </div>
    </ContrastEnhancer>
  );
}