// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Mapeo de rutas a roles permitidos
const routePermissions: Record<string, string[]> = {
  '/admin': ['admin'],
  '/admin/usuarios': ['admin'],
  '/fabrica': ['admin', 'fabrica'],
  '/pdv': ['admin', 'vendedor']
};

export async function middleware(request: NextRequest) {
  // Verificar si la ruta requiere autenticación
  const path = request.nextUrl.pathname;
  
  // Si es ruta pública, permitir acceso
  if (
    path === '/login' || 
    path === '/api/auth/login' || 
    path === '/api/auth/refresh'
  ) {
    return NextResponse.next();
  }
  
  // Verificar token de acceso
  const token = request.cookies.get('accessToken')?.value;
  
  if (!token) {
    // Redireccionar a login si no hay token
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  // Verificar permisos para rutas específicas
  for (const [route, allowedRoles] of Object.entries(routePermissions)) {
    if (path.startsWith(route)) {
      try {
        // Decodificar token para obtener rol
        // En producción, deberíamos verificar la firma del token
        const payload = JSON.parse(atob(token.split('.')[1]));
        const userRole = payload.role;
        
        if (!allowedRoles.includes(userRole)) {
          // Usuario no autorizado, redireccionar a dashboard general
          return NextResponse.redirect(new URL('/', request.url));
        }
      } catch (error) {
        console.error('Error al verificar token:', error);
        // Token inválido, redireccionar a login
        const url = new URL('/login', request.url);
        return NextResponse.redirect(url);
      }
    }
  }
  
  // Permitir acceso
  return NextResponse.next();
}

// Configuración para que el middleware se ejecute en estas rutas
export const config = {
  matcher: [
    '/admin/:path*',
    '/fabrica/:path*',
    '/pdv/:path*',
    '/api/:path*',
    '/login'
  ],
};