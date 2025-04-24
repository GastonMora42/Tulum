import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { useOffline } from '@/hooks/useOffline';
import { OfflineStatus } from '@/components/ui/OfflineStatus';
import {
  HomeIcon,
  ShoppingCart,
  CreditCard,
  ClipboardList,
  AlertTriangle,
  LogOut,
  ChevronDown,
  Menu,
  X,
  WifiOff,
  Wifi,
  RefreshCw
} from 'lucide-react';

export default function PDVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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

  const handleLogout = () => {
    // Logout
    fetch('/api/auth/logout', {
      method: 'POST',
    }).then(() => {
      // Limpiar store
      useAuthStore.getState().clearAuth();
      router.push('/login');
    });
  };

  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Error al sincronizar:', error);
    }
  };

  const navItems = [
    { href: '/pdv', label: 'Punto de Venta', icon: <ShoppingCart className="w-5 h-5" /> },
    { href: '/pdv/cierre', label: 'Cierre de Caja', icon: <CreditCard className="w-5 h-5" /> },
    { href: '/pdv/ventas', label: 'Historial', icon: <ClipboardList className="w-5 h-5" /> },
    { href: '/pdv/contingencias', label: 'Contingencias', icon: <AlertTriangle className="w-5 h-5" /> },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-gray-700">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="bg-white shadow border-b border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center">
              <div className="flex-shrink-0 flex items-center">
                <img className="h-10 w-auto" src="/logo-tulum.webp" alt="Tulum Aromaterapia" />
              </div>
              <div className="hidden md:ml-6 md:flex md:space-x-6">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`
                    relative inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200
                    ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'border-blue-600 text-blue-800' 
                      : 'border-transparent text-gray-600 hover:text-blue-700 hover:border-blue-300'
                    }
                    `}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-4">
              {/* Estado de conexión */}
              <div className={`px-3 py-1 rounded-full text-sm flex items-center ${
                isOnline 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 mr-1" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 mr-1" />
                    <span>Offline</span>
                  </>
                )}
              </div>
              
              {/* Operaciones pendientes */}
              {pendingOperations > 0 && (
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className={`px-3 py-1 rounded-full text-sm flex items-center ${
                    isSyncing 
                      ? 'bg-gray-100 text-gray-500 cursor-not-allowed' 
                      : 'bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer'
                  }`}
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingOperations})`}</span>
                </button>
              )}
              
              {/* Usuario y logout */}
              <div className="flex-shrink-0 relative group">
                <button className="bg-white p-2 rounded-md text-gray-600 hover:text-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center transition-colors duration-200">
                  <span className="mr-2 font-medium text-gray-700">{user?.name}</span>
                  <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-blue-600 transition-colors duration-220" />
                </button>
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block">
                  <button
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-blue-700 transition-colors duration-200"
                  >
                    Cerrar sesión
                  </button>
                </div>
              </div>
            </div>
            <div className="-mr-2 flex items-center md:hidden">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
              >
                <span className="sr-only">Abrir menú</span>
                {isMobileMenuOpen ? (
                  <X className="block h-6 w-6" />
                ) : (
                  <Menu className="block h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu, show/hide based on menu state */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="pt-2 pb-3 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${
                    pathname === item.href || pathname.startsWith(item.href + '/')
                    ? 'bg-blue-50 border-blue-600 text-blue-700'
                    : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-blue-700'
                  } block pl-5 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <div className="flex items-center">
                    {item.icon}
                    <span className="ml-3">{item.label}</span>
                  </div>
                </Link>
              ))}
            </div>
            <div className="pt-4 pb-3 border-t border-gray-200">
              <div className="flex items-center px-4">
                <div className="ml-3">
                  <div className="text-base font-medium text-gray-800">{user?.name}</div>
                  <div className="text-sm font-medium text-gray-500">{user?.email}</div>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {/* Status de conexión en móvil */}
                <div className={`flex items-center px-4 py-2 text-sm ${
                  isOnline ? 'text-green-700' : 'text-red-700'
                }`}>
                  {isOnline ? (
                    <>
                      <Wifi className="w-5 h-5 mr-3" />
                      <span>Conectado</span>
                    </>
                  ) : (
                    <>
                      <WifiOff className="w-5 h-5 mr-3" />
                      <span>Sin conexión</span>
                    </>
                  )}
                </div>
                
                {/* Botón de sincronización en móvil */}
                {pendingOperations > 0 && (
                  <button
                    onClick={() => {
                      handleSyncNow();
                    }}
                    disabled={isSyncing || !isOnline}
                    className="block w-full text-left px-4 py-2 text-sm text-amber-700 hover:bg-amber-50 disabled:text-gray-400 disabled:bg-white disabled:cursor-not-allowed"
                  >
                    <div className="flex items-center">
                      <RefreshCw className={`w-5 h-5 mr-3 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>{isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingOperations})`}</span>
                    </div>
                  </button>
                )}
                
                {/* Logout en móvil */}
                <button
                  onClick={() => {
                    handleLogout();
                    setIsMobileMenuOpen(false);
                  }}
                  className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-blue-700 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="flex items-center">
                    <LogOut className="w-5 h-5 mr-3 text-gray-500" />
                    <span>Cerrar sesión</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="flex-grow">
        <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8">
          {children}
          <OfflineStatus />
        </div>
      </main>

      <footer className="bg-white py-6 shadow-inner border-t border-gray-200 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-gray-500 text-sm">
            Tulum Aromaterapia &copy; {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
}