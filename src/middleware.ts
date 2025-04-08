// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';

// Mapeo de rutas a roles permitidos
const routePermissions: Record<string, string[]> = {
  '/admin': ['admin'],
  '/admin/usuarios': ['admin'],
  '/admin/productos': ['admin'],
  '/admin/stock': ['admin'],
  '/fabrica': ['admin', 'fabrica'],
  '/pdv': ['admin', 'vendedor']
};

// APIs públicas que no requieren autenticación
const publicApis = [
  '/api/auth/login',
  '/api/auth/refresh',
  '/api/auth/register',
  '/api/auth/confirm',
  '/api/auth/resend-code'
];

// Rutas públicas de páginas
const publicPages = [
  '/login',
  '/register'
];

// APIs de desarrollo para facilitar la creación inicial de usuarios
// IMPORTANTE: Eliminar o proteger estas rutas en producción
const devApis = process.env.NODE_ENV === 'development' ? [
  '/api/admin/users',
  '/api/admin/roles',
  '/api/admin/ubicaciones'
] : [];

// src/middleware.ts
export async function middleware(request: NextRequest) {
  // Verificar si la ruta requiere autenticación
  const path = request.nextUrl.pathname;
  
  console.log('Middleware procesando ruta:', path);
  
  // Si es ruta pública, permitir acceso
  if (
    publicPages.includes(path) || 
    publicApis.some(api => path.startsWith(api)) ||
    devApis.some(api => path.startsWith(api))
  ) {
    console.log('Ruta pública, permitiendo acceso');
    return NextResponse.next();
  }
  
  // Verificar token de acceso (simplificado para debugging)
  const token = request.cookies.get('accessToken')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '');
  
  if (!token) {
    // Redireccionar a login si no hay token
    console.log('No hay token, redirigiendo a login');
    const url = new URL('/login', request.url);
    url.searchParams.set('redirect', path);
    return NextResponse.redirect(url);
  }
  
  // Permitir acceso para rutas de admin sin verificar rol durante desarrollo
  if (path.startsWith('/admin')) {
    console.log('Acceso a ruta de admin permitido');
    return NextResponse.next();
  }
  
  // Para otras rutas, continuar con el flujo normal
  return NextResponse.next();
}

// Configuración para que el middleware se ejecute en estas rutas
export const config = {
  matcher: [
    '/admin/:path*',
    '/fabrica/:path*',
    '/pdv/:path*',
    '/api/:path*',
    '/login',
    '/register'
  ],
};