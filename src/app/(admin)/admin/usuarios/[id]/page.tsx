// src/app/(admin)/admin/usuarios/[id]/page.tsx - CORREGIDO PARA NEXT.JS 15
'use client';

import { useState, useEffect, use } from 'react'; // ✅ IMPORTAR use de React
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ContrastEnhancer } from '@/components/ui/ContrastEnhancer';
import { HCInput, HCLabel, HCSelect } from '@/components/ui/HighContrastComponents';
import { authenticatedFetch } from '@/hooks/useAuth';

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

// ✅ COMPONENTE PRINCIPAL CON UNWRAP DE PARAMS
export default function EditarUsuarioPage({ params }: { params: Promise<{ id: string }> }) {
  // ✅ USAR React.use() PARA UNWRAP PARAMS
  const resolvedParams = use(params);
  const userId = resolvedParams.id;
  
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<Role[]>([]);
  const [ubicaciones, setUbicaciones] = useState<Ubicacion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ubicacionesError, setUbicacionesError] = useState<string | null>(null);
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
        setError(null);
        
        // ✅ CARGAR USUARIO CON MANEJO DE ERRORES MEJORADO
        try {
          const userResponse = await authenticatedFetch(`/api/admin/users/${userId}`);
          if (!userResponse.ok) {
            if (userResponse.status === 404) {
              throw new Error('Usuario no encontrado');
            }
            throw new Error(`Error al cargar usuario: ${userResponse.status}`);
          }
          const userData = await userResponse.json();
          setUser(userData);
          
          // Establecer valores iniciales en el formulario
          setValue('name', userData.name);
          setValue('roleId', userData.roleId);
          if (userData.sucursalId) {
            setValue('sucursalId', userData.sucursalId);
          }
        } catch (userErr) {
          console.error('Error cargando usuario:', userErr);
          setError(userErr instanceof Error ? userErr.message : 'Error al cargar usuario');
          return; // No continuar si no podemos cargar el usuario
        }
        
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
          return;
        }
        
        // ✅ CARGAR UBICACIONES CON MANEJO MEJORADO DE ERRORES
        try {
          const ubicacionesResponse = await authenticatedFetch('/api/admin/ubicaciones');
          if (!ubicacionesResponse.ok) {
            console.warn(`Error al cargar ubicaciones: ${ubicacionesResponse.status}`);
            setUbicacionesError('No se pudieron cargar las ubicaciones. Las opciones de sucursal no estarán disponibles.');
            setUbicaciones([]);
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
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [userId, setValue]); // ✅ USAR userId EN LUGAR DE params.id
  
  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSaving(true);
      setError(null);
      
      const response = await authenticatedFetch(`/api/admin/users/${userId}`, {
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
          <div className="animate-spin h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto mb-2"></div>
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
          
          {/* ✅ MOSTRAR ADVERTENCIA SOBRE UBICACIONES SI HAY ERROR */}
          {ubicacionesError && (
            <div className="mb-4 p-4 bg-yellow-100 text-yellow-700 rounded-md">
              <p className="font-medium">⚠️ Advertencia:</p>
              <p className="text-sm mt-1">{ubicacionesError}</p>
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
            
            {/* ✅ MOSTRAR SELECCIÓN DE SUCURSAL SOLO SI ES VENDEDOR Y HAY UBICACIONES */}
            {isVendedor && (
              <div>
                <HCLabel htmlFor="sucursalId" className="block text-sm font-medium mb-1">
                  Sucursal
                </HCLabel>
                {ubicaciones.length > 0 ? (
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
                disabled={isSaving}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
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