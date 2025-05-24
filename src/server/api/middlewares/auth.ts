// src/server/api/middlewares/auth.ts
import { NextRequest, NextResponse } from 'next/server';
import { authService } from '@/server/services/auth/authService';
import prisma, { reconnectPrisma } from '@/server/db/client';

export async function authMiddleware(req: NextRequest) {
  try {
    // Excluir rutas públicas - AÑADIR /api/auth/me
    if (req.nextUrl.pathname.startsWith('/api/auth/login') || 
        req.nextUrl.pathname.startsWith('/api/auth/refresh') ||
        req.nextUrl.pathname.startsWith('/api/auth/me')) {
      return null;
    }
    
    // Obtener token de la cabecera
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Token no proporcionado' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    
    try {
      let userId: string;
      let userEmail: string;
      let userRole: any = null;
      
      // 🔧 NUEVO: Manejar diferentes tipos de tokens
      if (token.includes('.') && token.split('.').length === 3) {
        // Es un JWT (puede ser de Cognito o local)
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('Token JWT detectado, payload keys:', Object.keys(payload));
          
          // Extraer información del payload
          userId = payload.sub || payload.id || payload.username;
          userEmail = payload.email;
          userRole = payload.role;
          
          if (!userId) {
            console.error('No se pudo extraer userId del token JWT');
            return NextResponse.json(
              { error: 'Token JWT inválido - sin ID de usuario' },
              { status: 401 }
            );
          }
          
        } catch (decodeError) {
          console.error('Error al decodificar JWT:', decodeError);
          return NextResponse.json(
            { error: 'Token JWT malformado' },
            { status: 401 }
          );
        }
      } else {
        // Puede ser un token simple (Base64) creado por el frontend
        try {
          const payload = JSON.parse(atob(token));
          console.log('Token simple detectado, payload keys:', Object.keys(payload));
          
          userId = payload.sub || payload.id;
          userEmail = payload.email;
          userRole = payload.role;
          
          if (!userId) {
            console.error('No se pudo extraer userId del token simple');
            return NextResponse.json(
              { error: 'Token simple inválido - sin ID de usuario' },
              { status: 401 }
            );
          }
          
        } catch (decodeError) {
          console.error('Error al decodificar token simple:', decodeError);
          return NextResponse.json(
            { error: 'Token inválido' },
            { status: 401 }
          );
        }
      }
      
      // 🔧 OBTENER USUARIO DE LA BASE DE DATOS
      let user;
      try {
        // Buscar por ID primero
        user = await authService.getUserById(userId);
        
        // Si no se encuentra por ID, buscar por email como fallback
        if (!user && userEmail) {
          console.log(`Usuario no encontrado por ID ${userId}, buscando por email ${userEmail}`);
          user = await prisma.user.findUnique({
            where: { email: userEmail },
            include: { role: true, sucursal: true }
          });
        }
        
      } catch (dbError) {
        console.error('Error en base de datos:', dbError);
        
        // Intentar reconectar y volver a intentar una vez
        if (await reconnectPrisma()) {
          user = await authService.getUserById(userId);
        } else {
          throw new Error('Error de conexión a base de datos persistente');
        }
      }
      
      if (!user) {
        console.error(`Usuario no encontrado: ID=${userId}, Email=${userEmail}`);
        return NextResponse.json(
          { error: 'Usuario no encontrado' },
          { status: 401 }
        );
      }
      
      console.log(`Usuario autenticado: ${user.email} (${user.roleId})`);
      
      // Adjuntar usuario a la request para uso posterior
      (req as any).user = user;
      
      return null;
      
    } catch (error) {
      console.error('Error al verificar token:', error);
      return NextResponse.json(
        { error: 'Token inválido o error en base de datos' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Error general en middleware de autenticación:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}