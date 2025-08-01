// src/app/(admin)/admin/usuarios/nuevo/page.tsx - CORREGIDO
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { authenticatedFetch } from '@/hooks/useAuth';

interface Role {
  id: string;
  name: string;
}

interface Ubicacion {
  id: string;
  nombre: string;
  tipo: string;
}

// Esquema de validación
const userSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres' }),
  email: z.string().email({ message: 'Email inválido' }),
  password: z.string().min(6, { message: 'La contraseña debe tener al menos 6 caracteres' }),
  roleId: z.string().min(1, { message: 'Debes seleccionar un rol' }),
  sucursalId: z.string().optional()
});

type UserFormData = z.infer<typeof userSchema>;

export default function NuevoUsuarioPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ubicacionesError, setUbicacionesError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      roleId: '',
      sucursalId: ''
    }
  });
  
  const selectedRoleId = watch('roleId');
  
  // Cargar roles y ubicaciones
  useEffect(() => {
    const fetchData = async () => {
      try {
        // ✅ CARGAR ROLES CON MANEJO DE ERRORES MEJORADO
        try {
          const rolesResponse = await authenticatedFetch('/api/admin/roles');
          if (!rolesResponse.ok) {
            throw new Error(`Error al cargar roles: ${rolesResponse.status}`);
          }
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);
        } catch (rolesErr) {
          console.error('Error cargando roles:', rolesErr);
          setError('Error al cargar roles. Por favor, recargue la página.');
          return; // No continuar si no podemos cargar roles
        }
        
        // ✅ CARGAR UBICACIONES CON MANEJO MEJORADO DE ERRORES
        try {
          const ubicacionesResponse = await authenticatedFetch('/api/admin/ubicaciones');
          if (!ubicacionesResponse.ok) {
            console.warn(`Error al cargar ubicaciones: ${ubicacionesResponse.status}`);
            setUbicacionesError('No se pudieron cargar las ubicaciones. Las opciones de sucursal no estarán disponibles.');
            setUbicaciones([]); // Continuar sin ubicaciones
          } else {
            const ubicacionesData = await ubicacionesResponse.json();
            setUbicaciones(ubicacionesData);
            setUbicacionesError(null);
          }
        } catch (ubicacionesErr) {
          console.warn('Error cargando ubicaciones:', ubicacionesErr);
          setUbicacionesError('No se pudieron cargar las ubicaciones. Las opciones de sucursal no estarán disponibles.');
          setUbicaciones([]);
        }
      } catch (err) {
        console.error('Error general al cargar datos:', err);
        setError('Error al cargar datos necesarios');
      }
    };
    
    fetchData();
  }, []);
  
  const onSubmit = async (data: UserFormData) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await authenticatedFetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Error al crear usuario');
      }
      
      // Verificar si requiere confirmación
      if (result.requiresConfirmation) {
        // Redirigir a la página de confirmación
        router.push(`/admin/usuarios/confirmar?email=${encodeURIComponent(data.email)}`);
      } else {
        // Redirigir a la lista de usuarios
        router.push('/admin/usuarios');
      }
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al crear usuario');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Determinar si el rol seleccionado es de vendedor
  const isVendedor = selectedRoleId && roles.find(r => r.id === selectedRoleId)?.name === 'vendedor';
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nuevo Usuario</h1>
        <button
          type="button"
          onClick={() => router.back()}
          className="text-indigo-600 hover:text-indigo-900"
        >
          Volver
        </button>
      </div>
      
      <div className="bg-white shadow overflow-hidden sm:rounded-lg p-6">
        {error && (
          <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {/* ✅ MOSTRAR ADVERTENCIA SOBRE UBICACIONES SI HAY ERROR */}
        {ubicacionesError && (
          <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded-md">
            <p className="font-medium">⚠️ Advertencia:</p>
            <p className="text-sm mt-1">{ubicacionesError}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">
              Nombre
            </label>
            <input
              id="name"
              type="text"
              {...register('name')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>
          
          <div>
            <label htmlFor="roleId" className="block text-sm font-medium text-gray-700">
              Rol
            </label>
            <select
              id="roleId"
              {...register('roleId')}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            >
              <option value="">Seleccionar rol</option>
              {roles.map(role => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
            {errors.roleId && (
              <p className="mt-1 text-sm text-red-600">{errors.roleId.message}</p>
            )}
          </div>
          
          {/* ✅ MOSTRAR SELECCIÓN DE SUCURSAL SOLO SI ES VENDEDOR Y HAY UBICACIONES */}
          {isVendedor && (
            <div>
              <label htmlFor="sucursalId" className="block text-sm font-medium text-gray-700">
                Sucursal
              </label>
              {ubicaciones.length > 0 ? (
                <select
                  id="sucursalId"
                  {...register('sucursalId')}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                >
                  <option value="">Seleccionar sucursal</option>
                  {ubicaciones
                    .filter(ubicacion => ubicacion.tipo === 'sucursal')
                    .map(ubicacion => (
                      <option key={ubicacion.id} value={ubicacion.id}>{ubicacion.nombre}</option>
                    ))
                  }
                </select>
              ) : (
                <div className="mt-1 p-2 bg-gray-100 border border-gray-300 rounded-md text-sm text-gray-500">
                  {ubicacionesError ? 'No se pudieron cargar las sucursales' : 'Cargando sucursales...'}
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Creando...' : 'Crear Usuario'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}