// src/app/(admin)/admin/descuentos/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { 
  AlertCircle, CheckCircle, Percent, DollarSign, 
  Calendar, Tag, Plus, Edit, Trash, X 
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { format } from 'date-fns';

export default function DescuentosPage() {
  const [codigos, setCodigos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    codigo: '',
    descripcion: '',
    tipoDescuento: 'porcentaje',
    valor: '',
    fechaInicio: '',
    fechaFin: '',
    usoMaximo: '',
    activo: true
  });
  
  // Cargar códigos
  useEffect(() => {
    const loadCodigos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const response = await authenticatedFetch('/api/admin/descuentos');
        
        if (!response.ok) {
          throw new Error('Error al cargar códigos de descuento');
        }
        
        const data = await response.json();
        setCodigos(data);
      } catch (err) {
        console.error('Error:', err);
        setError(err instanceof Error ? err.message : 'Error desconocido');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadCodigos();
  }, []);
  
  // Manejar cambios en el formulario
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  
  // Abrir modal de edición
  const handleEdit = (codigo: any) => {
    setEditingId(codigo.id);
    setFormData({
      codigo: codigo.codigo,
      descripcion: codigo.descripcion || '',
      tipoDescuento: codigo.tipoDescuento,
      valor: codigo.valor.toString(),
      fechaInicio: format(new Date(codigo.fechaInicio), 'yyyy-MM-dd'),
      fechaFin: codigo.fechaFin ? format(new Date(codigo.fechaFin), 'yyyy-MM-dd') : '',
      usoMaximo: codigo.usoMaximo?.toString() || '',
      activo: codigo.activo
    });
    setIsModalOpen(true);
  };
  
  // Abrir modal de nuevo código
  const handleNew = () => {
    setEditingId(null);
    setFormData({
      codigo: '',
      descripcion: '',
      tipoDescuento: 'porcentaje',
      valor: '',
      fechaInicio: format(new Date(), 'yyyy-MM-dd'),
      fechaFin: '',
      usoMaximo: '',
      activo: true
    });
    setIsModalOpen(true);
  };
  
  // Guardar código
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Validaciones básicas
      if (!formData.codigo || !formData.valor || !formData.fechaInicio) {
        setNotification({
          type: 'error',
          message: 'Faltan campos obligatorios'
        });
        return;
      }
      
      const valor = parseFloat(formData.valor);
      if (isNaN(valor) || valor <= 0) {
        setNotification({
          type: 'error',
          message: 'El valor debe ser un número positivo'
        });
        return;
      }
      
      // Preparar datos para envío
      const dataToSend = {
        ...formData,
        valor: parseFloat(formData.valor),
        usoMaximo: formData.usoMaximo ? parseInt(formData.usoMaximo) : null
      };
      
      // Determinar si es creación o edición
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/admin/descuentos/${editingId}`
        : '/api/admin/descuentos';
      
      const response = await authenticatedFetch(url, {
        method,
        body: JSON.stringify(dataToSend)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Error al ${editingId ? 'actualizar' : 'crear'} código de descuento`);
      }
      
      const resultado = await response.json();
      
      // Actualizar lista de códigos
      if (editingId) {
        setCodigos(prev => prev.map(c => c.id === editingId ? resultado : c));
      } else {
        setCodigos(prev => [resultado, ...prev]);
      }
      
      // Mostrar notificación
      setNotification({
        type: 'success',
        message: `Código de descuento ${editingId ? 'actualizado' : 'creado'} correctamente`
      });
      
      // Cerrar modal
      setIsModalOpen(false);
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al procesar código de descuento'
      });
    }
  };
  
  // Eliminar código
  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este código de descuento?')) return;
    
    try {
      const response = await authenticatedFetch(`/api/admin/descuentos/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar código de descuento');
      }
      
      // Actualizar lista
      setCodigos(prev => prev.filter(c => c.id !== id));
      
      // Mostrar notificación
      setNotification({
        type: 'success',
        message: 'Código de descuento eliminado correctamente'
      });
      
      // Ocultar notificación después de 3 segundos
      setTimeout(() => {
        setNotification(null);
      }, 3000);
    } catch (err) {
      console.error('Error:', err);
      setNotification({
        type: 'error',
        message: err instanceof Error ? err.message : 'Error al eliminar código de descuento'
      });
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#311716]">Códigos de Descuento</h1>
        
        <button
          onClick={handleNew}
          className="px-4 py-2 bg-[#311716] text-white rounded-lg hover:bg-[#462625] flex items-center"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nuevo Código
        </button>
      </div>
      
      {/* Notificaciones */}
      {notification && (
        <div className={`p-4 rounded-lg mb-6 ${
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
        <div className="p-4 bg-red-100 border-l-4 border-red-500 text-red-700 mb-6">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {/* Lista de códigos */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center p-8">
            <div className="animate-spin h-8 w-8 border-4 border-[#9c7561] border-t-transparent rounded-full"></div>
            <span className="ml-3 text-gray-700">Cargando...</span>
          </div>
        ) : codigos.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Tag className="mx-auto h-12 w-12 text-gray-300 mb-2" />
            <p>No hay códigos de descuento registrados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descripción</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Valor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vigencia</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usos</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {codigos.map(codigo => (
                  <tr key={codigo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        <Tag className="h-4 w-4 text-gray-400 mr-2" />
                        {codigo.codigo}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {codigo.descripcion || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {codigo.tipoDescuento === 'porcentaje' ? (
                        <span className="flex items-center">
                          <Percent className="h-4 w-4 text-green-500 mr-1" />
                          Porcentaje
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <DollarSign className="h-4 w-4 text-blue-500 mr-1" />
                          Monto Fijo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {codigo.tipoDescuento === 'porcentaje' ? (
                        <span className="text-green-600">{codigo.valor}%</span>
                      ) : (
                        <span className="text-blue-600">${codigo.valor.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-1" />
                        <span>
                          {format(new Date(codigo.fechaInicio), 'dd/MM/yyyy')}
                          {codigo.fechaFin && ` - ${format(new Date(codigo.fechaFin), 'dd/MM/yyyy')}`}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {codigo.usosActuales} {codigo.usoMaximo ? `/ ${codigo.usoMaximo}` : ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {codigo.activo ? (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Activo
                        </span>
                      ) : (
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-red-100 text-red-800">
                          Inactivo
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleEdit(codigo)}
                        className="text-indigo-600 hover:text-indigo-900 mr-3"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(codigo.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Modal para crear/editar código */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Editar Código de Descuento' : 'Nuevo Código de Descuento'}
              </h3>
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
                  <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">
                    Código <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="codigo"
                    name="codigo"
                    required
                    value={formData.codigo}
                    onChange={handleInputChange}
                    disabled={!!editingId}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                    placeholder="DESCUENTO30"
                  />
                </div>
                
                <div>
                  <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
                    Descripción
                  </label>
                  <input
                    type="text"
                    id="descripcion"
                    name="descripcion"
                    value={formData.descripcion}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                    placeholder="Descuento para empleados"
                  />
                </div>
                
                <div>
                  <label htmlFor="tipoDescuento" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Descuento <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="tipoDescuento"
                    name="tipoDescuento"
                    required
                    value={formData.tipoDescuento}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                  >
                    <option value="porcentaje">Porcentaje (%)</option>
                    <option value="monto_fijo">Monto Fijo ($)</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="valor" className="block text-sm font-medium text-gray-700 mb-1">
                    Valor <span className="text-red-500">*</span>
                  </label>
                  <div className="relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      {formData.tipoDescuento === 'porcentaje' ? (
                        <Percent className="h-5 w-5 text-gray-400" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                    <input
                      type="number"
                      id="valor"
                      name="valor"
                      step={formData.tipoDescuento === 'porcentaje' ? "1" : "0.01"}
                      min="0"
                      max={formData.tipoDescuento === 'porcentaje' ? "100" : undefined}
                      required
                      value={formData.valor}
                      onChange={handleInputChange}
                      className="focus:ring-[#9c7561] focus:border-[#9c7561] block w-full pl-10 sm:text-sm border-gray-300 rounded-md"
                      placeholder={formData.tipoDescuento === 'porcentaje' ? "30" : "100.00"}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="fechaInicio" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="fechaInicio"
                      name="fechaInicio"
                      required
                      value={formData.fechaInicio}
                      onChange={handleInputChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="fechaFin" className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha Fin
                    </label>
                    <input
                      type="date"
                      id="fechaFin"
                      name="fechaFin"
                      value={formData.fechaFin}
                      onChange={handleInputChange}
                      className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="usoMaximo" className="block text-sm font-medium text-gray-700 mb-1">
                    Usos Máximos
                  </label>
                  <input
                    type="number"
                    id="usoMaximo"
                    name="usoMaximo"
                    min="1"
                    value={formData.usoMaximo}
                    onChange={handleInputChange}
                    className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] sm:text-sm"
                    placeholder="Ilimitado si se deja vacío"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="activo"
                    name="activo"
                    checked={formData.activo}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-[#311716] focus:ring-[#9c7561] border-gray-300 rounded"
                  />
                  <label htmlFor="activo" className="ml-2 block text-sm text-gray-900">
                    Código activo
                  </label>
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
                  {editingId ? 'Guardar Cambios' : 'Crear Código'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}