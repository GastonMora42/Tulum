'use client';

import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/authStore';
import Link from 'next/link';
import { OfflineStatus } from '@/components/ui/OfflineStatus';
import { authenticatedFetch } from '@/hooks/useAuth';
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
  Clock,
  Tag,
  FileText,
  MapPin,
  TrendingUp,
  CheckSquare
} from 'lucide-react';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isAuthenticated, hasRole, setUser, clearAuth } = useAuthStore();
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Verificar autenticación
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        setAuthError(null);
        
        // Verificar si hay tokens en localStorage
        const accessToken = localStorage.getItem('accessToken');
        const userEmail = localStorage.getItem('userEmail');
        
        if (!accessToken) {
          console.log('No hay token, redirigiendo a login');
          clearAuth();
          router.push('/login');
          return;
        }

        // Si ya tenemos usuario en el store y parece válido, no hacer la llamada
        if (user && user.email && user.roleId) {
          console.log('Usuario ya cargado en store:', user.email);
          
          // Verificar que sea admin
          if (user.roleId !== 'role-admin') {
            console.log('Usuario no es admin, redirigiendo...');
            router.push('/unauthorized');
            return;
          }
          
          setIsLoading(false);
          return;
        }

        try {
          // Intentar obtener información del usuario del servidor
          const response = await authenticatedFetch('/api/auth/me');
          
          if (!response.ok) {
            // Si falla, intentar crear usuario desde token local
            if (accessToken && userEmail) {
              console.log('Creando usuario desde token local...');
              
              try {
                let tokenPayload;
                if (accessToken.includes('.') && accessToken.split('.').length === 3) {
                  tokenPayload = JSON.parse(atob(accessToken.split('.')[1]));
                } else {
                  tokenPayload = JSON.parse(atob(accessToken));
                }
                
                if (tokenPayload && tokenPayload.id) {
                  const localUser = {
                    id: tokenPayload.id,
                    email: tokenPayload.email || userEmail,
                    name: tokenPayload.name || 'Usuario',
                    roleId: tokenPayload.roleId || 'role-admin',
                    sucursalId: tokenPayload.sucursalId || null,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    roleName: tokenPayload.role?.name || 'admin'
                  };
                  
                  setUser(localUser);
                  
                  // Verificar que sea admin
                  if (localUser.roleId !== 'role-admin') {
                    router.push('/unauthorized');
                    return;
                  }
                  
                  setIsLoading(false);
                  return;
                }
              } catch (decodeError) {
                console.error('Error al decodificar token local:', decodeError);
              }
            }
            
            throw new Error('No se pudo obtener información del usuario');
          }
          
          const data = await response.json();
          
          if (data.user) {
            setUser(data.user);
            console.log('Usuario cargado desde servidor:', data.user.email);
            
            // Verificar que sea admin
            if (data.user.roleId !== 'role-admin') {
              console.log('Usuario no es admin, redirigiendo...');
              router.push('/unauthorized');
              return;
            }
          } else {
            throw new Error('Respuesta del servidor sin usuario');
          }
          
        } catch (apiError) {
          console.error('Error en llamada a /api/auth/me:', apiError);
          setAuthError('Error al verificar autenticación');
          
          setTimeout(() => {
            clearAuth();
            router.push('/login?error=auth_check_failed');
          }, 2000);
        }
        
      } catch (error) {
        console.error('Error general en checkAuth:', error);
        setAuthError('Error de autenticación');
        
        setTimeout(() => {
          clearAuth();
          router.push('/login?error=general_auth_error');
        }, 2000);
      } finally {
        setIsLoading(false);
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
  }, [router, user, setUser, clearAuth]);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });
    } catch (error) {
      console.error('Error en logout:', error);
    }
    
    clearAuth();
    router.push('/login');
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
    { href: '/admin/ubicaciones', label: 'Ubicaciones', icon: <MapPin className="w-5 h-5" /> },
    { href: '/admin/contingencias', label: 'Contingencias', icon: <AlertTriangle className="w-5 h-5" /> },
    { href: '/admin/conciliaciones', label: 'Conciliaciones', icon: <CheckSquare className="w-5 h-5" /> },
    { href: '/admin/punto-equilibrio', label: 'Punto de Equilibrio', icon: <TrendingUp className="w-5 h-5" /> },
    { href: '/admin/facturas', label: 'Facturas', icon: <FileText className="h-5 w-5" /> },
    { href: '/admin/descuentos', label: 'Códigos de Descuento', icon: <Tag className="w-5 h-5" /> },
    { href: '/admin/reportes', label: 'Reportes', icon: <BarChart2 className="w-5 h-5" /> },
    { href: '/admin/configuracion/afip', label: 'ARCA', icon: <Settings className="w-5 h-5" /> },
    { href: '/fabrica', label: 'Fábrica', icon: <Beaker className="w-5 h-5" /> },
    { href: '/pdv', label: 'PDV', icon: <ShoppingCart className="w-5 h-5" /> }
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
      <div className="min-h-screen flex items-center justify-center bg-[#fcf3ea]">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#eeb077] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#311716] font-medium">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf3ea]">
        <div className="text-center">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{authError}</p>
            <p className="text-sm mt-2">Redirigiendo al login...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fcf3ea]">
        <div className="text-center">
          <p className="text-[#311716]">Redirigiendo...</p>
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
        
        {/* Logout Button */}
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
      
      {/* Mobile Overlay */}
      {sidebarOpen && isMobile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}