'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  email: string;
  name: string;
  roleId: string;
  role: {
    id: string;
    name: string;
  };
  sucursalId: string | null;
  sucursal?: {
    id: string;
    nombre: string;
  } | null;
}

export default function UsuariosPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmingUserId, setConfirmingUserId] = useState<string | null>(null);
  const [confirmSuccess, setConfirmSuccess] = useState<string | null>(null);
  const router = useRouter();

  const fetchUsers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/users');
      
      if (!response.ok) {
        throw new Error('Error al cargar usuarios');
      }
      
      const data = await response.json();
      setUsers(data);
    } catch (err) {
      console.error('Error:', err);
      setError('No se pudieron cargar los usuarios');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleConfirmUser = async (email: string) => {
    try {
      setConfirmingUserId(email);
      setError(null);
      setConfirmSuccess(null);
      
      const response = await fetch('/api/admin/users/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al confirmar usuario');
      }
      
      setConfirmSuccess(`Usuario ${email} confirmado correctamente`);
      
      // Opcionalmente recargar usuarios para reflejar cambios
      fetchUsers();
    } catch (err: any) {
      console.error('Error al confirmar usuario:', err);
      setError(err.message || 'Error al confirmar usuario');
    } finally {
      setConfirmingUserId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Gestión de Usuarios</h1>
        <Link 
          href="/admin/usuarios/nuevo"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Nuevo Usuario
        </Link>
      </div>

      {confirmSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative">
          {confirmSuccess}
          <button 
            className="absolute top-0 bottom-0 right-0 px-4"
            onClick={() => setConfirmSuccess(null)}
          >
            ×
          </button>
        </div>
      )}

      {/* Tabla de usuarios */}
      <div className="bg-white shadow overflow-hidden sm:rounded-lg">
        {isLoading ? (
          <div className="text-center py-10">
            <p className="text-lg">Cargando usuarios...</p>
          </div>
        ) : error ? (
          <div className="text-center py-10">
            <p className="text-red-500">{error}</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Nombre
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Email
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Rol
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Sucursal
                </th>
                <th
                  scope="col"
                  className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.role?.name || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{user.sucursal?.nombre || '-'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <Link 
                      href={`/admin/usuarios/${user.id}`}
                      className="text-indigo-600 hover:text-indigo-900 mr-4"
                    >
                      Editar
                    </Link>
                    <button
                      onClick={() => handleConfirmUser(user.email)}
                      disabled={confirmingUserId === user.email}
                      className="text-green-600 hover:text-green-900"
                    >
                      {confirmingUserId === user.email ? 'Confirmando...' : 'Confirmar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}