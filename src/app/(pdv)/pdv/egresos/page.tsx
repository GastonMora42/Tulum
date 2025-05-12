// src/app/(pdv)/pdv/egresos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { 
  AlertCircle, CheckCircle, Download, DollarSign, 
  ArrowDownLeft, Clock, User, FileText, X 
} from 'lucide-react';
import { format } from 'date-fns';

const MOTIVOS_EGRESO = [
  { id: 'adelanto_sueldo', nombre: 'Adelanto de sueldo' },
  { id: 'compra_insumos', nombre: 'Compra de insumos' },
  { id: 'libreria', nombre: 'Librería/Papelería' },
  { id: 'paqueteria', nombre: 'Paquetería/Envíos' },
  { id: 'servicios', nombre: 'Servicios (luz, agua, etc.)' },
  { id: 'otros', nombre: 'Otros gastos' }
];

export default function EgresosPage() {
  const [egresos, setEgresos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    monto: '',
    motivo: 'otros',
    detalles: ''
  });
  
  const router = useRouter();
  
  // Cargar egresos
  useEffect(() => {
    const loadEgresos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const sucursalId = localStorage.getItem('sucursalId');
        if (!sucursalId) {
          setError('No se ha configurado una sucursal para este punto de venta');
          return;
        }
        
        const response = await authenticatedFetch(`/api/pdv/egresos?sucursalId=${sucursalId}`);
        
        if (!response.ok) {
          throw new Error('Error al cargar egresos');
        }
        
        const data = await response.json();
        setEgresos(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadEgresos();
  }, []);
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Registrar nuevo egreso
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const sucursalId = localStorage.getItem('sucursalId');
      if (!sucursalId) {
        setNotification({
          type: 'error',
          message: 'No se ha configurado una sucursal'
        });
        return;
      }
      
      // Validar monto
      const monto = parseFloat(formData.monto);
      if (isNaN(monto) || monto <= 0) {
        setNotification({
          type: 'error',
          message: 'Debe ingresar un monto válido mayor a cero'
        });
        return;
      }
      
      // Enviar datos
      const response = await authenticatedFetch('/api/pdv/egresos', {
        method: 'POST',
        body: JSON.stringify({
          sucursalId,
          monto,
          motivo: formData.motivo,
          detalles: formData.detalles
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al registrar egreso');
      }
      
      // Obtener egreso registrado
      const newEgreso = await response.json();
      
      // Actualizar lista de egresos
      setEgresos(prev => [newEgreso, ...prev]);
      
      // Mostrar notificación
      setNotification({
        type: 'success',
        message: 'Egreso registrado correctamente'
      });
      
      // Limpiar formulario y cerrar modal
      setFormData({
        monto: '',
        motivo: 'otros',
        detalles: ''
      });
      setIsModalOpen(false);
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al registrar egreso'
      });
    }
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#311716]">Salidas de Dinero</h1>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] flex items-center"
        >
          <ArrowDownLeft className="mr-2 h-4 w-4" />
          Registrar Salida
        </button>
      </div>
      
      {/* Notificaciones */}
      {notification && (
        <div className={`p-4 rounded-lg ${
          notification.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          <div className="flex items-center">
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 mr-2" />
            ) : (
              <AlertCircle className="h-5 w-5 mr-2" />
            )}
            <p>{notification.message}</p>
            <button 
              onClick={() => setNotification(null)}
              className="ml-auto text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      
      {error && (
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Lista de egresos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h2 className="text-lg font-semibold text-gray-900">Registro de Salidas</h2>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#9c7561] border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-700">Cargando...</span>
          </div>
        ) : egresos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <ArrowDownLeft className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No hay salidas de dinero registradas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Detalles</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Monto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {egresos.map(egreso => (
                  <tr key={egreso.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <Clock className="h-4 w-4 text-gray-400 mr-2" />
                        {format(new Date(egreso.fecha), 'dd/MM/yyyy HH:mm')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {MOTIVOS_EGRESO.find(m => m.id === egreso.motivo)?.nombre || egreso.motivo}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {egreso.detalles || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-red-600">
                      -${egreso.monto.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        {egreso.usuario?.name || 'Usuario desconocido'}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal para registrar egreso */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Registrar Salida de Dinero</h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="monto" className="block text-sm font-medium text-gray-700 mb-1">
                    Monto <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <DollarSign className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      name="monto"
                      id="monto"
                      step="0.01"
                      min="0.01"
                      required
                      value={formData.monto}
                      onChange={handleInputChange}
                      className="focus:ring-[#9c7561] focus:border-[#9c7561] block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                      placeholder="0.00"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="motivo" className="block text-sm font-medium text-gray-700 mb-1">
                    Motivo <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="motivo"
                    name="motivo"
                    required
                    value={formData.motivo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                  >
                    {MOTIVOS_EGRESO.map(motivo => (
                      <option key={motivo.id} value={motivo.id}>{motivo.nombre}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label htmlFor="detalles" className="block text-sm font-medium text-gray-700 mb-1">
                    Detalles
                  </label>
                  <textarea
                    id="detalles"
                    name="detalles"
                    rows={3}
                    value={formData.detalles}
                    onChange={handleInputChange}
                    className="shadow-sm focus:ring-[#9c7561] focus:border-[#9c7561] mt-1 block w-full sm:text-sm border border-gray-300 rounded-md"
                    placeholder="Describa el motivo de la salida de dinero"
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="mr-3 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#311716] hover:bg-[#462625]"
                >
                  Registrar Salida
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}