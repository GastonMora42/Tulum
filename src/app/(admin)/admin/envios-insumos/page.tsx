'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { authenticatedFetch } from '@/hooks/useAuth';
import { Package, TruckIcon, Check } from 'lucide-react';

// Interfaces necesarias
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

export default function EnviosInsumosPage() {
  const [envios, setEnvios] = useState<Envio[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
// Dentro del componente
useEffect(() => {
  const fetchEnvios = async () => {
    try {
      setIsLoading(true);
      
      // Log para depuración
      console.log('Obteniendo envíos de insumos...');
      
      const response = await authenticatedFetch('/api/admin/envios-insumos');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al cargar envíos');
      }
      
      const data = await response.json();
      console.log('Envíos recibidos:', data.length);
      setEnvios(data);
    } catch (err: any) {
      console.error('Error completo:', err);
      setError('No se pudieron cargar los envíos');
    } finally {
      setIsLoading(false);
    }
  };

  fetchEnvios();
}, []);
  
const handleEnviar = async (envioId: string) => {
  try {
    if (!confirm('¿Confirmar envío? Esto procesará la solicitud de insumos.')) {
      return;
    }
    
    // Encontrar el envío actual usando el envioId
    const envioActual = envios.find(e => e.id === envioId);
    if (!envioActual) {
      throw new Error('Envío no encontrado');
    }
    
    const response = await authenticatedFetch(`/api/admin/envios-insumos/${envioId}/enviar`, {
      method: 'POST',
      body: JSON.stringify({
        // Usar las cantidades ya definidas en la solicitud original
        // No necesitamos mapear nada más
        items: envioActual.items.map(item => ({ 
          id: item.id, 
          cantidad: item.cantidad 
        }))
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Error al procesar envío');
    }
    
    // Actualizar la lista
    setEnvios(prevEnvios => 
      prevEnvios.map(envio => 
        envio.id === envioId ? { ...envio, estado: 'enviado' } : envio
      )
    );
    
    alert('Envío procesado correctamente');
  } catch (err: any) {
    console.error('Error:', err);
    alert('Error al procesar el envío: ' + err.message);
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
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Envíos de Insumos a Fábrica</h1>
      </div>
      
      {error ? (
        <div className="bg-red-100 p-4 rounded-md text-red-700">{error}</div>
      ) : envios.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">No hay envíos pendientes</h3>
          <p className="mt-1 text-gray-500">No hay solicitudes de insumos pendientes de procesar.</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ID
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Destino
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {envios.map((envio) => (
                <tr key={envio.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {envio.id.substring(envio.id.length - 6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {envio.destino.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      envio.estado === 'pendiente' ? 'bg-yellow-100 text-yellow-800' :
                      envio.estado === 'enviado' ? 'bg-blue-100 text-blue-800' :
                      envio.estado === 'recibido' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {envio.estado.charAt(0).toUpperCase() + envio.estado.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(envio.fechaCreacion)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/admin/envios-insumos/${envio.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Ver detalles
                    </Link>
                    
                    {envio.estado === 'pendiente' && (
                      <button
                        onClick={() => handleEnviar(envio.id)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Procesar envío
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}