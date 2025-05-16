// src/app/(pdv)/layout.tsx - versión mejorada
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/hooks/useOffline';
import { 
  ShoppingCart, Tag, Home, Clock, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Package, AlertTriangle, Archive, Truck, FileText, Database, BarChart2, User,
  WifiOff,
  Wifi,
  RefreshCw,
  ArrowDownLeft,
  Factory
} from 'lucide-react';
import { authenticatedFetch } from '@/hooks/useAuth';

export default function PDVLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const router = useRouter();
  const pathname = usePathname();
  const { isOnline, pendingOperations, syncNow, isSyncing } = useOffline();
  const { setUser } = useAuthStore();
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sucursalNombre, setSucursalNombre] = useState('');
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedName = localStorage.getItem('sucursalNombre');
      if (storedName) {
        setSucursalNombre(storedName);
      }
    }
  }, []);
  
  // Detectar tamaño de pantalla
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile);
    };
    
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cerrar sidebar al hacer clic fuera en móvil
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isMobile && 
          showMobileMenu && 
          sidebarRef.current && 
          !sidebarRef.current.contains(e.target as Node)) {
        setShowMobileMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, showMobileMenu]);

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          router.push('/login');
          return;
        }
        
        if (!user) {
          try {
            const response = await authenticatedFetch('/api/auth/me', {
              headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) throw new Error('Error al obtener información del usuario');
            
            const data = await response.json();
            if (data.user) setUser(data.user);
          } catch (error) {
            router.push('/login');
            return;
          }
        }
        
        if (user && !hasRole('vendedor') && !hasRole('admin')) {
          router.push('/');
          return;
        }
        
        setIsLoading(false);
      } catch (error) {
        router.push('/login');
      }
    };

    checkAuth();
  }, [router, user, hasRole, setUser]);

  // Sincronizar datos pendientes
  const handleSyncNow = async () => {
    try {
      await syncNow();
    } catch (error) {
      console.error('Error al sincronizar:', error);
    }
  };

  // Mostrar pantalla de carga
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#311716]"></div>
        <p className="ml-4 text-lg text-gray-700">Cargando...</p>
      </div>
    );
  }

  // Definición de los enlaces de navegación
  const navLinks = [
    { href: '/pdv', icon: <ShoppingCart className="h-5 w-5" />, text: 'Venta', exact: true },
    { href: '/pdv/cierre', icon: <Clock className="h-5 w-5" />, text: 'Cierre' },
    { href: '/pdv/ventas', icon: <Tag className="h-5 w-5" />, text: 'Historial' },
    { href: '/pdv/dashboard', icon: <BarChart2 className="h-5 w-5" />, text: 'Dashboard' },
    { href: '/pdv/recepcion', icon: <Truck className="h-5 w-5" />, text: 'Recepción' },
    { href: '/pdv/conciliacion', icon: <Database className="h-5 w-5" />, text: 'Inventario' },
    { href: '/pdv/egresos', icon: <ArrowDownLeft className="h-5 w-5" />, text: 'Salidas' },
    { href: '/pdv/contingencias', icon: <AlertTriangle className="h-5 w-5" />, text: 'Contingencias' }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* Header para móvil y desktop */}
      <header className="bg-[#311716] text-white shadow-md sticky top-0 z-30">
        <div className="mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            {/* Logo/Título y botón de menú móvil */}
            <div className="flex items-center">
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-md text-white hover:bg-[#462625] mr-2"
                  aria-label={showMobileMenu ? "Cerrar menú" : "Abrir menú"}
                >
                  {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>
              )}
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold truncate max-w-[200px] md:max-w-full">
                  {sucursalNombre ? `PDV - ${sucursalNombre}` : 'Punto de Venta'}
                </span>
              </div>
            </div>
            
            {/* Estado de conexión y usuario (visible en todos los tamaños) */}
            <div className="flex items-center space-x-4">
              {!isOnline ? (
                <span className="text-yellow-300 text-sm flex items-center px-2 py-1 bg-[#462625] rounded-full">
                  <WifiOff className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Offline</span>
                </span>
              ) : (
                <span className="text-green-300 text-sm flex items-center px-2 py-1 bg-[#462625] rounded-full">
                  <Wifi className="w-4 h-4 mr-1" />
                  <span className="hidden sm:inline">Online</span>
                </span>
              )}
              
              {pendingOperations > 0 && (
                <button 
                  onClick={handleSyncNow}
                  disabled={isSyncing || !isOnline}
                  className="bg-[#eeb077] text-[#311716] text-xs px-3 py-1 rounded-full mr-2 hover:bg-[#d9a15d] disabled:opacity-50 flex items-center"
                >
                  <RefreshCw className={`h-3 w-3 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span className="hidden sm:inline">{isSyncing ? 'Sincronizando...' : `Sincronizar (${pendingOperations})`}</span>
                  <span className="sm:hidden">{pendingOperations}</span>
                </button>
              )}
              
              <div className="relative group">
                <button className="flex items-center space-x-1 text-white hover:bg-[#462625] rounded-full p-1">
                  <User className="h-5 w-5" />
                  <span className="hidden md:block font-medium truncate max-w-[100px]">{user?.name}</span>
                </button>
                
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-40 hidden group-hover:block">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">
                    {user?.name}
                  </div>
                  <button 
                    onClick={() => {
                      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                        useAuthStore.getState().clearAuth();
                        router.push('/login');
                      });
                    }}
                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <span className="flex items-center">
                      <LogOut className="mr-2 h-4 w-4" />
                      Cerrar sesión
                    </span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - colapsable en desktop, drawer en móvil */}
        <div 
          ref={sidebarRef}
          className={`${isMobile ? 
            `fixed inset-y-0 left-0 z-40 w-64 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}` : 
            `relative bg-white shadow transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-64'}`
          } flex flex-col h-full`}
          style={{ top: isMobile ? '64px' : '0px' }}
        >
          {/* Backdrop para móvil */}
          {isMobile && showMobileMenu && (
            <div className="fixed inset-0 bg-black opacity-50 z-30" onClick={() => setShowMobileMenu(false)}></div>
          )}
          
          <div className="bg-white h-full flex flex-col z-40 shadow-md">
            {/* Botón para colapsar/expandir (solo desktop) */}
            {!isMobile && (
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="absolute right-0 top-4 transform translate-x-1/2 bg-white rounded-full p-1 border border-gray-200 text-gray-500 hover:text-gray-700"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
            
            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto pt-5 pb-20">
              <ul className="space-y-2 px-2">
                {navLinks.map((link) => {
                  const isActive = link.exact 
                    ? pathname === link.href 
                    : pathname.startsWith(link.href);
                  
                  return (
                    <li key={link.href}>
                      <Link 
                        href={link.href}
                        className={`flex items-center px-3 py-2 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-[#311716] text-white' 
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        onClick={() => isMobile && setShowMobileMenu(false)}
                      >
                        <span className="flex-shrink-0">{link.icon}</span>
                        <span className={`ml-3 ${sidebarCollapsed && !isMobile ? 'hidden' : 'block'}`}>
                          {link.text}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>

        {/* Contenido principal */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-50 p-4">
          <div className="max-w-7xl mx-auto pb-16">
            {children}
          </div>
        </main>
      </div>


      {/* Botones de navegación rápida para administrador */}
{user?.roleId === 'role-admin' && (
  <div className="fixed bottom-6 right-6 flex gap-2 z-50">
    <Link 
      href="/admin" 
      className="bg-[#311716] text-white p-3 rounded-full hover:bg-[#4a292a] transition-colors shadow-lg"
      title="Admin"
    >
      <Settings className="h-5 w-5" />
    </Link>
    <Link 
      href="/fabrica" 
      className="bg-[#311716] text-white p-3 rounded-full hover:bg-[#4a292a] transition-colors shadow-lg"
      title="Fábrica"
    >
      <Factory className="h-5 w-5" />
    </Link>
    <Link 
      href="/pdv" 
      className="bg-[#311716] text-white p-3 rounded-full hover:bg-[#4a292a] transition-colors shadow-lg"
      title="Punto de Venta"
    >
      <ShoppingCart className="h-5 w-5" />
    </Link>
  </div>
)}

      {/* Footer con estado offline */}
      <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-20 h-10">
        <div className="max-w-7xl mx-auto px-4 h-full flex items-center justify-between">
          <p className="text-gray-600 text-xs">
            Sistema Tulum PDV &copy; {new Date().getFullYear()}
          </p>
          
          <div className="flex items-center space-x-2">
            {!isOnline ? (
              <span className="text-xs text-yellow-600 flex items-center">
                <WifiOff className="w-3 h-3 mr-1" />
                Modo Offline
              </span>
            ) : (
              <span className="text-xs text-green-600 flex items-center">
                <Wifi className="w-3 h-3 mr-1" />
                Conectado
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}