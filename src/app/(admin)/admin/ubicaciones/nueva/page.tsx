// src/app/(admin)/admin/ubicaciones/nueva/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Factory, 
  Store, 
  MapPin, 
  Phone, 
  Save, 
  ArrowLeft, 
  AlertCircle 
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import React from 'react';

interface FormData {
  nombre: string;
  tipo: 'fabrica' | 'sucursal' | 'oficina';
  direccion: string;
  telefono: string;
  activo: boolean;
}

export default function NuevaUbicacionPage() {
  const [formData, setFormData] = useState<FormData>({
    nombre: '',
    tipo: 'sucursal',
    direccion: '',
    telefono: '',
    activo: true
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  
  const router = useRouter();
  
  const tiposUbicacion = [
    { value: 'sucursal', label: 'Sucursal', icon: Store, color: 'text-indigo-600' },
    { value: 'fabrica', label: 'Fábrica', icon: Factory, color: 'text-purple-600' },
    { value: 'oficina', label: 'Oficina', icon: Building, color: 'text-green-600' }
  ] as const;
  
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Limpiar errores de validación cuando el usuario empiece a escribir
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };
  
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!formData.nombre.trim()) {
      errors.nombre = 'El nombre es requerido';
    }
    
    if (formData.telefono && !/^[\d\s\-\+\(\)]+$/.test(formData.telefono)) {
      errors.telefono = 'Formato de teléfono inválido';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authenticatedFetch('/api/admin/ubicaciones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear ubicación');
      }
      
      const nuevaUbicacion = await response.json();
      
      // Redirigir a la lista de ubicaciones con mensaje de éxito
      router.push('/admin/ubicaciones?success=created');
    } catch (err) {
      console.error('Error:', err);
      setError(err instanceof Error ? err.message : 'Error al crear ubicación');
    } finally {
      setIsLoading(false);
    }
  };
  
  const getTipoIcon = (tipo: string) => {
    const tipoConfig = tiposUbicacion.find(t => t.value === tipo);
    if (!tipoConfig) return Store;
    return tipoConfig.icon;
  };
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => router.back()}
              className="flex items-center text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-5 w-5 mr-1" />
              Volver
            </button>
            <h1 className="text-3xl font-bold text-[#311716]">Nueva Ubicación</h1>
          </div>
        </div>
        
        {/* Formulario */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Error general */}
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}
            
            {/* Información básica */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de la ubicación *
                </label>
                <input
                  type="text"
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleInputChange('nombre', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] ${
                    validationErrors.nombre ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ej: Tienda Centro, Fábrica Principal..."
                />
                {validationErrors.nombre && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.nombre}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="tipo" className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de ubicación *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {tiposUbicacion.map(tipo => {
                    const IconComponent = tipo.icon;
                    const isSelected = formData.tipo === tipo.value;
                    
                    return (
                      <button
                        key={tipo.value}
                        type="button"
                        onClick={() => handleInputChange('tipo', tipo.value)}
                        className={`p-3 border rounded-md transition-all ${
                          isSelected 
                            ? 'border-[#9c7561] bg-[#fcf3ea] text-[#311716]' 
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <IconComponent className={`h-5 w-5 mx-auto mb-1 ${isSelected ? tipo.color : 'text-gray-500'}`} />
                        <span className="text-xs font-medium">{tipo.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
            
            {/* Información de contacto */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Dirección
                </label>
                <textarea
                  id="direccion"
                  rows={3}
                  value={formData.direccion}
                  onChange={(e) => handleInputChange('direccion', e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561]"
                  placeholder="Dirección completa de la ubicación..."
                />
              </div>
              
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
                  <Phone className="h-4 w-4 inline mr-1" />
                  Teléfono
                </label>
                <input
                  type="tel"
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleInputChange('telefono', e.target.value)}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-[#9c7561] focus:border-[#9c7561] ${
                    validationErrors.telefono ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ej: +52 123 456 7890"
                />
                {validationErrors.telefono && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.telefono}</p>
                )}
              </div>
            </div>
            
            {/* Estado activo */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="activo"
                checked={formData.activo}
                onChange={(e) => handleInputChange('activo', e.target.checked)}
                className="h-4 w-4 text-[#9c7561] focus:ring-[#9c7561] border-gray-300 rounded"
              />
              <label htmlFor="activo" className="ml-2 text-sm text-gray-700">
                Ubicación activa (disponible para operaciones)
              </label>
            </div>
            
            {/* Vista previa */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-2">Vista previa:</h3>
              <div className="flex items-center space-x-3">
                {React.createElement(getTipoIcon(formData.tipo), { 
                  className: `h-5 w-5 ${tiposUbicacion.find(t => t.value === formData.tipo)?.color || 'text-gray-400'}` 
                })}
                <div>
                  <p className="font-medium text-gray-900">
                    {formData.nombre || 'Nombre de la ubicación'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {tiposUbicacion.find(t => t.value === formData.tipo)?.label}
                    {formData.direccion && ` • ${formData.direccion}`}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Botones */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                disabled={isLoading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#311716] hover:bg-[#462625] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Creando...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Crear Ubicación
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