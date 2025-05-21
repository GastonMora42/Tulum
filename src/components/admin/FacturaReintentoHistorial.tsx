// src/components/admin/FacturaReintentoHistorial.tsx
import { useEffect, useState } from 'react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, User, File, Calendar, X } from 'lucide-react';

interface FacturaReintentoHistorialProps {
  facturaId: string;
  onClose: () => void;
}

export function FacturaReintentoHistorial({ facturaId, onClose }: FacturaReintentoHistorialProps) {
  const [reintentos, setReintentos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchReintentos = async () => {
      try {
        setLoading(true);
        const response = await authenticatedFetch(`/api/admin/facturas/reintentos/${facturaId}`);
        
        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Error al cargar historial de reintentos');
        }
        
        const data = await response.json();
        setReintentos(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setLoading(false);
      }
    };
    
    fetchReintentos();
  }, [facturaId]);
  
  const getIconByResultado = (resultado: string) => {
    switch (resultado) {
      case 'exitoso':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'fallido':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case 'iniciado':
        return <Clock className="h-5 w-5 text-amber-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-gray-500" />;
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-lg font-semibold text-gray-900">Historial de Reintentos - Factura</h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
              <span className="ml-2 text-gray-600">Cargando historial...</span>
            </div>
          ) : error ? (
            <div className="bg-red-50 p-4 rounded-md border border-red-200 text-red-700">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 mr-2" />
                <p>{error}</p>
              </div>
            </div>
          ) : reintentos.length === 0 ? (
            <div className="text-center p-6 text-gray-500">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay historial de reintentos para esta factura</p>
            </div>
          ) : (
            <div className="space-y-6">
              {reintentos.map((reintento) => (
                <div key={reintento.id} className="bg-gray-50 rounded-lg border p-4">
                  <div className="flex items-center mb-3">
                    {getIconByResultado(reintento.resultado)}
                    <h4 className="ml-2 font-medium">
                      Reintento {reintento.resultado === 'exitoso' ? 'Exitoso' : 
                               reintento.resultado === 'fallido' ? 'Fallido' : 'En Progreso'}
                    </h4>
                    <span className="ml-auto text-sm text-gray-500">
                      {format(new Date(reintento.iniciadoEn), 'dd/MM/yyyy HH:mm:ss')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div className="flex items-start">
                      <User className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Solicitado por</p>
                        <p className="text-sm text-gray-600">{reintento.usuario.name}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <File className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Estado anterior</p>
                        <p className="text-sm text-gray-600">{reintento.estadoAnterior}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-start">
                      <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium">Iniciado</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(reintento.iniciadoEn), 'dd/MM/yyyy HH:mm:ss')}
                        </p>
                      </div>
                    </div>
                    
                    {reintento.completadoEn && (
                      <div className="flex items-start">
                        <Calendar className="h-4 w-4 mt-0.5 mr-2 text-gray-500" />
                        <div>
                          <p className="text-sm font-medium">Completado</p>
                          <p className="text-sm text-gray-600">
                            {format(new Date(reintento.completadoEn), 'dd/MM/yyyy HH:mm:ss')}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-3">
                    <p className="text-sm font-medium mb-1">Motivo</p>
                    <p className="text-sm text-gray-600">{reintento.motivo || 'No especificado'}</p>
                  </div>
                  
                  {reintento.cae && (
                    <div className="mt-3 p-3 bg-green-50 rounded-md border border-green-200">
                      <p className="text-sm font-medium mb-1">CAE obtenido</p>
                      <p className="text-sm font-mono">{reintento.cae}</p>
                    </div>
                  )}
                  
                  {reintento.error && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1 text-red-600">Error</p>
                      <div className="bg-red-50 p-3 rounded-md border border-red-200 overflow-auto max-h-32">
                        <pre className="text-xs text-red-800 whitespace-pre-wrap">{reintento.error}</pre>
                      </div>
                    </div>
                  )}
                  
                  {reintento.logs && (
                    <div className="mt-3">
                      <p className="text-sm font-medium mb-1">Logs detallados</p>
                      <div className="bg-gray-100 p-3 rounded-md border border-gray-200 overflow-auto max-h-48">
                        <pre className="text-xs font-mono whitespace-pre-wrap">{reintento.logs}</pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="p-6 border-t">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}