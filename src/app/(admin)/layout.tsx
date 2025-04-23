// src/app/(admin)/layout.tsx
'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react'; // Removed FileText as Reportes is removed

export default function AdminLayout({
 children,
}: {
 children: React.ReactNode;
}) {
 const { user, isAuthenticated, hasRole } = useAuthStore();
 const [isLoading, setIsLoading] = useState(true);
 const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
 { href: '/admin/productos', label: 'Productos', icon: <Package className="w-5 h-5" /> },
 { href: '/admin/insumos', label: 'Insumos', icon: <Beaker className="w-5 h-5" /> },
 { href: '/admin/recetas', label: 'Recetas', icon: <Book className="w-5 h-5" /> },
 { href: '/admin/usuarios', label: 'Usuarios', icon: <Users className="w-5 h-5" /> },
 { href: '/admin/stock', label: 'Stock', icon: <Archive className="w-5 h-5" /> },
 { href: '/admin/contingencias', label: 'Contingencias', icon: <AlertTriangle className="w-5 h-5" /> },
 { href: '/admin/categorias', label: 'Categorias', icon: <Archive className="w-5 h-5" /> },
 { href: '/admin/envios', label: 'Envios', icon: <Package className="w-5 h-5" /> },
 { href: '/admin/envios-insumos', label: 'Pedidos', icon: <Package className="w-5 h-5" /> }, // Renamed to Pedidos
 ];

 if (isLoading) {
 return (
 <div className="min-h-screen flex items-center justify-center bg-gray-50">
 <div className="flex flex-col items-center gap-2">
 <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
 <p className="text-lg text-gray-700">Cargando...</p>
 </div>
 </div>
 );
 }

 return (
 <div className="min-h-screen flex flex-col bg-white"> {/* Changed background to white */}
 <header className="bg-white shadow border-b border-gray-200 px-4 sm:px-6 lg:px-8"> {/* Added horizontal padding */}
 <div className="max-w-7xl mx-auto">
 <div className="flex justify-between h-16 items-center"> {/* Vertically centered items */}
 <div className="flex items-center">
 {/* Logo placeholder - replace with your actual Tulum Admin logo */}
 <div className="flex-shrink-0">
 <img className="h-10 w-auto" src="/logo-tulum.webp" alt="Tulum Admin Logo" /> {/* Increased logo size slightly */}
 </div>
 {/* Removed text title next to logo for a cleaner look */}
 </div>
 <div className="hidden md:ml-6 md:flex md:space-x-6"> {/* Increased space between desktop nav items */}
 {navItems.map((item) => (
 <Link
 key={item.href}
 href={item.href}
 className={`
 relative inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200
 ${
 pathname === item.href || pathname.startsWith(item.href + '/')
 ? 'border-[#311716] text-[#311716]' // Active state using the dark color
 : 'border-transparent text-gray-600 hover:text-[#311716] hover:border-[#eeb077]' // Inactive state with hover effect using the accent color
 }
 `}
 >
 {item.label}
 </Link>
 ))}
 </div>
 <div className="hidden md:flex items-center">
 <div className="flex-shrink-0 relative group">
 <button className="bg-white p-2 rounded-md text-gray-600 hover:text-[#311716] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eeb077] flex items-center transition-colors duration-200"> {/* Adjusted padding and hover color */}
 <span className="mr-2 font-medium text-gray-700">{user?.name}</span> {/* Adjusted text color */}
 <ChevronDown className="w-4 h-4 text-gray-500 group-hover:text-[#311716] transition-colors duration-220" /> {/* Adjusted icon color */}
 </button>
 <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 hidden group-hover:block">
 <button
 onClick={handleLogout}
 className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 hover:text-[#311716] transition-colors duration-200" // Adjusted hover text color
 >
 Cerrar sesión
 </button>
 </div>
 </div>
 </div>
 <div className="-mr-2 flex items-center md:hidden">
 <button
 onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
 className="bg-white inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-[#311716] hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#eeb077] transition-colors duration-200" // Adjusted colors
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
 ? 'bg-[#eeb077]/20 border-[#311716] text-[#311716]' // Active state with lighter accent background
 : 'border-transparent text-gray-600 hover:bg-gray-100 hover:text-[#311716]' // Inactive state
 } block pl-5 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200`} // Increased left padding
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
 <button
 onClick={() => {
 handleLogout();
 setIsMobileMenuOpen(false);
 }}
 className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-[#311716] hover:bg-gray-100 transition-colors duration-200" // Adjusted hover text color
 >
 <div className="flex items-center">
 <LogOut className="w-5 h-5 mr-3 text-gray-500" /> {/* Added margin and color to icon */}
 <span>Cerrar sesión</span>
 </div>
 </button>
 </div>
 </div>
 </div>
 )}
 </header>

 <main className="flex-grow">
 <div className="max-w-7xl mx-auto py-8 sm:px-6 lg:px-8"> {/* Increased vertical padding */}
 {children}
 <OfflineStatus />
 </div>
 </main>

 <footer className="bg-white py-6 shadow-inner border-t border-gray-200 px-4 sm:px-6 lg:px-8"> {/* Increased vertical padding */}
 <div className="max-w-7xl mx-auto">
 <p className="text-center text-gray-500 text-sm">
 Tulum Admin &copy; {new Date().getFullYear()}
 </p>
 </div>
 </footer>
 </div>
 );
}