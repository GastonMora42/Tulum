'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { OfflineStatus } from '@/components/ui/OfflineStatus';
import {
  HomeIcon,
  Package,
  Users,
  Archive,
  AlertTriangle,
  Beaker,
  Book,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Settings,
  BarChart2,
  ShoppingCart,
  Box,
  Clock
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

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
                'Authorization': `Bearer ${token}`,
              },
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
    
    // Verificar si es móvil
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
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

  const navItems = [
    { href: '/admin', label: 'Dashboard', icon: <HomeIcon className="w-5 h-5" /> },
    { 
      label: 'Productos', 
      icon: <Package className="w-5 h-5" />,
      submenu: [
        { href: '/admin/productos', label: 'Catálogo' },
        { href: '/admin/categorias', label: 'Categorías' }
      ]
    },
    { 
      label: 'Inventario', 
      icon: <Archive className="w-5 h-5" />,
      submenu: [
        { href: '/admin/insumos', label: 'Insumos' },
        { href: '/admin/stock', label: 'Stock' },
        { href: '/admin/recetas', label: 'Recetas' }
      ]
    },
    { 
      label: 'Distribución', 
      icon: <Box className="w-5 h-5" />,
      submenu: [
        { href: '/admin/envios', label: 'Envíos' },
        { href: '/admin/envios-insumos', label: 'Pedidos' }
      ]
    },
    { href: '/admin/usuarios', label: 'Usuarios', icon: <Users className="w-5 h-5" /> },
    { href: '/admin/contingencias', label: 'Contingencias', icon: <AlertTriangle className="w-5 h-5" /> },
    { href: '/admin/reportes', label: 'Reportes', icon: <BarChart2 className="w-5 h-5" /> },
  ];
  
  // Control de submenús
  const [openSubmenus, setOpenSubmenus] = useState<string[]>([]);
  
  const toggleSubmenu = (label: string) => {
    if (openSubmenus.includes(label)) {
      setOpenSubmenus(openSubmenus.filter(item => item !== label));
    } else {
      setOpenSubmenus([...openSubmenus, label]);
    }
  };
  
  const isSubmenuOpen = (label: string) => openSubmenus.includes(label);
  
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 border-4 border-[#eeb077] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-lg text-[#311716]">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-[#f8f5f3]">
      {/* Sidebar - Desktop */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#311716] text-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col`}
      >
        {/* Logo & Close Button */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-[#4a292a]">
          <div className="flex items-center">
            <img 
              src="/logo-tulum.webp" 
              alt="Tulum Logo" 
              className="h-8 w-auto mr-2" 
            />
            <h1 className="text-lg font-semibold text-[#eeb077]">Tulum Admin</h1>
          </div>
          <button 
            className="lg:hidden text-white hover:text-[#eeb077]"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* User Info */}
        <div className="p-4 border-b border-[#4a292a]">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full bg-[#eeb077] flex items-center justify-center text-[#311716] font-semibold">
              {user?.name.substring(0, 1).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-white">{user?.name}</p>
              <p className="text-xs text-[#eeb077]">Administrador</p>
            </div>
          </div>
        </div>
        
        {/* Navigation - Scrollable area */}
        <div className="flex-1 overflow-y-auto">
          <ul className="space-y-1 px-2 py-4">
            {navItems.map((item) => (
              <li key={item.label}>
                {item.submenu ? (
                  <div className="space-y-1">
                    <button
                      className={`w-full flex items-center justify-between p-2.5 rounded-md transition-colors duration-200 ${
                        item.submenu.some(subitem => 
                          pathname === subitem.href || pathname.startsWith(subitem.href + '/')
                        )
                          ? 'bg-[#4a292a] text-[#eeb077]'
                          : 'text-white hover:bg-[#4a292a] hover:text-[#eeb077]'
                      }`}
                      onClick={() => toggleSubmenu(item.label)}
                    >
                      <div className="flex items-center">
                        <span className="mr-3">{item.icon}</span>
                        <span>{item.label}</span>
                      </div>
                      <ChevronDown 
                        className={`w-4 h-4 transition-transform duration-300 ${
                          isSubmenuOpen(item.label) ? 'rotate-180' : ''
                        }`} 
                      />
                    </button>
                    
                    {isSubmenuOpen(item.label) && (
                      <ul className="pl-4 pb-1 space-y-1">
                        {item.submenu.map(subItem => (
                          <li key={subItem.href}>
                            <Link
                              href={subItem.href}
                              className={`flex pl-9 py-2 text-sm rounded-md ${
                                pathname === subItem.href || pathname.startsWith(subItem.href + '/')
                                  ? 'bg-[#eeb077] text-[#311716] font-medium'
                                  : 'text-gray-300 hover:bg-[#4a292a] hover:text-white'
                              }`}
                            >
                              {subItem.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <Link
                    href={item.href}
                    className={`flex items-center p-2.5 rounded-md transition-colors duration-200 ${
                      pathname === item.href || pathname.startsWith(item.href + '/')
                        ? 'bg-[#4a292a] text-[#eeb077]'
                        : 'text-white hover:bg-[#4a292a] hover:text-[#eeb077]'
                    }`}
                  >
                    <span className="mr-3">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
        
        {/* Logout Button - Ahora sticky para que siempre esté visible */}
        <div className="sticky bottom-0 border-t border-[#4a292a] p-4 bg-[#311716]">
          <button
            onClick={handleLogout}
            className="flex items-center w-full p-2.5 rounded-md text-white hover:bg-[#4a292a] hover:text-[#eeb077] transition-colors duration-200"
          >
            <LogOut className="w-5 h-5 mr-3" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4 z-10">
          <button
            className="lg:hidden text-[#311716] hover:text-[#eeb077] mr-4"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </button>
          
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* User dropdown menu en header */}
            <div className="relative">
              <button 
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-2 focus:outline-none p-2 rounded-full hover:bg-[#f8f5f3]"
              >
                <div className="hidden md:block text-right">
                  <div className="text-sm font-medium text-[#311716]">{user?.name}</div>
                  <div className="text-xs text-[#9c7561]">Administrador</div>
                </div>
                <div className="h-8 w-8 rounded-full bg-[#eeb077] flex items-center justify-center text-[#311716] font-semibold">
                  {user?.name.substring(0, 1).toUpperCase()}
                </div>
              </button>
              
              {/* Dropdown menu */}
              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 py-2 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-10">
                  <div className="px-4 py-2 text-xs text-gray-500 border-b">
                    Conectado como {user?.email}
                  </div>
                  <button 
                    onClick={handleLogout}
                    className="block w-full text-left px-4 py-2 text-sm text-[#311716] hover:bg-[#f8f5f3] hover:text-[#eeb077]"
                  >
                    <LogOut className="w-4 h-4 mr-2 inline" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
        
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f8f5f3]">
          {children}
          <OfflineStatus />
        </main>
      </div>
      
      {/* Mobile Overlay - Corregido para no ser completamente negro */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}