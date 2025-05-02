// Versión mejorada de src/app/(pdv)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { useOffline } from '@/hooks/useOffline';
import { OfflineStatus } from '@/components/ui/OfflineStatus';
import { 
  ShoppingCart, Tag, Home, Clock, Settings, LogOut, Menu, X,
  Package,
  AlertTriangle,
  Archive
} from 'lucide-react';

export default function PDVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline, pendingOperations, syncNow, isSyncing } = useOffline();
  const { setUser } = useAuthStore();
  const sucursalNombre = typeof localStorage !== 'undefined' ? localStorage.getItem('sucursalNombre') : '';

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

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#311716]"></div>
        <p className="ml-4 text-lg text-gray-700">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header */}
      <header className="bg-[#311716] text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold">Punto de Venta {sucursalNombre && `- ${sucursalNombre}`}</span>
              </div>
              <nav className="hidden md:ml-6 md:flex md:space-x-4">
                <Link 
                  href="/pdv" 
                  className={`${
                    pathname === '/pdv' ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
                >
                  <span className="flex items-center">
                    <ShoppingCart className="mr-2 h-4 w-4" />
                    Venta
                  </span>
                </Link>
                <Link 
                  href="/pdv/cierre" 
                  className={`${
                    pathname.startsWith('/pdv/cierre') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
                >
                  <span className="flex items-center">
                    <Clock className="mr-2 h-4 w-4" />
                    Cierre
                  </span>
                </Link>
                <Link 
                  href="/pdv/ventas" 
                  className={`${
                    pathname.startsWith('/pdv/ventas') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
                >
                  <span className="flex items-center">
                    <Tag className="mr-2 h-4 w-4" />
                    Historial
                  </span>
                </Link>
                <Link 
                  href="/pdv/dashboard" 
                  className={`${
                    pathname.startsWith('/pdv/dashboard') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                  } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
                >
                  <span className="flex items-center">
                    <Home className="mr-2 h-4 w-4" />
                    Dashboard
                  </span>
                </Link>
              </nav>
            </div>
            <div className="hidden md:flex items-center">
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
                  className="bg-[#eeb077] text-[#311716] text-xs px-3 py-1 rounded-full mr-2 hover:bg-[#d9a15d] disabled:opacity-50 transition-colors duration-150"
                >
                  {isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingOperations})`}
                </button>
              )}
              
              <span className="mr-4 font-medium">{user?.name}</span>
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
                className="bg-[#462625] hover:bg-[#9c7561] px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-150"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar sesión
              </button>
            </div>
            <div className="flex items-center md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-[#462625] focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white transition-colors duration-150"
              >
                <span className="sr-only">Abrir menú</span>
                {mobileMenuOpen ? (
                  <X className="block h-6 w-6" aria-hidden="true" />
                ) : (
                  <Menu className="block h-6 w-6" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link 
                href="/pdv" 
                className={`${
                  pathname === '/pdv' ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-150`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center">
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  Venta
                </span>
              </Link>
              <Link 
                href="/pdv/cierre" 
                className={`${
                  pathname.startsWith('/pdv/cierre') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-150`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center">
                  <Clock className="mr-2 h-4 w-4" />
                  Cierre
                </span>
              </Link>
              <Link 
                href="/pdv/ventas" 
                className={`${
                  pathname.startsWith('/pdv/ventas') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-150`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center">
                  <Tag className="mr-2 h-4 w-4" />
                  Historial
                </span>
              </Link>
              <Link 
                href="/pdv/dashboard" 
                className={`${
                  pathname.startsWith('/pdv/dashboard') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
                } block px-3 py-2 rounded-md text-base font-medium transition-colors duration-150`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <span className="flex items-center">
                  <Home className="mr-2 h-4 w-4" />
                  Dashboard
                </span>
              </Link>
              <Link 
    href="/pdv/recepcion" 
    className={`${
      pathname.startsWith('/pdv/recepcion') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
    } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
  >
    <span className="flex items-center">
      <Package className="mr-2 h-4 w-4" />
      Recepción
    </span>
  </Link>
  
  <Link 
    href="/pdv/contingencias" 
    className={`${
      pathname.startsWith('/pdv/contingencias') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
    } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
  >
    <span className="flex items-center">
      <AlertTriangle className="mr-2 h-4 w-4" />
      Contingencias
    </span>
  </Link>
  
  <Link 
    href="/pdv/conciliacion" 
    className={`${
      pathname.startsWith('/pdv/conciliacion') ? 'bg-[#462625] text-white' : 'text-gray-200 hover:bg-[#462625] hover:text-white'
    } px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150`}
  >
    <span className="flex items-center">
      <Archive className="mr-2 h-4 w-4" />
      Inventario
    </span>
  </Link>
              <div className="border-t border-[#462625] pt-2 pb-1">
                <div className="flex items-center justify-between px-3">
                  <span className="text-sm font-medium text-gray-200">{user?.name}</span>
                  <button 
                    onClick={() => {
                      // Logout
                      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                        useAuthStore.getState().clearAuth();
                        router.push('/login');
                      });
                    }}
                    className="bg-[#462625] hover:bg-[#9c7561] px-3 py-2 rounded-md text-sm font-medium flex items-center transition-colors duration-150"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Main content */}
      <main className="flex-grow py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white py-4 shadow-inner">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-gray-600 text-sm">
              Sistema Tulum Punto de Venta &copy; {new Date().getFullYear()}
            </p>
            <div className="flex items-center space-x-2">
              {!isOnline ? (
                <span className="text-yellow-600 text-sm flex items-center bg-yellow-50 px-2 py-1 rounded-full">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Modo Offline
                </span>
              ) : (
                <span className="text-green-600 text-sm flex items-center bg-green-50 px-2 py-1 rounded-full">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Conectado
                </span>
              )}
            </div>
          </div>
        </div>
      </footer>

      {/* Offline status component */}
      <OfflineStatus />
    </div>
  );
}