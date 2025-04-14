// src/app/(pdv)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { useOffline } from '@/hooks/useOffline';
import { OfflineStatus } from '@/components/ui/OfflineStatus';

export default function PDVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline, pendingOperations, syncNow, isSyncing } = useOffline();
  
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
              setUser(data.user);
            }
          } catch (error) {
            console.error('Error al obtener usuario:', error);
            router.push('/login');
            return;
          }
        }
        
        // Si el usuario no tiene rol vendedor o admin, redirigir
        if (user && !hasRole('vendedor') && !hasRole('admin')) {
          console.log('Usuario no tiene permisos para PDV, redirigiendo...');
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

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Error al sincronizar:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-blue-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">PDV Aromaterapia</span>
              </div>
              <nav className="ml-6 flex space-x-4">
                <Link 
                  href="/pdv" 
                  className={`${
                    pathname === '/pdv' ? 'bg-blue-700' : 'hover:bg-blue-500'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Venta
                </Link>
                <Link 
                  href="/pdv/cierre" 
                  className={`${
                    pathname.startsWith('/pdv/cierre') ? 'bg-blue-700' : 'hover:bg-blue-500'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Cierre de Caja
                </Link>
                <Link 
                  href="/pdv/ventas" 
                  className={`${
                    pathname.startsWith('/pdv/ventas') ? 'bg-blue-700' : 'hover:bg-blue-500'
                  } px-3 py-2 rounded-md text-sm font-medium`}
                >
                  Historial
                </Link>
                
              </nav>
            </div>
            <div className="flex items-center">
              {!isOnline ? (
                <span className="text-yellow-300 text-sm mr-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Offline
                </span>
              ) : (
                <span className="text-green-300 text-sm mr-2 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Online
                </span>
              )}
              
              {pendingOperations > 0 && (
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className="bg-yellow-500 text-white text-xs px-2 py-1 rounded mr-2 hover:bg-yellow-600 disabled:opacity-50"
                >
                  {isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingOperations})`}
                </button>
              )}
              
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
                className="bg-blue-700 hover:bg-blue-800 px-3 py-2 rounded-md text-sm font-medium"
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
        </div>
      </main>

      <footer className="bg-gray-100 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-gray-500 text-sm">
            Sistema de Aromaterapia &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
      <OfflineStatus />
    </div>
  );
}