// src/app/(admin)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { OfflineStatus } from '@/components/ui/OfflineStatus';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  
  // Usar setUser del store directamente, no definir nuestra propia función
  const { setUser } = useAuthStore();

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // Verificar si hay token
        const token = localStorage.getItem('accessToken');
        if (!token) {
          console.log('No hay token, redireccionando a login');
          router.push('/login');
          return;
        }
        
        // Si no hay usuario en el store, intentar obtenerlo
        if (!user) {
          try {
            const response = await fetch('/api/auth/me', {
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
            
            if (!response.ok) {
              throw new Error('Error al obtener información del usuario');
            }
            
            const data = await response.json();
            
            if (data.user) {
              // Usar el setUser del store
              setUser(data.user);
            }
          } catch (error) {
            console.error('Error al obtener usuario:', error);
            router.push('/login');
            return;
          }
        }
        
        // Si el usuario no tiene rol admin, redirigir
        if (user && user.roleId !== 'role-admin' && !hasRole('admin')) {
          console.log('Usuario no es admin, redirigiendo...');
          router.push('/');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error en verificación de autenticación:', error);
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, user, hasRole, setUser]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }


  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">Sistema de Aromaterapia</span>
              </div>
<nav className="ml-6 flex space-x-4">
  <Link 
    href="/admin" 
    className={`${
      pathname === '/admin' ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Dashboard
  </Link>
  <Link 
    href="/admin/productos" 
    className={`${
      pathname.startsWith('/admin/productos') ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Productos
  </Link>
  <Link 
    href="/admin/usuarios" 
    className={`${
      pathname.startsWith('/admin/usuarios') ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Usuarios
  </Link>
  <Link 
    href="/admin/stock" 
    className={`${
      pathname.startsWith('/admin/stock') ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Stock
  </Link>
  <Link 
    href="/admin/contingencias" 
    className={`${
      pathname.startsWith('/admin/contingencias') ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Contingencias
  </Link>
  <Link 
    href="/admin/reportes" 
    className={`${
      pathname.startsWith('/admin/reportes') ? 'bg-indigo-700' : 'hover:bg-indigo-500'
    } px-3 py-2 rounded-md text-sm font-medium`}
  >
    Reportes
  </Link>
</nav>
            </div>
            <div className="flex items-center">
              <span className="mr-4">{user?.name}</span>
              <button 
                onClick={() => {
                  // Logout
                  fetch('/api/auth/logout', {
                    method: 'POST',
                  }).then(() => {
                    // Limpiar store
                    useAuthStore.getState().clearAuth();
                    router.push('/login');
                  });
                }}
                className="bg-indigo-700 hover:bg-indigo-800 px-3 py-2 rounded-md text-sm font-medium"
              >
                Cerrar sesión
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
          <OfflineStatus />
        </div>
      </main>

      <footer className="bg-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Sistema de Aromaterapia &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}

function setUser(user: any) {
    throw new Error('Function not implemented.');
}
