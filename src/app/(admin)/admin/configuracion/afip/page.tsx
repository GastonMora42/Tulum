// src/app/admin/configuracion/afip/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { authenticatedFetch } from '@/hooks/useAuth';
import { AlertCircle, CheckCircle } from 'lucide-react';

export default function ConfiguracionAFIPPage() {
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [configuraciones, setConfiguraciones] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    sucursalId: '',
    cuit: '',
    puntoVenta: ''
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const router = useRouter();
  
  // Cargar datos iniciales
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Cargar sucursales
        const sucResponse = await authenticatedFetch('/api/admin/ubicaciones?tipo=sucursal');
        if (!sucResponse.ok) {
          const errorData = await sucResponse.json();
          throw new Error(errorData.error || 'Error al cargar sucursales');
        }
        const sucData = await sucResponse.json();
        setSucursales(sucData);
        
        // Cargar configuraciones AFIP
        const configResponse = await authenticatedFetch('/api/admin/configuracion/afip');
        if (!configResponse.ok) {
          const errorData = await configResponse.json();
          throw new Error(errorData.error || 'Error al cargar configuraciones AFIP');
        }
        const configData = await configResponse.json();
        setConfiguraciones(configData);
      } catch (error) {
        console.error('Error al cargar datos:', error);
        setError(error instanceof Error ? error.message : 'Error al cargar datos');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Manejar cambios en el formulario
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Manejar envío del formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setError(null);
      setSuccess(null);
      
      // Validar datos
      if (!formData.sucursalId || !formData.cuit || !formData.puntoVenta) {
        setError('Todos los campos son obligatorios');
        return;
      }
      
      // Validar CUIT (11 dígitos)
      if (!/^\d{11}$/.test(formData.cuit)) {
        setError('El CUIT debe tener 11 dígitos');
        return;
      }
      
      const method = editingId ? 'PUT' : 'POST';
      const url = editingId 
        ? `/api/admin/configuracion/afip/${editingId}` 
        : '/api/admin/configuracion/afip';
      
      const response = await authenticatedFetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...formData,
          puntoVenta: parseInt(formData.puntoVenta)
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar configuración');
      }
      
      // Recargar datos
      const configResponse = await authenticatedFetch('/api/admin/configuracion/afip');
      const configData = await configResponse.json();
      setConfiguraciones(configData);
      
      // Resetear formulario
      setFormData({
        sucursalId: '',
        cuit: '',
        puntoVenta: ''
      });
      setEditingId(null);
      
      setSuccess(editingId ? 'Configuración actualizada correctamente' : 'Configuración guardada correctamente');
    } catch (error) {
      console.error('Error:', error);
      setError(error instanceof Error ? error.message : 'Error al guardar configuración');
    }
  };
  
  // Manejar edición de configuración
  const handleEdit = (config: any) => {
    setEditingId(config.id);
    setFormData({
      sucursalId: config.sucursalId,
      cuit: config.cuit,
      puntoVenta: config.puntoVenta.toString()
    });
    
    // Desplazar hacia el formulario
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  // Manejar eliminación de configuración
  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar esta configuración?')) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      const response = await authenticatedFetch(`/api/admin/configuracion/afip/${id}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar configuración');
      }
      
      // Recargar datos
      const configResponse = await authenticatedFetch('/api/admin/configuracion/afip');
      const configData = await configResponse.json();
      setConfiguraciones(configData);
      
      setSuccess('Configuración eliminada correctamente');
    } catch (error) {
      console.error('Error al eliminar:', error);
      setError(error instanceof Error ? error.message : 'Error al eliminar configuración');
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#311716]"></div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6 text-[#311716]">Configuración AFIP</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 text-red-700">
          <div className="flex">
            <AlertCircle className="h-5 w-5 mr-2" />
            <p>{error}</p>
          </div>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-4 text-green-700">
          <div className="flex">
            <CheckCircle className="h-5 w-5 mr-2" />
            <p>{success}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-[#311716]">
          {editingId ? 'Editar Configuración' : 'Nueva Configuración'}
        </h2>
        
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">Sucursal</label>
              <select
                name="sucursalId"
                value={formData.sucursalId}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded p-2"
              >
                <option value="">Seleccionar sucursal</option>
                {sucursales.map(suc => (
                  <option key={suc.id} value={suc.id}>{suc.nombre}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">CUIT</label>
              <input
                type="text"
                name="cuit"
                value={formData.cuit}
                onChange={handleChange}
                placeholder="20123456789"
                className="w-full border border-gray-300 rounded p-2"
              />
              <p className="text-xs text-gray-500 mt-1">Debe tener 11 dígitos sin guiones</p>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Punto de Venta</label>
              <input
                type="number"
                name="puntoVenta"
                value={formData.puntoVenta}
                onChange={handleChange}
                placeholder="1"
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>
          </div>
          
          <div className="flex justify-end mt-6">
            {editingId && (
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    sucursalId: '',
                    cuit: '',
                    puntoVenta: ''
                  });
                }}
                className="px-4 py-2 mr-2 bg-gray-300 rounded text-gray-800"
              >
                Cancelar
              </button>
            )}
            
            <button
              type="submit"
              className="px-4 py-2 bg-[#311716] text-white rounded"
            >
              {editingId ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h2 className="text-xl font-semibold p-4 border-b text-[#311716]">
          Configuraciones Existentes
        </h2>
        
        {configuraciones.length === 0 ? (
          <div className="p-6 text-center text-gray-500">
            No hay configuraciones registradas
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sucursal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CUIT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Punto de Venta</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {configuraciones.map(config => (
                  <tr key={config.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sucursales.find(s => s.id === config.sucursalId)?.nombre || config.sucursalId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.cuit}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {config.puntoVenta}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <button
                        onClick={() => handleEdit(config)}
                        className="text-indigo-600 hover:text-indigo-900 mx-2"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDelete(config.id)}
                        className="text-red-600 hover:text-red-900 mx-2"
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}