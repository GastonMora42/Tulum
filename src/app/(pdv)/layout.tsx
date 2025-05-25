// src/app/(pdv)/layout.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { useOffline } from '@/hooks/useOffline';
import { 
  ShoppingCart, Tag, Home, Clock, Settings, LogOut, Menu, X, ChevronLeft, ChevronRight,
  Package, AlertTriangle, Archive, Truck, FileText, Database, BarChart2, User,
  WifiOff, Wifi, RefreshCw, ArrowDownLeft, Factory, Bell, Search, Grid3x3
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
  const [notifications, setNotifications] = useState(0);
  
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
      const tablet = window.innerWidth >= 768 && window.innerWidth < 1024;
      setIsMobile(mobile);
      setSidebarCollapsed(mobile || tablet);
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-[#311716] border-t-transparent mx-auto"></div>
          <p className="mt-4 text-lg text-gray-700 font-medium">Cargando sistema...</p>
        </div>
      </div>
    );
  }

  // Definición de los enlaces de navegación
  const navLinks = [
    { 
      href: '/pdv/dashboard', 
      icon: <BarChart2 className="h-5 w-5" />, 
      text: 'Dashboard',
      description: 'Resumen general'
    },
    { 
      href: '/pdv', 
      icon: <ShoppingCart className="h-5 w-5" />, 
      text: 'Venta', 
      exact: true,
      description: 'Nueva venta'
    },
    { 
      href: '/pdv/recepcion', 
      icon: <Truck className="h-5 w-5" />, 
      text: 'Recepción',
      description: 'Recibir envíos'
    },
    { 
      href: '/pdv/conciliacion', 
      icon: <Database className="h-5 w-5" />, 
      text: 'Inventario',
      description: 'Control de stock'
    },
    { 
      href: '/pdv/cierre', 
      icon: <Clock className="h-5 w-5" />, 
      text: 'Cierre',
      description: 'Cierre de caja'
    },
    { 
      href: '/pdv/ventas', 
      icon: <Tag className="h-5 w-5" />, 
      text: 'Historial',
      description: 'Ventas realizadas'
    },
    { 
      href: '/pdv/egresos', 
      icon: <ArrowDownLeft className="h-5 w-5" />, 
      text: 'Salidas',
      description: 'Egresos de caja'
    },
    { 
      href: '/pdv/insumos', 
      icon: <Package className="h-5 w-5" />, 
      text: 'Insumos',
      description: 'Insumos de Punto de venta'
    },
    { 
      href: '/pdv/facturas', 
      icon: <FileText className="h-5 w-5" />, 
      text: 'Facturas',
      description: 'Facturación electrónica'
    },
    { 
      href: '/pdv/contingencias', 
      icon: <AlertTriangle className="h-5 w-5" />, 
      text: 'Contingencias',
      description: 'Reportar incidencias'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header moderno */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="mx-auto px-4">
          <div className="flex justify-between h-16 items-center">
            {/* Logo/Título y botón de menú */}
            <div className="flex items-center space-x-4">
              {isMobile && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="p-2 rounded-xl text-gray-600 hover:text-[#311716] hover:bg-gray-100 transition-colors"
                  aria-label={showMobileMenu ? "Cerrar menú" : "Abrir menú"}
                >
                  {showMobileMenu ? <X size={24} /> : <Menu size={24} />}
                </button>
              )}
              
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#311716] to-[#9c7561] rounded-xl flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 truncate max-w-[200px] md:max-w-full">
                    {sucursalNombre ? sucursalNombre : 'Punto de Venta'}
                  </h1>
                  <p className="text-xs text-gray-500 hidden md:block">
                    {pathname === '/pdv' ? 'Nueva venta' : 
                     pathname === '/pdv/dashboard' ? 'Resumen general' :
                     navLinks.find(link => pathname.startsWith(link.href))?.description || 'Sistema PDV'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Centro - Búsqueda rápida (solo desktop) */}
            <div className="hidden lg:flex flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar productos, ventas..."
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#eeb077] focus:border-transparent transition-all"
                />
              </div>
            </div>
            
            {/* Estado de conexión y usuario */}
            <div className="flex items-center space-x-3">
              {/* Notificaciones */}
              <button className="relative p-2 text-gray-600 hover:text-[#311716] hover:bg-gray-100 rounded-xl transition-colors">
                <Bell className="w-5 h-5" />
                {notifications > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                    {notifications}
                  </span>
                )}
              </button>
              
              {/* Estado de conexión */}
              <div className="flex items-center space-x-2">
                {!isOnline ? (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-yellow-50 text-yellow-700 rounded-xl border border-yellow-200">
                    <WifiOff className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Offline</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-50 text-green-700 rounded-xl border border-green-200">
                    <Wifi className="w-4 h-4" />
                    <span className="text-sm font-medium hidden sm:inline">Online</span>
                  </div>
                )}
                
                {pendingOperations > 0 && (
                  <button 
                    onClick={handleSyncNow}
                    disabled={isSyncing || !isOnline}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-amber-50 text-amber-700 rounded-xl border border-amber-200 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span className="text-sm font-medium hidden sm:inline">
                      {isSyncing ? 'Sync...' : `Sync (${pendingOperations})`}
                    </span>
                  </button>
                )}
              </div>
              
              {/* Menú de usuario */}
              <div className="relative group">
                <button className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="w-8 h-8 bg-gradient-to-br from-[#9c7561] to-[#eeb077] rounded-lg flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <div className="hidden md:block text-left">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-[100px]">{user?.name}</p>
                    <p className="text-xs text-gray-500">Vendedor</p>
                  </div>
                </button>
                
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-40 hidden group-hover:block">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button 
                    onClick={() => {
                      fetch('/api/auth/logout', { method: 'POST' }).then(() => {
                        useAuthStore.getState().clearAuth();
                        router.push('/login');
                      });
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <LogOut className="w-4 h-4 text-gray-400" />
                    <span>Cerrar sesión</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar moderno */}
        <div 
          ref={sidebarRef}
          className={`${isMobile ? 
            `fixed inset-y-0 left-0 z-40 w-72 transform transition-transform duration-300 ease-in-out ${showMobileMenu ? 'translate-x-0' : '-translate-x-full'}` : 
            `relative bg-white shadow-sm border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-72'}`
          } flex flex-col h-full`}
          style={{ top: isMobile ? '64px' : '0px' }}
        >
          {/* Backdrop para móvil */}
          {isMobile && showMobileMenu && (
            <div className="fixed inset-0 bg-black opacity-50 z-30" onClick={() => setShowMobileMenu(false)}></div>
          )}
          
          <div className="bg-white h-full flex flex-col z-40">
            {/* Botón para colapsar/expandir (solo desktop) */}
            {!isMobile && (
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="absolute -right-3 top-6 transform bg-white rounded-full p-1.5 border border-gray-200 text-gray-500 hover:text-gray-700 shadow-sm hover:shadow transition-all z-10"
              >
                {sidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
              </button>
            )}
            
            {/* Navegación */}
            <nav className="flex-1 overflow-y-auto pt-6 pb-20 px-3">
              <ul className="space-y-2">
                {navLinks.map((link) => {
                  const isActive = link.exact 
                    ? pathname === link.href 
                    : pathname.startsWith(link.href);
                  
                  return (
                    <li key={link.href}>
                      <Link 
                        href={link.href}
                        className={`group flex items-center px-3 py-3 rounded-xl transition-all duration-200 ${
                          isActive 
                            ? 'bg-gradient-to-r from-[#311716] to-[#462625] text-white shadow-sm' 
                            : 'text-gray-700 hover:bg-gray-50 hover:text-[#311716]'
                        }`}
                        onClick={() => isMobile && setShowMobileMenu(false)}
                      >
                        <div className={`flex-shrink-0 p-2 rounded-lg ${
                          isActive 
                            ? 'bg-white/20' 
                            : 'bg-gray-100 group-hover:bg-gray-200'
                        }`}>
                          {link.icon}
                        </div>
                        
                        <div className={`ml-3 ${sidebarCollapsed && !isMobile ? 'hidden' : 'block'}`}>
                          <p className="text-sm font-medium">{link.text}</p>
                          <p className={`text-xs ${isActive ? 'text-white/70' : 'text-gray-500'}`}>
                            {link.description}
                          </p>
                        </div>
                        
                        {isActive && (
                          <div className="ml-auto w-2 h-2 bg-white rounded-full"></div>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>
        </div>

        {/* Contenido principal */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="h-full p-4 md:p-6">
            <div className="max-w-7xl mx-auto h-full">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Botones de navegación rápida para administrador */}
      {user?.roleId === 'role-admin' && (
        <div className="fixed bottom-6 right-6 flex gap-3 z-50">
          <Link 
            href="/admin" 
            className="group bg-white text-[#311716] p-3 rounded-xl hover:bg-[#311716] hover:text-white transition-all shadow-lg border border-gray-200"
            title="Admin"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <Link 
            href="/fabrica" 
            className="group bg-white text-[#311716] p-3 rounded-xl hover:bg-[#311716] hover:text-white transition-all shadow-lg border border-gray-200"
            title="Fábrica"
          >
            <Factory className="h-5 w-5" />
          </Link>
        </div>
      )}

      {/* Footer con estado offline */}
      <footer className="bg-white border-t border-gray-200 px-4 py-2 z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <p className="text-gray-500 text-xs">
            Sistema Tulum PDV &copy; {new Date().getFullYear()}
          </p>
          
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center space-x-1">
              {isOnline ? (
                <>
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-green-600">Conectado</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span className="text-yellow-600">Modo Offline</span>
                </>
              )}
            </div>
            
            {pendingOperations > 0 && (
              <span className="text-amber-600">
                {pendingOperations} operaciones pendientes
              </span>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}