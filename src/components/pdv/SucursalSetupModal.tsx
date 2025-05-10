// src/components/pdv/SucursalSetupModal.tsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';

interface SucursalSetupModalProps {
  isOpen: boolean;
  onClose: (sucursalId?: string) => void;
}

export function SucursalSetupModal({ isOpen, onClose }: SucursalSetupModalProps) {
  const [sucursales, setSucursales] = useState<any[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  
  // Obtener el usuario actual
  const { user } = useAuthStore();

  // Cargar sucursales disponibles
  useEffect(() => {
    const loadSucursales = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Cargar sucursales desde la API
        const response = await fetch('/api/admin/ubicaciones');
        
        if (!response.ok) {
          throw new Error('Error al cargar sucursales');
        }
        
        const data = await response.json();
        const sucursalesActivas = data.filter((s: any) => s.activo && s.tipo === 'sucursal');
        
        setSucursales(sucursalesActivas);
        
        // Verificar si el usuario tiene una sucursal asignada
        if (user?.sucursalId) {
          // Buscar la sucursal del usuario en las sucursales cargadas
          const userSucursal = sucursalesActivas.find((s: any) => s.id === user.sucursalId);
          
          if (userSucursal) {
            // Si encontramos la sucursal, guardar su ID y nombre
            localStorage.setItem('sucursalId', user.sucursalId);
            localStorage.setItem('sucursalNombre', userSucursal.nombre);
            
            // Cerrar el modal y pasar el ID de la sucursal
            onClose(user.sucursalId);
            return; // Salir temprano para evitar seleccionar otra sucursal
          }
        }
        
        // Si no hay sucursal asignada o no se encontró, seleccionar la primera por defecto
        if (sucursalesActivas.length > 0) {
          setSelectedSucursalId(sucursalesActivas[0].id);
        }
      } catch (err) {
        console.error('Error al cargar sucursales:', err);
        setError('No se pudieron cargar las sucursales disponibles');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (isOpen) {
      loadSucursales();
    }
  }, [isOpen, user, onClose]);

  // Guardar selección
  const handleSave = () => {
    if (selectedSucursalId) {
      // Guardar en localStorage
      localStorage.setItem('sucursalId', selectedSucursalId);
      
      // Guardar también el nombre para mostrar
      const sucursal = sucursales.find(s => s.id === selectedSucursalId);
      if (sucursal) {
        localStorage.setItem('sucursalNombre', sucursal.nombre);
      }
      
      // Cerrar modal con éxito
      onClose(selectedSucursalId);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">Configuración de Sucursal</h2>
          <button 
            onClick={() => onClose()}
            className="text-gray-500 hover:text-gray-700"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            </div>
          ) : error ? (
            <div className="bg-red-100 text-red-800 p-3 rounded-lg">
              <p>{error}</p>
              <p className="text-sm mt-1">Contacte al administrador del sistema.</p>
            </div>
          ) : sucursales.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-gray-700">No hay sucursales disponibles.</p>
              <p className="text-sm text-gray-500 mt-1">Contacte al administrador para crear una sucursal.</p>
            </div>
          ) : (
            <>
              <p className="mb-4 text-gray-700">
                Seleccione la sucursal para este punto de venta. Esta configuración solo debe realizarse una vez.
              </p>
              
              <div className="mb-6">
                <label htmlFor="sucursal" className="block text-gray-700 mb-1">
                  Sucursal:
                </label>
                <select
                  id="sucursal"
                  value={selectedSucursalId}
                  onChange={(e) => setSelectedSucursalId(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {sucursales.map((sucursal) => (
                    <option key={sucursal.id} value={sucursal.id}>
                      {sucursal.nombre}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end">
                <button
                  onClick={handleSave}
                  disabled={!selectedSucursalId}
                  className="py-2 px-4 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Guardar
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}