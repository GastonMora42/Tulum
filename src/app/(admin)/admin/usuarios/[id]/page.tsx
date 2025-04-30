'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel, HCSelect } from '@/components/ui/HighContrastComponents';

interface User {
  id: string;
  name: string;
  email: string;
  roleId: string;
  sucursalId: string | null;
  role?: {
    id: string;
    name: string;
  };
  sucursal?: {
    id: string;
    nombre: string;
  } | null;
}

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
  roleId: z.string().min(1, { message: 'Debes seleccionar un rol' }),
  sucursalId: z.string().optional()
});

type UserFormData = z.infer<typeof userSchema>;

export default function EditarUsuarioPage({ params }: { params: { id: string } }) {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  
  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      roleId: '',
      sucursalId: ''
    }
  });
  
  const selectedRoleId = watch('roleId');
  
  // Cargar usuario, roles y ubicaciones
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Cargar usuario
        const userResponse = await fetch(`/api/admin/users/${params.id}`);
        if (!userResponse.ok) throw new Error('Error al cargar usuario');
        const userData = await userResponse.json();
        setUser(userData);
        
        // Establecer valores iniciales en el formulario
        setValue('name', userData.name);
        setValue('roleId', userData.roleId);
        if (userData.sucursalId) {
          setValue('sucursalId', userData.sucursalId);
        }
        
        // Cargar roles
        const rolesResponse = await fetch('/api/admin/roles');
        if (!rolesResponse.ok) throw new Error('Error al cargar roles');
        const rolesData = await rolesResponse.json();
        setRoles(rolesData);
        
        // Cargar ubicaciones
        const ubicacionesResponse = await fetch('/api/admin/ubicaciones');
        if (!ubicacionesResponse.ok) throw new Error('Error al cargar ubicaciones');
        const ubicacionesData = await ubicacionesResponse.json();
        setUbicaciones(ubicacionesData);
      } catch (err) {
        console.error('Error al cargar datos:', err);
        setError('Error al cargar datos necesarios');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [params.id, setValue]);
  
  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await fetch(`/api/admin/users/${params.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar usuario');
      }
      
      // Redirigir a la lista de usuarios
      router.push('/admin/usuarios');
      router.refresh();
    } catch (err: any) {
      console.error('Error:', err);
      setError(err.message || 'Error al actualizar usuario');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Determinar si el rol seleccionado es de vendedor
  const isVendedor = selectedRoleId && roles.find(r => r.id === selectedRoleId)?.name === 'vendedor';
  
  if (isLoading) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <p className="text-lg text-black">Cargando...</p>
        </div>
      </ContrastEnhancer>
    );
  }
  
  if (!user && !isLoading) {
    return (
      <ContrastEnhancer>
        <div className="text-center py-10">
          <p className="text-lg text-red-500">Usuario no encontrado</p>
          <button
            onClick={() => router.back()}
            className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Volver
          </button>
        </div>
      </ContrastEnhancer>
    );
  }
  
  return (
    <ContrastEnhancer>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-black">Editar Usuario</h1>
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
          
          <div className="mb-6 p-4 bg-gray-50 rounded-md">
            <p className="text-sm text-black">
              <strong className="text-black">Email:</strong> {user?.email}
            </p>
          </div>
          
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <HCLabel htmlFor="name" className="block text-sm font-medium mb-1">
                Nombre
              </HCLabel>
              <HCInput
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
              <HCLabel htmlFor="roleId" className="block text-sm font-medium mb-1">
                Rol
              </HCLabel>
              <HCSelect
                id="roleId"
                {...register('roleId')}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="">Seleccionar rol</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>{role.name}</option>
                ))}
              </HCSelect>
              {errors.roleId && (
                <p className="mt-1 text-sm text-red-600">{errors.roleId.message}</p>
              )}
            </div>
            
            {/* Mostrar selección de sucursal solo si es vendedor */}
            {isVendedor && (
              <div>
                <HCLabel htmlFor="sucursalId" className="block text-sm font-medium mb-1">
                  Sucursal
                </HCLabel>
                <HCSelect
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
                </HCSelect>
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                {isSaving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ContrastEnhancer>
  );
}